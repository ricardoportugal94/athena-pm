// Server-only. Best-effort plain-text extraction from a chat attachment, so
// MIA can actually read what was shared instead of just seeing a filename.
// Never throws — an unreadable/unsupported file just yields ''.

import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import * as XLSX from 'xlsx';

const MAX_CHARS = 8000; // keeps the prompt small regardless of document size

function truncate(text: string): string {
  const trimmed = text.trim();
  return trimmed.length > MAX_CHARS ? `${trimmed.slice(0, MAX_CHARS)}\n[...truncated...]` : trimmed;
}

async function extractPdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text.replace(/-- \d+ of \d+ --/g, '');
  } finally {
    await parser.destroy();
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

export async function extractText(file: Blob, mimeType: string): Promise<string> {
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    if (mimeType === 'application/pdf') return truncate(await extractPdf(buffer));
    if (mimeType === 'application/msword' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return truncate(await extractWord(buffer));
    }
    if (mimeType === 'application/vnd.ms-excel' || mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      return truncate(extractSpreadsheet(buffer));
    }
    return '';
  } catch (err) {
    console.error('Attachment text extraction failed:', err);
    return '';
  }
}
