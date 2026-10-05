/**
 * Pre-flight check for a client site. Run it before every deploy:
 *
 *   npm run validate
 *
 * Errors stop the deploy (exit code 1). Warnings are things a human should look at.
 * It catches the mistakes that are easy to make when customising the template in a hurry:
 * a missing translation, a typo in a message placeholder, a photo that does not exist,
 * text that is too faint to read, a placeholder domain left in config.json.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { siteConfig } from '../lib/config';
import { contrastRatio } from '../lib/color';
import { toMinutes } from '../lib/hours';
import {
  caseStudySchema,
  contentSchema,
  menuStructureSchema,
  menuTranslationSchema,
} from '../lib/schemas';
import { DAY_KEYS } from '../lib/constants';

const root = process.cwd();
const errors: string[] = [];
const warnings: string[] = [];
const error = (message: string) => errors.push(message);
const warn = (message: string) => warnings.push(message);

function readJson(relative: string): unknown {
  const file = path.join(root, relative);
  if (!existsSync(file)) {
    error(`${relative} is missing`);
    return undefined;
  }
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    error(`${relative} is not valid JSON: ${(e as Error).message}`);
    return undefined;
  }
}

function publicFileExists(urlPath: string) {
  return existsSync(path.join(root, 'public', urlPath.replace(/^\//, '')));
}

/** "a.b.c" style keys of a nested object. */
function flatten(value: unknown, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      const next = prefix ? `${prefix}.${key}` : key;
      if (typeof child === 'string') out[next] = child;
      else Object.assign(out, flatten(child, next));
    }
  }
  return out;
}

