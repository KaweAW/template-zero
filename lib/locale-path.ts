import { pathnames } from '../i18n/pathnames';
import type { Locale } from '../types';

/**
 * Translates the current URL path into the same page in another language, using only the
 * plain data in i18n/pathnames.ts. Runs in the browser (language switcher), so it must stay
 * dependency-free.
 *
 *   switchLocalePath('/de/reservieren', 'de', 'it') -> "/it/prenota"
 */
export function switchLocalePath(pathname: string, from: Locale, to: Locale): string {
  const prefix = `/${from}`;
  const rest = pathname.startsWith(prefix) ? pathname.slice(prefix.length) || '/' : pathname;

  for (const value of Object.values(pathnames) as (string | Record<Locale, string>)[]) {
    const current = typeof value === 'string' ? value : value[from];
    if (current === rest) {
      const target = typeof value === 'string' ? value : value[to];
      return target === '/' ? `/${to}` : `/${to}${target}`;
    }
  }
  return `/${to}`;
}
