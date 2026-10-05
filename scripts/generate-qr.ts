/**
 * Generates the table QR codes for the menu page.
 *
 *   npm run qr                     -> uses siteUrl from data/config.json
 *   npm run qr -- --url https://example.com
 *
 * Files are written to public/qr/ (and can be printed or sent to the client):
 *   menu.svg / menu.png       one QR for every guest. "/menu" redirects to the guest's own
 *                             language (browser setting), so a single printed code serves
 *                             tourists and locals alike.
 *   menu-<locale>.svg / .png  one QR per language, if you want separate language cards.
 *
 * SVG is the print-ready format (scales without blurring). The PNG is 1200 px for quick use.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import QRCode from 'qrcode';
import { siteConfig } from '../lib/config';

const OUT = path.join(process.cwd(), 'public', 'qr');

function argValue(flag: string) {
  const index = process.argv.indexOf(flag);
  return index > -1 ? process.argv[index + 1] : undefined;
}

async function write(name: string, url: string) {
  const options = {
    errorCorrectionLevel: 'Q' as const, // survives scratches and food stains on a table card
    margin: 4, // the "quiet zone" scanners need; do not crop it when printing
    color: { dark: siteConfig.colors.foreground, light: '#ffffff' },
  };
  await writeFile(
    path.join(OUT, `${name}.svg`),
    await QRCode.toString(url, { ...options, type: 'svg' }),
  );
  await QRCode.toFile(path.join(OUT, `${name}.png`), url, { ...options, width: 1200 });
  console.log(`  ${name}.svg, ${name}.png  ->  ${url}`);
}

async function main() {
  const base = (argValue('--url') ?? siteConfig.siteUrl).replace(/\/$/, '');
  if (new URL(base).hostname.endsWith('.example')) {
    console.warn(`\nWarning: ${base} is a placeholder domain. Do not print these codes yet.\n`);
  }

  await mkdir(OUT, { recursive: true });
  console.log('Writing QR codes to public/qr:');
  await write('menu', `${base}/menu?src=qr`);
  for (const locale of siteConfig.locales) {
    await write(`menu-${locale}`, `${base}/${locale}/menu?src=qr`);
  }
  console.log('\nTest every code with a real phone before printing.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
