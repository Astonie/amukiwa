import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOTS = ['public/assets', 'public/uploads'];
const EXT = new Set(['.jpg', '.jpeg', '.png']);

async function walk(dir) {
  const out = [];
  for (const name of await readdir(dir)) {
    const p = path.join(dir, name);
    const s = await stat(p);
    if (s.isDirectory()) out.push(...await walk(p));
    else if (EXT.has(path.extname(name).toLowerCase())) out.push(p);
  }
  return out;
}

let saved = 0;
for (const root of ROOTS) {
  for (const file of await walk(root)) {
    const ext = path.extname(file).toLowerCase();
    const before = (await stat(file)).size;
    const img = sharp(file);
    const buf = ext === '.png'
      ? await img.png({ quality: 80, compressionLevel: 9 }).toBuffer()
      : await img.jpeg({ quality: 80, mozjpeg: true }).toBuffer();
    if (buf.length < before) {
      await (await import('node:fs/promises')).writeFile(file, buf);
      saved += before - buf.length;
      // also emit webp sibling
      await sharp(file).webp({ quality: 78 }).toFile(file.replace(/\.(jpg|jpeg|png)$/i, '.webp'));
    }
  }
}
console.log(`Optimized images, saved ${(saved / 1024).toFixed(1)} KB`);