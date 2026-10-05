import { pathnames, type AppPathname } from '../i18n/pathnames';
import type { Locale } from '../types';

/**
 * Localised path for a route, e.g. localizedPath('de', '/reserve') -> "/de/reservieren".
 *
 * Built from the plain data in i18n/pathnames.ts instead of next-intl's navigation helpers:
 * importing those from a server component drags next-intl's client code into every page.
 */
export function localizedPath(locale: Locale, href: AppPathname): string {
  const entry: string | Record<Locale, string> = pathnames[href];
  const path = typeof entry === 'string' ? entry : entry[locale];
  return path === '/' ? `/${locale}` : `/${locale}${path}`;
}
