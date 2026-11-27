// main.ts — one job: hand the Deal Lantern site in.
//
// It copies app/ and screenshots/ from this repository into the output
// directory and writes /output/dossier.json with buildDossier from the
// kit's vendor/makefun-frontend.ts. Standard library only, no network.

import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot: string = dirname(fileURLToPath(import.meta.url));
const outputDir: string = process.env.MAKEFUN_OUTPUT_DIR || '/output';

const caps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 16 * 1024 * 1024,
  app_path_max_bytes: 1000,
};

function main(): void {
  // Never remove outputDir itself: on the grader it is a mounted volume and
  // rmSync on the mount point throws EBUSY. Only clear its children.
  mkdirSync(outputDir, { recursive: true });
  for (const child of readdirSync(outputDir)) {
    rmSync(join(outputDir, child), { recursive: true, force: true });
  }
  cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
  const dossier: Uint8Array = buildDossier(outputDir, caps);
  writeFileSync(join(outputDir, 'dossier.json'), dossier);
  const readBack: Buffer = readFileSync(join(outputDir, 'dossier.json'));
  if (!readBack.equals(Buffer.from(dossier))) {
    throw new Error('main.ts: dossier.json did not round-trip');
  }
  const parsed: unknown = JSON.parse(readBack.toString('utf-8'));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('main.ts: dossier.json did not parse as a JSON object');
  }
  const images: unknown = (parsed as { images?: unknown }).images;
  if (!Array.isArray(images) || images.length === 0) {
    throw new Error('main.ts: dossier.json lists no screenshots');
  }
  for (const image of images) {
    const name: unknown = (image as { name?: unknown }).name;
    const base64: unknown = (image as { base64?: unknown }).base64;
    if (typeof name !== 'string' || typeof base64 !== 'string') {
      throw new Error('main.ts: dossier.json holds a screenshot entry without a name or base64 bytes');
    }
    const shot: Buffer = readFileSync(join(outputDir, 'screenshots', name));
    if (shot.toString('base64') !== base64) {
      throw new Error(`main.ts: screenshots/${name} in /output does not match the dossier`);
    }
  }
  console.log(`main.ts: wrote ${outputDir} (dossier.json ${dossier.length} bytes)`);
}

main();
