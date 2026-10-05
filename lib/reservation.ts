import { DAY_KEYS } from './constants';
import { fromMinutes, getZonedDateString, getZonedNow, toMinutes } from './hours';
import type { Hours, ReservationSettings } from '../types';

/**
 * Bookable time slots, derived from the opening hours so a guest can never request a table
 * while the restaurant is closed. Used by the form (to build the time list) and by the
 * server action (to re-validate the request).
 */

export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateString(value: string) {
  if (!DATE_PATTERN.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** Weekday of a YYYY-MM-DD string (0 = Sunday), independent of the machine's time zone. */
export function weekdayOf(value: string) {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function addDays(value: string, days: number) {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

interface SlotEntry {
  time: string;
  /** Minutes since midnight of the opening day; can exceed 1440 after midnight. */
  absolute: number;
}

function getSlotEntries(
  hours: Hours,
  dayIndex: number,
  {
    slotMinutes,
    lastSlotBeforeClose,
  }: Pick<ReservationSettings, 'slotMinutes' | 'lastSlotBeforeClose'>,
): SlotEntry[] {
  const entries: SlotEntry[] = [];
  const seen = new Set<string>();
  for (const range of hours[DAY_KEYS[dayIndex]]) {
    const open = toMinutes(range.open);
    let close = toMinutes(range.close);
    if (close <= open) close += 1440;
    for (let t = open; t <= close - lastSlotBeforeClose; t += slotMinutes) {
      const time = fromMinutes(t);
      if (!seen.has(time)) {
        seen.add(time);
        entries.push({ time, absolute: t });
      }
    }
  }
  return entries;
}

/** Every slot of a weekday, ignoring dates (used for tests and documentation). */
export function getSlotsForDay(
  hours: Hours,
  dayIndex: number,
  settings: Pick<ReservationSettings, 'slotMinutes' | 'lastSlotBeforeClose'>,
) {
  return getSlotEntries(hours, dayIndex, settings).map((e) => e.time);
}

interface BookingContext {
  hours: Hours;
  timezone: string;
  reservation: ReservationSettings;
}

/**
 * Slots a guest may pick on a given date. Returns [] when the date is invalid, in the past,
 * too far ahead, or the venue is closed that day. For "today", slots that start sooner than
 * minNoticeMinutes from now are removed.
 */
export function getBookableSlots(ctx: BookingContext, date: string, now: Date = new Date()) {
  if (!isValidDateString(date)) return [];
  const today = getZonedDateString(ctx.timezone, now);
  if (date < today || date > addDays(today, ctx.reservation.advanceDays)) return [];

  const entries = getSlotEntries(ctx.hours, weekdayOf(date), ctx.reservation);
  if (date !== today) return entries.map((e) => e.time);

  const nowMinutes = getZonedNow(ctx.timezone, now).minutes;
  return entries
    .filter((e) => e.absolute >= nowMinutes + ctx.reservation.minNoticeMinutes)
    .map((e) => e.time);
}
