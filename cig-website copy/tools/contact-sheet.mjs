/* Development helper (not part of the app build).
   Combines the four preview frames of each scene into one contact sheet PNG.
   Requires `sharp`.  Usage: node tools/contact-sheet.mjs <previewDir> */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const dir = process.argv[2];
if (!dir) {
  console.error('usage: node tools/contact-sheet.mjs <previewDir>');
  process.exit(1);
}
const ids = [...new Set(readdirSync(dir).filter((f) => f.endsWith('.svg')).map((f) => f.replace(/-\d\.svg$/, '')))];
const W = 520;
const H = 293;
for (const id of ids) {
  const frames = [];
  for (let i = 0; i < 4; i++) {
    frames.push(await sharp(Buffer.from(readFileSync(join(dir, `${id}-${i}.svg`)))).resize(W, H).png().toBuffer());
  }
  await sharp({ create: { width: W * 2, height: H * 2, channels: 3, background: '#111' } })
    .composite(frames.map((input, i) => ({ input, left: (i % 2) * W, top: Math.floor(i / 2) * H })))
    .png()
    .toFile(join(dir, `sheet-${id}.png`));
}
console.log(`wrote ${ids.length} contact sheets to ${dir}`);
