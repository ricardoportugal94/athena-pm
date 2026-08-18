import { generateImageAsync } from '@expo/image-utils';
import { mkdirSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = path.join(projectRoot, 'assets/images/icon.png');
const outDir = path.join(projectRoot, 'public');
mkdirSync(outDir, { recursive: true });

const targets = [
  { name: 'apple-touch-icon.png', width: 180, height: 180, backgroundColor: '#191919' },
  { name: 'icon-192.png', width: 192, height: 192, backgroundColor: '#191919' },
  { name: 'icon-512.png', width: 512, height: 512, backgroundColor: '#191919' },
];

for (const t of targets) {
  const { source } = await generateImageAsync(
    { projectRoot },
    { src, width: t.width, height: t.height, resizeMode: 'contain', backgroundColor: t.backgroundColor }
  );
  writeFileSync(path.join(outDir, t.name), source);
  console.log('wrote', t.name);
}
