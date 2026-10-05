import type { TimeRange } from '../types';

/** Monday-first order used for opening-hours tables (values are Date#getDay() indexes). */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

/** Weekday name in the given language. 2024-01-07 was a Sunday, so dayIndex 0 = Sunday. */
export function weekdayName(locale: string, dayIndex: number, style: 'long' | 'short' = 'long') {
  return new Intl.DateTimeFormat(locale, { weekday: style, timeZone: 'UTC' }).format(
    new Date(Date.UTC(2024, 0, 7 + dayIndex)),
  );
}

/** "11:30–14:30, 17:30–22:30" */
export function formatRanges(ranges: TimeRange[]) {
  return ranges.map((r) => `${r.open}–${r.close}`).join(', ');
}

/**
 * Replaces {placeholders} in a message. The client components receive raw message strings
 * from the server and use this instead of a full ICU runtime, which keeps the bundle small.
 */
export function fill(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ''));
}

/** "Friday, 9 October" for a YYYY-MM-DD string, in the guest's language. */
export function formatBookingDate(date: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}
