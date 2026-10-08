/**
 * Takes the screenshots used in the README and the social preview image.
 *
 *   npm run build && npm run start      (in one terminal)
 *   npm run screenshots                 (in another)
 *
 * Output goes to docs/screenshots/. Pages are captured in English, on a fixed date and time
 * (Friday 19:00 in Munich) so the "Open now" badge and the booking form look the same on every run.
 *
 * Environment variables (all optional):
 *   BASE_URL       where the site runs. Default http://localhost:3000
 *   CHROMIUM_PATH  path of a Chromium binary, if Playwright's own browser is not installed
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium, devices, type Page } from '@playwright/test';
import sharp, { type OverlayOptions } from 'sharp';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT = path.join(process.cwd(), 'docs', 'screenshots');

/** Friday 9 October 2026, 19:00 in Munich (CEST, UTC+2). The venue is open until 22:30. */
const FIXED_TIME = new Date('2026-10-09T17:00:00Z');
/** The next day, a Saturday: a day the demo restaurant is open. */
const BOOKING_DATE = '2026-10-10';

const MOBILE = { ...devices['Pixel 7'] };
const DESKTOP = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 };

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  // The hero text has a short entrance animation; wait until it has finished.
  await page.waitForTimeout(1400);
}

async function save(page: Page, name: string, width: number) {
  const png = await page.screenshot({ type: 'png' });
  const file = path.join(OUT, `${name}.webp`);
  await sharp(png).resize({ width }).webp({ quality: 84 }).toFile(file);
  console.info(`  ${path.relative(process.cwd(), file)}`);
  return file;
}

async function capture() {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: process.env.CHROMIUM_PATH ? ['--no-sandbox'] : [],
  });
  const files: Record<string, string> = {};

  for (const [kind, options] of [
    ['mobile', MOBILE],
    ['desktop', DESKTOP],
  ] as const) {
    const context = await browser.newContext({ ...options, locale: 'en-GB' });
    await context.clock.setFixedTime(FIXED_TIME);
    const page = await context.newPage();
    const width = kind === 'mobile' ? 780 : 1440;

    // Home
    await page.goto(`${BASE_URL}/en`);
    await page.getByText('Open now').first().waitFor();
    await settle(page);
    files[`home-${kind}`] = await save(page, `home-${kind}`, width);

    // Menu, with the vegetarian filter on
    await page.goto(`${BASE_URL}/en/menu?src=qr`);
    await page.getByRole('button', { name: /Vegetarian/ }).click();
    await settle(page);
    files[`menu-${kind}`] = await save(page, `menu-${kind}`, width);

    // Reservation form, filled in
    await page.goto(`${BASE_URL}/en/reserve`);
    await page.getByLabel('Name').fill('Anna Rossi');
    await page.getByLabel('Phone').fill('+49 151 1234567');
    await page.getByLabel('Date').fill(BOOKING_DATE);
    await page.getByLabel('Time').selectOption('19:30');
    await page.getByLabel('Guests').selectOption('4');
    // Drop the focus ring from the last field, then bring the page title and the form into view.
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.evaluate(() => {
      const heading = document.querySelector('h1');
      const top = (heading?.getBoundingClientRect().top ?? 0) + window.scrollY;
      window.scrollTo(0, Math.max(0, top - 24));
    });
    await settle(page);
    files[`reserve-${kind}`] = await save(page, `reserve-${kind}`, width);

    await context.close();
  }

  await browser.close();
  return files;
}

/** Rounds the corners of a screenshot so it reads as a phone screen. */
async function phone(file: string, width: number, radius: number) {
  const resized = await sharp(file).resize({ width }).png().toBuffer();
  const { height = width * 2 } = await sharp(resized).metadata();
  const mask = Buffer.from(
    `<svg width="${width}" height="${height}"><rect width="${width}" height="${height}" rx="${radius}" ry="${radius}"/></svg>`,
  );
  const body = await sharp(resized)
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();
  return { body, width, height };
}

async function shadow(width: number, height: number, radius: number) {
  const pad = 60;
  const svg = Buffer.from(
    `<svg width="${width + pad * 2}" height="${height + pad * 2}"><rect x="${pad}" y="${pad + 14}" width="${width}" height="${height}" rx="${radius}" fill="black" fill-opacity="0.28"/></svg>`,
  );
  return { body: await sharp(svg).blur(22).png().toBuffer(), pad };
}

