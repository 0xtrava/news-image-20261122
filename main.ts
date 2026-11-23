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

import { copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
copyFileSync(new URL('./entry.png', import.meta.url), join(outDir, 'entry.png'));
