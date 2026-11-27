// main.ts — one job: hand the Deal Lantern site in.
//
// It copies app/ and screenshots/ from this repository into the output
// directory and writes /output/dossier.json with buildDossier from the
// kit's vendor/makefun-frontend.ts. Standard library only, no network.

import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
  rmSync(outputDir, { recursive: true, force: true });
  mkdirSync(outputDir, { recursive: true });
  cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
  const dossier: Uint8Array = buildDossier(outputDir, caps);
  writeFileSync(join(outputDir, 'dossier.json'), dossier);
  const readBack: Buffer = readFileSync(join(outputDir, 'dossier.json'));
  if (!readBack.equals(Buffer.from(dossier))) {
    throw new Error('main.ts: dossier.json did not round-trip');
  }
  console.log(`main.ts: wrote ${outputDir} (dossier.json ${dossier.length} bytes)`);
}

main();
