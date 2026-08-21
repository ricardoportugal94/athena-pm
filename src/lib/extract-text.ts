// Server-only. Best-effort plain-text extraction from a chat attachment, so
// MIA can actually read what was shared instead of just seeing a filename.
// Never throws — an unreadable/unsupported file just yields ''.

import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import mammoth from 'mammoth';
// pdfjs-dist directly, not the `pdf-parse` wrapper: pdf-parse makes
// @napi-rs/canvas (a native binary, only needed for rendering pages as
// images) a hard dependency, which broke npm ci in the Linux Docker build.
// pdfjs-dist itself only lists canvas as optional — fine, since we only need
// getTextContent(), never rendering.
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import * as XLSX from 'xlsx';

const MAX_CHARS = 8000; // keeps the prompt small regardless of document size

// The Dockerfile sets WORKDIR /app and `expo serve` runs from there, so
// these on-disk package assets are reachable via cwd at runtime. Without
// them, pdfjs still returns text for simple/embedded-font PDFs, but silently
// mis-extracts (or throws) for PDFs using standard/non-embedded or CJK
// fonts — a common case for real-world exported documents.
const PDFJS_ROOT = join(process.cwd(), 'node_modules/pdfjs-dist');

// pdfjs normally locates its worker module via a relative import from its
// own file — Metro bundles everything into one file, which breaks that
// resolution ("Cannot find module '.../pdf.worker.mjs'"). Pointing it at the
// real on-disk file (same trick as the fonts/cmaps above) fixes it — as a
// file:// URL, since Node's dynamic import() rejects bare filesystem paths
// (fails on both Windows drive-letter paths and plain POSIX paths).
pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(join(PDFJS_ROOT, 'legacy/build/pdf.worker.mjs')).href;

function truncate(text: string): string {
  const trimmed = text.trim();
  return trimmed.length > MAX_CHARS ? `${trimmed.slice(0, MAX_CHARS)}\n[...truncated...]` : trimmed;
}

async function extractPdf(buffer: Buffer): Promise<string> {
  const doc = await pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    isEvalSupported: false,
    verbosity: 0,
    standardFontDataUrl: `${join(PDFJS_ROOT, 'standard_fonts')}/`,
    cMapUrl: `${join(PDFJS_ROOT, 'cmaps')}/`,
    cMapPacked: true,
  }).promise;
  try {
    const pages: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      pages.push(content.items.map((item: any) => item.str ?? '').join(' '));
    }
    return pages.join('\n');
  } finally {
    await doc.destroy();
  }
}

async function extractWord(buffer: Buffer): Promise<string> {
  const { value } = await mammoth.extractRawText({ buffer });
  return value;
}

function extractSpreadsheet(buffer: Buffer): string {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  return workbook.SheetNames.map((name) => {
    const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[name]);
    return `--- Sheet: ${name} ---\n${csv}`;
  }).join('\n\n');
}

type Kind = 'pdf' | 'word' | 'excel' | null;

// The declared MIME type isn't always trustworthy (some pickers/browsers
// send a generic or empty type) — the file extension is a reliable fallback.
function detectKind(mimeType: string, filename: string): Kind {
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType === 'application/msword' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'word';
  if (mimeType === 'application/vnd.ms-excel' || mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return 'excel';

  const ext = filename.toLowerCase().split('.').pop();
  if (ext === 'pdf') return 'pdf';
  if (ext === 'doc' || ext === 'docx') return 'word';
  if (ext === 'xls' || ext === 'xlsx') return 'excel';
  return null;
}

export type ExtractResult = { text: string; error: string | null };

// `error` is populated only so a caller can surface it for diagnosis (e.g.
// behind a debug flag) — normal callers should just check `text`.
export async function extractText(file: Blob, mimeType: string, filename: string): Promise<ExtractResult> {
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const kind = detectKind(mimeType, filename);
    if (kind === 'pdf') return { text: truncate(await extractPdf(buffer)), error: null };
    if (kind === 'word') return { text: truncate(await extractWord(buffer)), error: null };
    if (kind === 'excel') return { text: truncate(extractSpreadsheet(buffer)), error: null };
    return { text: '', error: `Unrecognized file type (mimeType="${mimeType}", filename="${filename}")` };
  } catch (err: any) {
    console.error('Attachment text extraction failed:', err);
    return { text: '', error: err?.stack ?? err?.message ?? String(err) };
  }
}
