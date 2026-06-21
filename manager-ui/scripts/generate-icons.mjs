// Rasterizes the brand SVGs into PNG icons + OG image. Run: node scripts/generate-icons.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const pub = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const read = (f) => readFile(join(pub, f));

const rounded = await read('favicon.svg');
const maskable = await read('icon-maskable.svg');
const og = await read('og-image.svg');

const png = (buf, size) => sharp(buf, { density: 384 }).resize(size, size).png().toBuffer();

const out = async (name, buf) => {
  await writeFile(join(pub, name), buf);
  console.log('wrote', name);
};

await out('favicon-16.png', await png(rounded, 16));
await out('favicon-32.png', await png(rounded, 32));
await out('favicon-48.png', await png(rounded, 48));
await out('apple-touch-icon.png', await png(maskable, 180));
await out('icon-192.png', await png(maskable, 192));
await out('icon-512.png', await png(maskable, 512));
await out('icon-maskable-512.png', await png(maskable, 512));
await out('og-image.png', await sharp(og, { density: 192 }).resize(1200, 630).png().toBuffer());

console.log('done');
