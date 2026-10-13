import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { contrastRatio } from './color';
import { BUSINESS_TYPES, SUPPORTED_LOCALES } from './constants';
import {
  contentSchema,
  hoursSchema,
  menuStructureSchema,
  menuTranslationSchema,
  siteConfigSchema,
} from './schemas';
import type { Locale, SiteConfig, SiteContent } from '../types';

/**
 * Turns one prospect (a "lead", usually taken from Google Maps) into the data/ folder of a sales
 * preview. Everything here is a pure function so it can be unit-tested; the command line that
 * reads and writes files is scripts/generate-lead.ts.
 *
 * What a preview shows: the real name, address, phone, e-mail and (when known) opening hours and
 * rating of the venue, plus clearly labelled SAMPLE text, photos and menu. Nothing is invented
 * about the venue itself.
 */

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a 6-digit hex colour such as #1E4636');

export const leadSchema = z.object({
  name: z.string().trim().min(1).max(60),
  type: z.enum(BUSINESS_TYPES).default('Restaurant'),
  /** Free words in the venue's own language, e.g. ["italienne", "pizza"]. */
  cuisine: z.array(z.string().trim().min(1)).min(1),
  /** Languages of the preview. The first one is the default. */
  locales: z.array(z.enum(SUPPORTED_LOCALES)).min(1).max(4).default(['fr']),
  address: z.object({
    street: z.string().trim().min(1),
    postalCode: z.string().trim().min(1),
    city: z.string().trim().min(1),
    region: z.string().trim().optional(),
    country: z.string().length(2).default('FR'),
  }),
  geo: z
    .object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
    .optional(),
  phone: z.string().trim().min(5),
  whatsapp: z
    .string()
    .regex(/^\+\d{6,15}$/, 'Use international format, e.g. +33612345678')
    .optional(),
  email: z.email(),
  timezone: z.string().min(1).default('Europe/Paris'),
  currency: z.string().length(3).default('EUR'),
  /** Opening hours when you know them. If missing, the demo hours are used and a warning is printed. */
  hours: hoursSchema.optional(),
  /** Numbers from Google Maps. Never the text of reviews. */
  reviews: z
    .object({
      rating: z.number().min(1).max(5),
      count: z.number().int().positive(),
      url: z.url().optional(),
    })
    .optional(),
  /** Main colour of the venue's own branding, if you have seen one. */
  brandColor: hex.optional(),
  social: z.object({ instagram: z.url().optional(), facebook: z.url().optional() }).default({}),
});

export type Lead = z.infer<typeof leadSchema>;

/** The files of the demo site that every preview starts from. */
export interface BaseData {
  config: unknown;
  menu: unknown;
  caseStudy: unknown;
  menuTranslations: Partial<Record<Locale, unknown>>;
  /** Alt text of the demo hero photo, per language (the preview reuses that photo). */
  heroAlt?: Partial<Record<Locale, string>>;
}

export interface ClientFiles {
  slug: string;
  /** File name inside data/ -> JSON value. */
  files: Record<string, unknown>;
  warnings: string[];
}

/** "Chez Éric & Fils" -> "chez-eric-fils". Never empty. */
export function slugify(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
  return slug || 'client';
}

interface Copy {
  tagline: (name: string, city: string) => string;
  seo: (name: string, city: string) => string;
  subtitle: string;
  aboutTitle: string;
  about: (name: string) => string[];
  menuNote: string;
}

/**
 * Neutral wording for each language. It says what a visitor can do on the site and admits that it
 * is sample text; it makes no claim about the venue's food, history or people.
 */
const COPY: Record<Locale, Copy> = {
  fr: {
    tagline: (name, city) => `${name}, à ${city}`,
    seo: (name, city) =>
      `${name} à ${city} : la carte, les horaires et l'adresse. Demandez une table en ligne ou appelez directement.`,
    subtitle: 'La carte, les horaires et une table réservée en quelques secondes.',
    aboutTitle: 'À propos',
    about: (name) => [
      `Retrouvez ici la carte, les horaires et l'adresse de ${name}.`,
      "Ce texte est un exemple pour l'aperçu : il sera remplacé par l'histoire de votre maison.",
    ],
    menuNote: 'Carte d’exemple : les plats et les prix seront ceux de votre maison.',
  },
  en: {
    tagline: (name, city) => `${name} in ${city}`,
    seo: (name, city) =>
      `${name} in ${city}: menu, opening hours and address. Request a table online or call us directly.`,
    subtitle: 'The menu, the opening hours and a table booked in seconds.',
    aboutTitle: 'About',
    about: (name) => [
      `Find the menu, opening hours and address of ${name} here.`,
      'This text is a sample for the preview: it will be replaced by the story of your venue.',
    ],
    menuNote: 'Sample menu: the dishes and prices will be those of your venue.',
  },
  de: {
    tagline: (name, city) => `${name} in ${city}`,
    seo: (name, city) =>
      `${name} in ${city}: Speisekarte, Öffnungszeiten und Adresse. Tisch online anfragen oder direkt anrufen.`,
    subtitle: 'Speisekarte, Öffnungszeiten und ein Tisch in wenigen Sekunden.',
    aboutTitle: 'Über uns',
    about: (name) => [
      `Hier finden Sie die Speisekarte, die Öffnungszeiten und die Adresse von ${name}.`,
      'Dieser Text ist ein Beispiel für die Vorschau: Er wird durch die Geschichte Ihres Hauses ersetzt.',
    ],
    menuNote: 'Beispielkarte: Gerichte und Preise sind später die Ihres Hauses.',
  },
  it: {
    tagline: (name, city) => `${name} a ${city}`,
    seo: (name, city) =>
      `${name} a ${city}: menu, orari e indirizzo. Richiedi un tavolo online o chiamaci direttamente.`,
    subtitle: 'Menu, orari e un tavolo prenotato in pochi secondi.',
    aboutTitle: 'Chi siamo',
    about: (name) => [
      `Qui trovi il menu, gli orari e l'indirizzo di ${name}.`,
      "Questo testo è un esempio per l'anteprima: sarà sostituito dalla storia del tuo locale.",
    ],
    menuNote: 'Menu di esempio: piatti e prezzi saranno quelli del tuo locale.',
  },
};

