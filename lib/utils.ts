import { clsx, type ClassValue } from 'clsx';

/**
 * Joins class names. Deliberately plain clsx (no tailwind-merge: it would add ~8 KB gzipped to
 * every page). Do not pass two conflicting utilities, e.g. both `p-2` and `p-4`; add a variant instead.
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** Currency formatting that is identical on the server and in the browser. */
export function formatPrice(value: number, locale: string, currency: string) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
}

/** Escapes "<" so JSON can be embedded safely inside a <script> tag. */
export function safeJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
