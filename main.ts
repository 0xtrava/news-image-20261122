// news-image-20261122: entry for make.fun's "Sum up 22 November's world
// news in one image" bounty.
//
// The entry image lives beside this file as entry.png. It is a JPEG by its
// first bytes, which the rules allow under the entry.png name. This program
// copies it, byte for byte, to /output/entry.png -- or to MAKEFUN_OUTPUT_DIR
// when that is set, for local runs. No network, no dependencies: Node 22
// standard library only.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { copyFileSync, mkdirSync, readFileSync, renameSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

// The bounty requires a square 1024x1024 image. Validate the bytes before
// publishing so a corrupt or wrong-size file fails loudly instead of being
// silently shipped as the entry.
function checkImage(buf: Buffer): { format: string; width: number; height: number } {
  if (buf.length === 0) throw new Error('entry.png is empty');
  const isPng = buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (isPng) {
    if (buf.subarray(12, 16).toString() !== 'IHDR') throw new Error('entry.png: bad PNG header');
    return { format: 'png', width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (isJpeg) {
    // Scan JPEG markers for a Start Of Frame segment, which carries height
    // then width as big-endian uint16s.
    let off = 2;
    while (off + 1 < buf.length) {
      if (buf[off] !== 0xff) throw new Error('entry.png: bad JPEG marker');
      const marker = buf[off + 1];
      if (marker === 0xd9) break; // EOI: no SOF found
      if (marker === 0xda) throw new Error('entry.png: scan data reached without a Start Of Frame');
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { off += 2; continue; }
      const len = buf.readUInt16BE(off + 2);
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return { format: 'jpeg', width: buf.readUInt16BE(off + 7), height: buf.readUInt16BE(off + 5) };
      }
      off += 2 + len;
    }
    throw new Error('entry.png: no JPEG Start Of Frame found');
  }
  throw new Error('entry.png is neither PNG nor JPEG');
}

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
const src = new URL('./entry.png', import.meta.url);
const bytes = readFileSync(src);
const info = checkImage(bytes);
if (info.width !== 1024 || info.height !== 1024) {
  throw new Error(`entry.png is ${info.width}x${info.height}, expected 1024x1024`);
}
// Publish atomically and prove the destination is byte-identical to the
// verified source: a partial write must never leave a corrupt entry behind.
const dest = join(outDir, 'entry.png');
const tmp = join(outDir, `.entry.png.${process.pid}.tmp`);
copyFileSync(src, tmp);
const srcHash = createHash('sha256').update(bytes).digest('hex');
const destHash = createHash('sha256').update(readFileSync(tmp)).digest('hex');
if (srcHash !== destHash) throw new Error('entry.png: published bytes differ from source');
renameSync(tmp, dest);
console.log(`entry.png: ${info.format} ${info.width}x${info.height}, ${bytes.length} bytes, sha256 ${destHash}`);
