/**
 * Turns one prospect into the data files of a sales preview.
 *
 *   npm run lead -- leads/chez-exemple.json
 *
 * Writes clients/<slug>/data/*.json (git-ignored: it is prospect data, keep it out of the public
 * repo). Then build and look at it with `npm run preview -- <slug>`.
 * Optional: PREVIEW_BASE_URL=https://preview.example.com sets the public address used in the
 * canonical links.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { buildClientFiles, leadSchema, loadBaseData } from '../lib/lead';

const input = process.argv[2];
if (!input) {
  console.error('Usage: npm run lead -- leads/<file>.json');
  process.exit(1);
}

let raw: unknown;
try {
  raw = JSON.parse(readFileSync(input, 'utf8'));
} catch (e) {
  console.error(`Cannot read ${input}: ${(e as Error).message}`);
  process.exit(1);
}

const parsed = leadSchema.safeParse(raw);
if (!parsed.success) {
  console.error(`Invalid lead ${input}:\n${z.prettifyError(parsed.error)}`);
  process.exit(1);
}

try {
  const { slug, files, warnings } = buildClientFiles(parsed.data, loadBaseData(), {
    baseUrl: process.env.PREVIEW_BASE_URL,
  });
  const dir = path.join(process.cwd(), 'clients', slug, 'data');
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  for (const [name, value] of Object.entries(files)) {
    writeFileSync(path.join(dir, name), `${JSON.stringify(value, null, 2)}\n`);
  }
  console.log(`\nWrote clients/${slug}/data (${Object.keys(files).length} files).`);
  for (const w of warnings) console.log(`  warning  ${w}`);
  console.log(`\nNext: npm run preview -- ${slug}\n`);
} catch (e) {
  console.error(`Could not build the preview data:\n${(e as Error).message}`);
  process.exit(1);
}
