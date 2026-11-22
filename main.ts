// Ember Court — the entry program (Node 22, standard library only).
// It hands the game in: copies game/ and screenshots/ from beside this file
// into /output (or $MAKEFUN_OUTPUT_DIR outside the grader) and writes
// /output/dossier.json with the vendored make.fun library.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Fail loudly before copying anything, instead of handing in a half-built
// output: the entrypoint must exist and every screenshot must already be
// inside the scorer's caps.
import { readdirSync, statSync } from 'node:fs';
if (!existsSync(join(here, 'game', 'index.html'))) {
  throw new Error('game/index.html is missing — cannot hand in the entry');
}
const shotDir = join(here, 'screenshots');
if (existsSync(shotDir)) {
  for (const name of readdirSync(shotDir)) {
    if (name.startsWith('.')) continue;
    const bytes = statSync(join(shotDir, name)).size;
    if (bytes > 262144) throw new Error(`screenshots/${name} is ${bytes} bytes, over the 256 KiB cap`);
  }
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps: only text_max_bytes shapes the bytes; the rest
// refuse an entry the scorer would refuse (more than 4 screenshots or one
// over 256 KiB; more than 993 files in game/ or 48 MiB of game files in all,
// or a path under game/ over 1000 bytes).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
