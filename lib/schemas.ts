import { z } from 'zod';
import { ALLERGENS, BUSINESS_TYPES, DIET_TAGS, SUPPORTED_LOCALES } from './constants';

/**
 * Zod schemas for every file in data/. They run at build time (see lib/config.ts and
 * lib/content.ts), so a typo in a client's JSON fails the build with a readable message
 * instead of producing a broken site.
 */

const localeSchema = z.enum(SUPPORTED_LOCALES);
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a 6-digit hex colour such as #1E4636');
const hhmm = z
  .string()
  .regex(/^(?:(?:[01]\d|2[0-3]):[0-5]\d|24:00)$/, 'Use 24h HH:MM, for example 18:30');

const timeRange = z
  .object({ open: hhmm, close: hhmm })
  .refine((r) => r.open !== r.close, 'open and close must be different');

/** A closing time earlier than the opening time means "after midnight" (e.g. 18:00 -> 01:00). */
const hoursSchema = z.object({
  mon: z.array(timeRange),
  tue: z.array(timeRange),
  wed: z.array(timeRange),
  thu: z.array(timeRange),
  fri: z.array(timeRange),
  sat: z.array(timeRange),
  sun: z.array(timeRange),
});

export const siteConfigSchema = z
  .object({
    name: z.string().min(1),
    type: z.enum(BUSINESS_TYPES),
    siteUrl: z.url(),
    locales: z.array(localeSchema).min(1).max(6),
    defaultLocale: localeSchema,
    currency: z.string().length(3),
    timezone: z.string().min(1),
    cuisine: z.array(z.string()).min(1),
    priceRange: z.string().min(1),
    logo: z
      .object({
        src: z.string().min(1),
        width: z.number().positive(),
        height: z.number().positive(),
      })
      .nullable(),
    colors: z.object({
      primary: hex,
      accent: hex,
      background: hex,
      surface: hex,
      foreground: hex,
    }),
    images: z.object({ hero: z.string().min(1), og: z.string().min(1) }),
    contact: z.object({
      phone: z.string().min(5),
      whatsapp: z
        .string()
        .regex(/^\+\d{6,15}$/, 'Use international format, e.g. +4915112345678')
        .optional(),
      email: z.email(),
      address: z.object({
        street: z.string().min(1),
        postalCode: z.string().min(1),
        city: z.string().min(1),
        region: z.string().optional(),
        country: z.string().length(2),
      }),
      geo: z
        .object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
        .optional(),
    }),
    hours: hoursSchema,
    reservation: z.object({
      /** form = web form only, whatsapp = WhatsApp only, both = form with WhatsApp alternative */
      mode: z.enum(['form', 'whatsapp', 'both']),
      maxPartySize: z.number().int().min(1).max(50),
      advanceDays: z.number().int().min(1).max(365),
      slotMinutes: z.number().int().min(5).max(120),
      lastSlotBeforeClose: z.number().int().min(0).max(240),
      minNoticeMinutes: z.number().int().min(0).max(1440),
      sendCustomerConfirmation: z.boolean(),
    }),
    social: z
      .object({
        instagram: z.url().optional(),
        facebook: z.url().optional(),
        tiktok: z.url().optional(),
        tripadvisor: z.url().optional(),
        google: z.url().optional(),
      })
      .default({}),
    legal: z
      .object({
        /** Required for German, Austrian and Swiss business sites (Impressum / Datenschutz). */
        imprintUrl: z.string().optional(),
        privacyUrl: z.string().optional(),
      })
      .default({}),
    analytics: z.object({
      vercel: z.boolean(),
      plausibleDomain: z.string().nullable(),
    }),
    features: z.object({
      /** Sales demo page. Turn off for real client sites. */
      caseStudy: z.boolean(),
    }),
  })
  .refine((c) => c.locales.includes(c.defaultLocale), {
    path: ['defaultLocale'],
    message: 'defaultLocale must be one of the active locales',
  })
  .refine((c) => c.reservation.mode !== 'whatsapp' || Boolean(c.contact.whatsapp), {
    path: ['contact', 'whatsapp'],
    message: 'reservation.mode "whatsapp" needs a contact.whatsapp number',
  });

/** data/content.<locale>.json: client-specific copy. */
export const contentSchema = z.object({
  tagline: z.string().min(1),
  seoDescription: z.string().min(50).max(170),
  hero: z.object({
    title: z.string().min(1),
    subtitle: z.string().min(1),
    imageAlt: z.string().min(1),
  }),
  about: z.object({
    title: z.string().min(1),
    paragraphs: z.array(z.string().min(1)).min(1),
  }),
});

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase-kebab-case ids');

/** data/menu.json: structure, prices, diet tags, allergens and images (language-independent). */
export const menuStructureSchema = z.object({
  categories: z.array(
    z.object({
      id: slug,
      items: z.array(
        z.object({
          id: slug,
          price: z.number().nonnegative(),
          tags: z.array(z.enum(DIET_TAGS)),
          allergens: z.array(z.enum(ALLERGENS)),
          image: z.string().optional(),
          featured: z.boolean().optional(),
        }),
      ),
    }),
  ),
});

/** data/menu.<locale>.json: only the words. Prices never live here. */
export const menuTranslationSchema = z.object({
  note: z.string().optional(),
  categories: z.record(z.string(), z.string()),
  items: z.record(
    z.string(),
    z.object({ name: z.string().min(1), description: z.string().optional() }),
  ),
});

/** data/case-study.json: numbers shown on the sales demo page. */
export const caseStudySchema = z.object({
  /** While true, the page shows a clear "illustrative sample data" badge. */
  illustrative: z.boolean(),
  venue: z.string(),
  metrics: z.array(
    z.object({
      id: z.enum(['lighthouse', 'lcp', 'cls', 'menuReady']),
      before: z.number(),
      after: z.number(),
      unit: z.string(),
    }),
  ),
});
