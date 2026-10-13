/**
 * Builds a sales preview for a lead made with `npm run lead`.
 *
 *   npm run preview -- <slug>                 build only
 *   npm run preview -- <slug> --shots         build, start, and save mobile + desktop screenshots
 *   npm run preview -- <slug> --start         build and keep the site running on PORT (default 3100)
 *
 * The build happens in an isolated copy (.preview/<slug>), so the demo in data/ is never touched
 * and several previews can coexist.
 */
import { spawn, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, symlinkSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const slug = process.argv[2];
const flags = new Set(process.argv.slice(3));
const port = Number(process.env.PORT ?? 3100);

if (!slug || slug.startsWith('--')) {
  console.error('Usage: npm run preview -- <slug> [--shots|--start]');
  process.exit(1);
}
const source = path.join(root, 'clients', slug, 'data');
if (!existsSync(source)) {
  console.error(`clients/${slug}/data not found. Run: npm run lead -- leads/<file>.json`);
  process.exit(1);
}

const out = path.join(root, '.preview', slug);
const skip = new Set([
  'node_modules',
  '.next',
  '.git',
  '.preview',
  'clients',
  'leads',
  'test-results',
  'playwright-report',
]);

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const entry of readdirSync(root)) {
  if (skip.has(entry)) continue;
  cpSync(path.join(root, entry), path.join(out, entry), { recursive: true });
}
// Only the client's languages must remain in data/.
for (const f of readdirSync(path.join(out, 'data'))) {
  if (/^(content|menu)\.[a-z]{2}\.json$/.test(f)) rmSync(path.join(out, 'data', f));
}
cpSync(source, path.join(out, 'data'), { recursive: true });
symlinkSync(path.join(root, 'node_modules'), path.join(out, 'node_modules'), 'dir');

function run(cmd: string, args: string[]) {
  const r = spawnSync(cmd, args, {
    cwd: out,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' },
  });
  if (r.status !== 0) {
    console.error(`\n"${cmd} ${args.join(' ')}" failed in .preview/${slug}.`);
    process.exit(r.status ?? 1);
  }
}

run('npx', ['tsx', 'scripts/validate-content.ts']);
run('npx', ['next', 'build']);

if (!flags.has('--shots') && !flags.has('--start')) {
  console.log(`\nBuilt .preview/${slug}. Run it with: npm run preview -- ${slug} --start\n`);
  process.exit(0);
}

const server = spawn(
  process.execPath,
  [path.join(root, 'node_modules/next/dist/bin/next'), 'start', '-p', String(port)],
  { cwd: out, stdio: 'inherit' },
);
const stop = () => server.kill();
process.on('exit', stop);

async function waitUp(url: string) {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server did not start on ${url}`);
}

async function main() {
  await waitUp(`http://localhost:${port}/`);

  if (flags.has('--start')) {
    console.log(`\nPreview running at http://localhost:${port} (Ctrl+C to stop)\n`);
    await new Promise(() => undefined);
  }

  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  const shots = path.join(root, 'clients', slug, 'screenshots');
  mkdirSync(shots, { recursive: true });
  const pages = [
    ['home', '/'],
    ['menu', '/menu'],
  ] as const;
  for (const [label, w, h, mobile] of [
    ['mobile', 390, 844, true],
    ['desktop', 1440, 900, false],
  ] as const) {
    const ctx = await browser.newContext({
      viewport: { width: w, height: h },
      isMobile: mobile,
      deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();
    for (const [name, p] of pages) {
      await page.goto(`http://localhost:${port}${p}`, { waitUntil: 'load' });
      await page.screenshot({
        path: path.join(shots, `${name}-${label}.png`),
        fullPage: name === 'menu',
      });
    }
    await ctx.close();
  }
  await browser.close();
  stop();
  console.log(`\nScreenshots saved in clients/${slug}/screenshots\n`);
}

main().catch((e) => {
  console.error((e as Error).message);
  stop();
  process.exit(1);
});