const clip = (text: string, max: number) =>
  text.length <= max ? text : `${text.slice(0, max - 1)}…`;

/** Builds data/content.<locale>.json. The hero photo is the demo one, so its alt text is reused. */
function buildContent(lead: Lead, locale: Locale, heroAlt: string): SiteContent {
  const copy = COPY[locale];
  const { name } = lead;
  const { city } = lead.address;
  return contentSchema.parse({
    tagline: copy.tagline(name, city),
    seoDescription: clip(copy.seo(name, city), 170),
    hero: { title: name, subtitle: copy.subtitle, imageAlt: heroAlt },
    about: { title: copy.aboutTitle, paragraphs: copy.about(name) },
  });
}

/**
 * Combines a lead with the demo data. Throws (with a readable zod message) if the result is not
 * a valid site, so a bad lead never reaches a build.
 */
export function buildClientFiles(
  lead: Lead,
  base: BaseData,
  options: { baseUrl?: string } = {},
): ClientFiles {
  const slug = slugify(lead.name);
  const warnings: string[] = [];
  const baseConfig = siteConfigSchema.parse(base.config);
  const defaultLocale = lead.locales[0];

  if (!lead.hours) {
    warnings.push(
      'No opening hours in the lead: the demo hours are shown. Check Google Maps before sending the preview.',
    );
  }
  if (!lead.whatsapp) {
    warnings.push('No WhatsApp number: the reservation form is used, with no WhatsApp option.');
  }
  if (lead.address.country === 'FR') {
    warnings.push(
      'A live French site needs legal notices (mentions légales) and a privacy page: add them before going live.',
    );
  }
  if (lead.brandColor) {
    const ratio = contrastRatio(lead.brandColor, '#FFFFFF');
    if (ratio < 4.5) {
      warnings.push(
        `Brand colour ${lead.brandColor} has a contrast of ${ratio.toFixed(1)}:1 with white text (4.5:1 is the minimum): choose a darker shade.`,
      );
    }
  }

  const config: SiteConfig = siteConfigSchema.parse({
    ...baseConfig,
    name: lead.name,
    type: lead.type,
    siteUrl: new URL(
      slug,
      `${(options.baseUrl ?? 'https://example.com').replace(/\/+$/, '')}/`,
    ).toString(),
    locales: lead.locales,
    defaultLocale,
    currency: lead.currency,
    timezone: lead.timezone,
    cuisine: lead.cuisine,
    logo: null,
    colors: lead.brandColor
      ? { ...baseConfig.colors, primary: lead.brandColor }
      : baseConfig.colors,
    contact: {
      phone: lead.phone,
      ...(lead.whatsapp ? { whatsapp: lead.whatsapp } : {}),
      email: lead.email,
      address: lead.address,
      ...(lead.geo ? { geo: lead.geo } : {}),
    },
    hours: lead.hours ?? baseConfig.hours,
    reservation: { ...baseConfig.reservation, mode: lead.whatsapp ? 'both' : 'form' },
    social: lead.social,
    legal: {},
    analytics: { vercel: false, plausibleDomain: null },
    features: { caseStudy: false },
    ...(lead.reviews ? { reviews: lead.reviews } : {}),
    preview: { enabled: true },
  });

  const baseMenu = menuStructureSchema.parse(base.menu);
  const heroAlts = base.heroAlt ?? {};

  const files: Record<string, unknown> = {
    'config.json': config,
    'menu.json': baseMenu,
    'case-study.json': base.caseStudy,
  };

  for (const locale of lead.locales) {
    files[`content.${locale}.json`] = buildContent(
      lead,
      locale,
      heroAlts[locale] ?? `${lead.name}`,
    );
    const demoMenu = base.menuTranslations[locale];
    if (!demoMenu)
      throw new Error(`The demo has no menu in "${locale}": cannot build that language.`);
    const translation = menuTranslationSchema.parse(demoMenu);
    files[`menu.${locale}.json`] = { ...translation, note: COPY[locale].menuNote };
  }

  return { slug, files, warnings };
}

/** Reads the demo data from a data/ folder (default: the project's own). */
export function loadBaseData(dataDir = path.join(process.cwd(), 'data')): BaseData {
  const read = (name: string): unknown =>
    JSON.parse(readFileSync(path.join(dataDir, name), 'utf8'));
  const menuTranslations: Partial<Record<Locale, unknown>> = {};
  const heroAlt: Partial<Record<Locale, string>> = {};
  for (const locale of SUPPORTED_LOCALES) {
    if (existsSync(path.join(dataDir, `menu.${locale}.json`))) {
      menuTranslations[locale] = read(`menu.${locale}.json`);
    }
    if (existsSync(path.join(dataDir, `content.${locale}.json`))) {
      const content = contentSchema.parse(read(`content.${locale}.json`));
      heroAlt[locale] = content.hero.imageAlt;
    }
  }
  return {
    config: read('config.json'),
    menu: read('menu.json'),
    caseStudy: read('case-study.json'),
    menuTranslations,
    heroAlt,
  };
}
