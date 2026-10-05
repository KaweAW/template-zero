import { DAY_KEYS } from './constants';
import type { Hours } from '../types';

/**
 * Opening-hours logic. Pure functions (no React, no globals) so they can be unit-tested
 * and reused by the live status badge, the reservation slots and the JSON-LD.
 */

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** Minutes since midnight -> "HH:MM". Values over 24h wrap around (25:30 -> 01:30). */
export function fromMinutes(total: number) {
  const m = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** Current weekday (0 = Sunday) and minutes since midnight in the venue's time zone. */
export function getZonedNow(timezone: string, now: Date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return {
    dayIndex: WEEKDAY_SHORT.indexOf(get('weekday')),
    minutes: (Number(get('hour')) % 24) * 60 + Number(get('minute')),
  };
}

/** Today's date in the venue's time zone as YYYY-MM-DD. */
export function getZonedDateString(timezone: string, now: Date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export type OpenStatus =
  | { state: 'open'; closesAt: string; minutesLeft: number; closingSoon: boolean }
  | { state: 'closed'; next: { opensAt: string; daysAhead: number; dayIndex: number } | null };

export function getOpenStatus(
  hours: Hours,
  timezone: string,
  now: Date = new Date(),
  closingSoonMinutes = 30,
): OpenStatus {
  const { dayIndex, minutes } = getZonedNow(timezone, now);
  const today = hours[DAY_KEYS[dayIndex]];
  const yesterday = hours[DAY_KEYS[(dayIndex + 6) % 7]];

  const open = (closeMinutes: number, minutesLeft: number): OpenStatus => ({
    state: 'open',
    closesAt: fromMinutes(closeMinutes),
    minutesLeft,
    closingSoon: minutesLeft <= closingSoonMinutes,
  });

  // Intervals that started yesterday and run past midnight.
  for (const r of yesterday) {
    const o = toMinutes(r.open);
    const c = toMinutes(r.close);
    if (c < o && minutes < c) return open(c, c - minutes);
  }

  for (const r of today) {
    const o = toMinutes(r.open);
    const c = toMinutes(r.close);
    if (c > o) {
      if (minutes >= o && minutes < c) return open(c, c - minutes);
    } else if (minutes >= o) {
      return open(c, c + 1440 - minutes);
    }
  }

  // Closed: find the next opening within the coming week.
  for (let offset = 0; offset <= 7; offset++) {
    const d = (dayIndex + offset) % 7;
    const starts = hours[DAY_KEYS[d]].map((r) => toMinutes(r.open)).sort((a, b) => a - b);
    const next = offset === 0 ? starts.find((s) => s > minutes) : starts[0];
    if (next !== undefined) {
      return {
        state: 'closed',
        next: { opensAt: fromMinutes(next), daysAhead: offset, dayIndex: d },
      };
    }
  }
  return { state: 'closed', next: null };
}
