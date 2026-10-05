import { z } from 'zod';
import { siteConfig } from './config';
import {
  caseStudySchema,
  contentSchema,
  menuStructureSchema,
  menuTranslationSchema,
} from './schemas';
import type { CaseStudy, Locale, MenuView, SiteContent } from '../types';

/**
 * Loaders for everything in data/ except config.json. Each file is validated with zod, so
 * mistakes surface at build time. Results are memoised per process.
 */

async function loadJson(name: string): Promise<unknown> {
  const mod = await import(`../data/${name}.json`);
  return mod.default;
}

function parse<T extends z.ZodType>(schema: T, data: unknown, file: string): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(`Invalid data/${file}.json:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

const contentCache = new Map<Locale, Promise<SiteContent>>();

export function getContent(locale: Locale): Promise<SiteContent> {
  let cached = contentCache.get(locale);
  if (!cached) {
    cached = loadJson(`content.${locale}`).then((d) =>
      parse(contentSchema, d, `content.${locale}`),
    );
    contentCache.set(locale, cached);
  }
  return cached;
}

const menuCache = new Map<Locale, Promise<MenuView>>();

/**
 * Merges data/menu.json (prices, tags, allergens, images) with data/menu.<locale>.json (words).
 * A missing translation falls back to the default language rather than showing an empty line;
 * `npm run validate` reports every gap so none ships by accident.
 */
export function getMenu(locale: Locale): Promise<MenuView> {
  let cached = menuCache.get(locale);
  if (!cached) {
    cached = buildMenu(locale);
    menuCache.set(locale, cached);
  }
  return cached;
}

async function buildMenu(locale: Locale): Promise<MenuView> {
  const fallbackLocale = siteConfig.defaultLocale;
  const [structureRaw, trRaw, fbRaw] = await Promise.all([
    loadJson('menu'),
    loadJson(`menu.${locale}`),
    loadJson(`menu.${fallbackLocale}`),
  ]);
  const structure = parse(menuStructureSchema, structureRaw, 'menu');
  const tr = parse(menuTranslationSchema, trRaw, `menu.${locale}`);
  const fb = parse(menuTranslationSchema, fbRaw, `menu.${fallbackLocale}`);

  return {
    note: tr.note ?? fb.note,
    categories: structure.categories.map((category) => ({
      id: category.id,
      name: tr.categories[category.id] ?? fb.categories[category.id] ?? category.id,
      items: category.items.map((item) => ({
        ...item,
        name: tr.items[item.id]?.name ?? fb.items[item.id]?.name ?? item.id,
        description: tr.items[item.id]?.description ?? fb.items[item.id]?.description,
      })),
    })),
  };
}

export async function getCaseStudy(): Promise<CaseStudy> {
  return parse(caseStudySchema, await loadJson('case-study'), 'case-study');
}
