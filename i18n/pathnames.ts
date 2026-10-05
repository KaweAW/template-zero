import type { Locale } from '../types';

/**
 * Localised URL paths, as plain data (no imports) so both the router and the tiny
 * client-side language switcher can use them without pulling in any library code.
 *
 * The menu keeps one path in every language (/menu) on purpose: the table QR codes point
 * to it and it must never change.
 *
 * When you add a language to lib/constants.ts, add it to every entry below.
 */
export const pathnames = {
  '/': '/',
  '/menu': '/menu',
  '/reserve': { de: '/reservieren', en: '/reserve', it: '/prenota', fr: '/reserver' },
  '/contact': { de: '/kontakt', en: '/contact', it: '/contatti', fr: '/contact' },
  '/case-study': '/case-study',
} satisfies Record<string, string | Record<Locale, string>>;

export type AppPathname = keyof typeof pathnames;
