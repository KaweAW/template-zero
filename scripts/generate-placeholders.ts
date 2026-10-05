/**
 * Generates the placeholder artwork used by the demo: a laid table (hero + social image) and
 * a top-down plate per featured dish. It exists so the template runs out of the box with real
 * raster files (which is what next/image optimises), without shipping anyone's photos.
 *
 * Replace every file in public/images with the client's own photography before going live.
 *
 *   npm run placeholders
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const OUT = path.join(process.cwd(), 'public', 'images');

const PLATE_SHADOW = '<circle cx="{sx}" cy="{sy}" r="{r}" fill="#000" opacity=".16"/>';

/** A white plate with a rim, centred at (cx, cy). */
function plate(cx: number, cy: number, r: number) {
  return `
    ${PLATE_SHADOW.replace('{sx}', String(cx + r * 0.04))
      .replace('{sy}', String(cy + r * 0.06))
      .replace('{r}', String(r))}
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="#ffffff"/>
    <circle cx="${cx}" cy="${cy}" r="${r * 0.82}" fill="none" stroke="#e4e4dc" stroke-width="${r * 0.02}"/>`;
}

/** A nest of pasta: concentric ellipses with a spoon of tomato sauce on top. */
function pasta(cx: number, cy: number, r: number) {
  const rings = [0.62, 0.52, 0.42, 0.32, 0.22]
    .map(
      (k, i) =>
        `<ellipse cx="${cx}" cy="${cy}" rx="${r * k}" ry="${r * k * (0.9 - i * 0.02)}" fill="none" stroke="${i % 2 ? '#e2b957' : '#efc96b'}" stroke-width="${r * 0.07}" transform="rotate(${i * 23} ${cx} ${cy})"/>`,
    )
    .join('');
  return `${rings}
    <circle cx="${cx}" cy="${cy}" r="${r * 0.2}" fill="#c8402a"/>
    <ellipse cx="${cx - r * 0.06}" cy="${cy - r * 0.05}" rx="${r * 0.1}" ry="${r * 0.05}" fill="#2f7d4f" transform="rotate(-30 ${cx} ${cy})"/>`;
}