async function composeOverview(files: Record<string, string>) {
  const names = ['home-mobile', 'menu-mobile', 'reserve-mobile'];
  const phoneWidth = 420;
  const radius = 34;
  const gap = 56;
  const margin = 90;
  const phones = await Promise.all(names.map((n) => phone(files[n]!, phoneWidth, radius)));
  const tallest = Math.max(...phones.map((p) => p.height));
  const width = margin * 2 + phones.length * phoneWidth + (phones.length - 1) * gap;
  const height = tallest + margin * 2;

  const layers: OverlayOptions[] = [];
  for (const [i, p] of phones.entries()) {
    const left = margin + i * (phoneWidth + gap);
    const top = margin;
    const s = await shadow(p.width, p.height, radius);
    layers.push({ input: s.body, left: left - s.pad, top: top - s.pad });
    layers.push({ input: p.body, left, top });
  }

  const file = path.join(OUT, 'overview.webp');
  await sharp({ create: { width, height, channels: 4, background: '#e8ece9' } })
    .composite(layers)
    .webp({ quality: 86 })
    .toFile(file);
  console.info(`  ${path.relative(process.cwd(), file)}`);
}

/** Adds a phone and its shadow to a canvas, cropping whatever falls outside it (bleeds off). */
async function place(
  layers: OverlayOptions[],
  canvas: { width: number; height: number },
  item: Awaited<ReturnType<typeof phone>>,
  left: number,
  top: number,
  radius: number,
) {
  const s = await shadow(item.width, item.height, radius);
  const shadowSize = await sharp(s.body).metadata();
  const sLeft = left - s.pad;
  const sTop = top - s.pad;
  const sWidth = Math.min(shadowSize.width ?? 0, canvas.width - sLeft);
  const sHeight = Math.min(shadowSize.height ?? 0, canvas.height - sTop);
  layers.push({
    input: await sharp(s.body)
      .extract({ left: 0, top: 0, width: sWidth, height: sHeight })
      .toBuffer(),
    left: sLeft,
    top: sTop,
  });

  const width = Math.min(item.width, canvas.width - left);
  const height = Math.min(item.height, canvas.height - top);
  layers.push({
    input: await sharp(item.body).extract({ left: 0, top: 0, width, height }).toBuffer(),
    left,
    top,
  });
}

async function composeSocialPreview(files: Record<string, string>) {
  const canvas = { width: 1280, height: 640 };
  const phoneWidth = 330;
  const radius = 30;
  const first = await phone(files['home-mobile']!, phoneWidth, radius);
  const second = await phone(files['menu-mobile']!, phoneWidth, radius);

  const text = Buffer.from(
    `<svg width="${canvas.width}" height="${canvas.height}">
      <text x="80" y="262" font-family="Georgia, 'DejaVu Serif', serif" font-size="72" fill="#ffffff">Template Zero</text>
      <text x="82" y="318" font-family="Helvetica, Arial, 'DejaVu Sans', sans-serif" font-size="34" fill="#dfe9e2">Multilingual website and QR menu</text>
      <text x="82" y="364" font-family="Helvetica, Arial, 'DejaVu Sans', sans-serif" font-size="34" fill="#dfe9e2">for restaurants, bars and cafes</text>
      <text x="82" y="440" font-family="Helvetica, Arial, 'DejaVu Sans', sans-serif" font-size="26" fill="#a9c2b2">Next.js 15 · TypeScript · Tailwind 4 · next-intl</text>
    </svg>`,
  );

  const layers: OverlayOptions[] = [{ input: text, left: 0, top: 0 }];
  await place(layers, canvas, first, 700, 110, radius);
  await place(layers, canvas, second, 1010, 190, radius);

  const file = path.join(OUT, 'social-preview.png');
  await sharp({ create: { ...canvas, channels: 4, background: '#1f4d3a' } })
    .composite(layers)
    .png()
    .toFile(file);
  console.info(`  ${path.relative(process.cwd(), file)}`);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  console.info(`Capturing ${BASE_URL} ...`);
  const files = await capture();
  console.info('Composing ...');
  await composeOverview(files);
  await composeSocialPreview(files);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