const placeholders = (text: string) =>
  [...text.matchAll(/\{(\w+)/g)]
    .map((m) => m[1])
    .sort()
    .join(',');

const { locales, defaultLocale } = siteConfig;

// ---------------------------------------------------------------- config
if (new URL(siteConfig.siteUrl).hostname.endsWith('.example')) {
  warn('siteUrl still uses a placeholder (.example) domain. Set the real domain before launch.');
}
if (siteConfig.features.caseStudy) {
  warn('features.caseStudy is on. Turn it off for a real client site (it is sales material).');
}
if (['DE', 'AT', 'CH'].includes(siteConfig.contact.address.country)) {
  if (!siteConfig.legal.imprintUrl)
    warn('legal.imprintUrl is empty: an Impressum is legally required in DE/AT/CH.');
  if (!siteConfig.legal.privacyUrl)
    warn('legal.privacyUrl is empty: a privacy policy is legally required in DE/AT/CH.');
}
for (const [label, file] of [
  ['images.hero', siteConfig.images.hero],
  ['images.og', siteConfig.images.og],
  ...(siteConfig.logo ? [['logo.src', siteConfig.logo.src] as const] : []),
] as const) {
  if (!publicFileExists(file)) error(`${label} points to ${file}, which does not exist in public/`);
}

const { colors } = siteConfig;
const textOnBackground = contrastRatio(colors.foreground, colors.background);
if (textOnBackground < 4.5)
  error(`foreground on background has contrast ${textOnBackground.toFixed(2)}:1 (needs 4.5:1)`);
const textOnSurface = contrastRatio(colors.foreground, colors.surface);
if (textOnSurface < 4.5)
  error(`foreground on surface has contrast ${textOnSurface.toFixed(2)}:1 (needs 4.5:1)`);
const accentOnBackground = contrastRatio(colors.accent, colors.background);
if (accentOnBackground < 4.5) {
  warn(
    `accent text on background has contrast ${accentOnBackground.toFixed(2)}:1 (error messages use it; 4.5:1 recommended)`,
  );
}

for (const day of DAY_KEYS) {
  const ranges = siteConfig.hours[day]
    .map((r) => ({ open: toMinutes(r.open), close: toMinutes(r.close) }))
    .sort((a, b) => a.open - b.open);
  ranges.forEach((range, i) => {
    const next = ranges[i + 1];
    const end = range.close <= range.open ? range.close + 1440 : range.close;
    if (next && end > next.open) warn(`hours.${day}: two opening intervals overlap`);
  });
}

// ---------------------------------------------------------------- menu structure
const structureRaw = readJson('data/menu.json');
const structure = structureRaw ? menuStructureSchema.safeParse(structureRaw) : undefined;
if (structure && !structure.success) error(`data/menu.json: ${structure.error.message}`);

const categoryIds = new Set<string>();
const itemIds = new Set<string>();
if (structure?.success) {
  for (const category of structure.data.categories) {
    if (categoryIds.has(category.id))
      error(`data/menu.json: duplicate category id "${category.id}"`);
    categoryIds.add(category.id);
    if (category.items.length === 0) warn(`data/menu.json: category "${category.id}" has no items`);
    for (const item of category.items) {
      if (itemIds.has(item.id)) error(`data/menu.json: duplicate item id "${item.id}"`);
      itemIds.add(item.id);
      if (item.image && !publicFileExists(item.image)) {
        error(`data/menu.json: image of "${item.id}" (${item.image}) does not exist in public/`);
      }
    }
  }
  if (!structure.data.categories.some((c) => c.items.some((i) => i.featured))) {
    warn(
      'No dish has "featured": true, so the homepage will not show a "From the kitchen" section.',
    );
  }
}

// ---------------------------------------------------------------- per-language files
const defaultMessages = flatten(readJson(`messages/${defaultLocale}.json`));
const errorsFile = readJson('messages/errors.json') as Record<string, unknown> | undefined;

for (const locale of locales) {
  // UI messages: same keys and same {placeholders} as the default language.
  const messages = flatten(readJson(`messages/${locale}.json`));
  for (const key of Object.keys(defaultMessages)) {
    if (!(key in messages)) error(`messages/${locale}.json: missing key "${key}"`);
    else if (placeholders(messages[key]) !== placeholders(defaultMessages[key])) {
      error(
        `messages/${locale}.json: "${key}" uses different {placeholders} than ${defaultLocale}`,
      );
    }
  }
  for (const key of Object.keys(messages)) {
    if (!(key in defaultMessages))
      warn(`messages/${locale}.json: extra key "${key}" (not in ${defaultLocale})`);
  }

  if (errorsFile && !(locale in errorsFile))
    error(`messages/errors.json: missing language "${locale}"`);

  // Client copy.
  const contentRaw = readJson(`data/content.${locale}.json`);
  if (contentRaw) {
    const parsed = contentSchema.safeParse(contentRaw);
    if (!parsed.success) error(`data/content.${locale}.json: ${parsed.error.message}`);
  }

  // Menu words.
  const translationRaw = readJson(`data/menu.${locale}.json`);
  if (!translationRaw) continue;
  const translation = menuTranslationSchema.safeParse(translationRaw);
  if (!translation.success) {
    error(`data/menu.${locale}.json: ${translation.error.message}`);
    continue;
  }
  for (const id of categoryIds) {
    if (!translation.data.categories[id])
      error(`data/menu.${locale}.json: no name for category "${id}"`);
  }
  for (const id of itemIds) {
    const entry = translation.data.items[id];
    if (!entry) error(`data/menu.${locale}.json: no translation for dish "${id}"`);
    else if (!entry.description) warn(`data/menu.${locale}.json: dish "${id}" has no description`);
  }
  for (const id of Object.keys(translation.data.categories)) {
    if (!categoryIds.has(id))
      warn(`data/menu.${locale}.json: category "${id}" is not in menu.json (unused)`);
  }
  for (const id of Object.keys(translation.data.items)) {
    if (!itemIds.has(id))
      warn(`data/menu.${locale}.json: dish "${id}" is not in menu.json (unused)`);
  }
}

// ---------------------------------------------------------------- case study
if (siteConfig.features.caseStudy) {
  const parsed = caseStudySchema.safeParse(readJson('data/case-study.json'));
  if (!parsed.success) error(`data/case-study.json: ${parsed.error.message}`);
  else if (parsed.data.illustrative) {
    warn(
      'data/case-study.json is marked "illustrative": the case-study page shows a "sample data" notice.',
    );
  }
}

// ---------------------------------------------------------------- report
const line = (symbol: string, text: string) => console.log(`  ${symbol} ${text}`);
console.log(`\nChecked ${siteConfig.name} (${locales.join(', ')}), ${itemIds.size} dishes.\n`);
errors.forEach((message) => line('ERROR  ', message));
warnings.forEach((message) => line('warning', message));
console.log(
  `\n${errors.length} error${errors.length === 1 ? '' : 's'}, ${warnings.length} warning${warnings.length === 1 ? '' : 's'}.\n`,
);
process.exit(errors.length > 0 ? 1 : 0);