function tableScene(w: number, h: number) {
  const r = Math.min(w, h) * 0.3;
  const cx = w * 0.64;
  const cy = h * 0.5;
  const glassX = w * 0.3;
  const glassY = h * 0.3;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>
      <pattern id="gingham" width="120" height="120" patternUnits="userSpaceOnUse">
        <rect width="120" height="120" fill="#fbfbf7"/>
        <rect width="120" height="60" fill="#1e4636" opacity="0.3"/>
        <rect width="60" height="120" fill="#1e4636" opacity="0.3"/>
      </pattern>
      <radialGradient id="vignette" cx="50%" cy="50%" r="75%">
        <stop offset="55%" stop-color="#000" stop-opacity="0"/>
        <stop offset="100%" stop-color="#000" stop-opacity="0.32"/>
      </radialGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#gingham)"/>
    ${plate(cx, cy, r)}
    ${pasta(cx, cy, r)}
    <circle cx="${glassX}" cy="${glassY}" r="${r * 0.3}" fill="#ffffff" opacity=".55"/>
    <circle cx="${glassX}" cy="${glassY}" r="${r * 0.24}" fill="#7a1f2b"/>
    <circle cx="${glassX - r * 0.07}" cy="${glassY - r * 0.07}" r="${r * 0.05}" fill="#fff" opacity=".5"/>
    <g stroke="#c9ccc6" stroke-width="${r * 0.035}" stroke-linecap="round">
      <line x1="${cx - r * 1.28}" y1="${cy - r * 0.55}" x2="${cx - r * 1.28}" y2="${cy + r * 0.75}"/>
      <line x1="${cx - r * 1.36}" y1="${cy - r * 0.55}" x2="${cx - r * 1.36}" y2="${cy - r * 0.2}"/>
      <line x1="${cx - r * 1.2}" y1="${cy - r * 0.55}" x2="${cx - r * 1.2}" y2="${cy - r * 0.2}"/>
    </g>
    <rect width="${w}" height="${h}" fill="url(#vignette)"/>
  </svg>`;
}

const DISH_BACKGROUNDS: Record<string, string> = {
  burrata: '#d9e3d0',
  'tagliatelle-ragu': '#f0e1c4',
  saltimbocca: '#e3d2c0',
  tiramisu: '#d7c9bd',
};

function dishScene(id: string) {
  const w = 800;
  const h = 1000;
  const cx = w / 2;
  const cy = h / 2;
  const r = 300;
  let food = '';

  if (id === 'burrata') {
    food = `
      <circle cx="${cx - 110}" cy="${cy + 70}" r="52" fill="#d6452f"/>
      <circle cx="${cx + 120}" cy="${cy + 90}" r="46" fill="#c8402a"/>
      <circle cx="${cx + 20}" cy="${cy + 150}" r="40" fill="#d6452f"/>
      <circle cx="${cx}" cy="${cy - 10}" r="125" fill="#fffdf6"/>
      <circle cx="${cx - 35}" cy="${cy - 45}" r="38" fill="#fff" opacity=".8"/>
      <ellipse cx="${cx + 20}" cy="${cy - 120}" rx="46" ry="22" fill="#2f7d4f" transform="rotate(-25 ${cx + 20} ${cy - 120})"/>
      <ellipse cx="${cx - 70}" cy="${cy - 105}" rx="38" ry="18" fill="#3b8d5c" transform="rotate(20 ${cx - 70} ${cy - 105})"/>`;
  } else if (id === 'tagliatelle-ragu') {
    food = pasta(cx, cy, r * 1.25);
  } else if (id === 'saltimbocca') {
    food = `
      <rect x="${cx - 190}" y="${cy - 130}" width="230" height="150" rx="40" fill="#c4915f" transform="rotate(-8 ${cx} ${cy})"/>
      <rect x="${cx - 40}" y="${cy - 10}" width="230" height="150" rx="40" fill="#b9855a" transform="rotate(10 ${cx} ${cy})"/>
      <ellipse cx="${cx - 85}" cy="${cy - 55}" rx="52" ry="24" fill="#3b8d5c" transform="rotate(-30 ${cx - 85} ${cy - 55})"/>
      <ellipse cx="${cx + 85}" cy="${cy + 75}" rx="52" ry="24" fill="#2f7d4f" transform="rotate(20 ${cx + 85} ${cy + 75})"/>
      <circle cx="${cx - 110}" cy="${cy + 130}" r="38" fill="#e8c26a"/>
      <circle cx="${cx - 40}" cy="${cy + 165}" r="34" fill="#efce7c"/>
      <circle cx="${cx + 190}" cy="${cy - 120}" r="34" fill="#e8c26a"/>`;
  } else if (id === 'tiramisu') {
    food = `
      <rect x="${cx - 150}" y="${cy - 120}" width="300" height="250" rx="14" fill="#c89b5b"/>
      <rect x="${cx - 150}" y="${cy - 120}" width="300" height="190" rx="14" fill="#f3e6c8"/>
      <rect x="${cx - 150}" y="${cy - 120}" width="300" height="70" rx="14" fill="#5a3a2a"/>
      <rect x="${cx - 150}" y="${cy - 60}" width="300" height="8" fill="#c89b5b" opacity=".6"/>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect width="${w}" height="${h}" fill="${DISH_BACKGROUNDS[id] ?? '#e6e6dc'}"/>
    ${plate(cx, cy, r)}
    ${food}
  </svg>`;
}

async function render(svg: string, file: string, format: 'webp' | 'jpeg', quality: number) {
  const image = sharp(Buffer.from(svg));
  const target = path.join(OUT, file);
  await (
    format === 'webp' ? image.webp({ quality }) : image.jpeg({ quality, mozjpeg: true })
  ).toFile(target);
  console.log(`  ${file}`);
}

async function main() {
  await mkdir(path.join(OUT, 'dishes'), { recursive: true });
  console.log('Writing placeholder images to public/images:');
  await render(tableScene(1920, 1280), 'hero.webp', 'webp', 72);
  await render(tableScene(1200, 630), 'og.jpg', 'jpeg', 82);
  for (const id of Object.keys(DISH_BACKGROUNDS)) {
    await render(dishScene(id), `dishes/${id}.webp`, 'webp', 74);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
