import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as z from 'zod/mini';
import { submitReservation } from '../../app/actions/reserve';
import { siteConfig } from '../../lib/config';
import { addDays, getBookableSlots, getSlotsForDay, weekdayOf } from '../../lib/reservation';
import { createReservationSchema } from '../../lib/reservation-schema';
import { getZonedDateString } from '../../lib/hours';

const { hours, timezone, reservation } = siteConfig;
const ctx = { hours, timezone, reservation };

/** First date after today (venue time zone) that falls on the given weekday (0 = Sunday). */
function nextWeekday(day: number) {
  let date = addDays(getZonedDateString(timezone), 1);
  while (weekdayOf(date) !== day) date = addDays(date, 1);
  return date;
}

const valid = (overrides: Record<string, unknown> = {}) => ({
  name: 'Anna Rossi',
  phone: '+49 151 1234567',
  email: '',
  date: nextWeekday(3), // Wednesday: open
  time: '19:00',
  partySize: 2,
  notes: '',
  website: '',
  locale: 'de',
  ...overrides,
});

describe('slots', () => {
  it('generates slots inside the opening hours and stops before closing', () => {
    // Tuesday: 11:30-14:30 and 17:30-22:30, 30 min steps, last slot 60 min before closing.
    const slots = getSlotsForDay(hours, 2, reservation);
    assert.equal(slots[0], '11:30');
    assert.ok(slots.includes('13:30'));
    assert.ok(!slots.includes('14:00'));
    assert.ok(slots.includes('21:30'));
    assert.ok(!slots.includes('22:00'));
  });

  it('offers nothing on the closed day', () => {
    assert.deepEqual(getBookableSlots(ctx, nextWeekday(1)), []); // Monday
  });

  it('rejects dates in the past and beyond the booking window', () => {
    assert.deepEqual(getBookableSlots(ctx, '2020-01-01'), []);
    const farAway = addDays(getZonedDateString(timezone), reservation.advanceDays + 5);
    assert.deepEqual(getBookableSlots(ctx, farAway), []);
  });

  it('removes slots that start too soon when booking for today', () => {
    // Fix "now" to a Tuesday at 12:00 local (10:00Z in CEST).
    const now = new Date('2026-10-06T10:00:00Z');
    const slots = getBookableSlots(ctx, '2026-10-06', now);
    assert.ok(!slots.includes('12:30')); // inside the 60 min notice window
    assert.ok(slots.includes('13:00'));
    assert.ok(slots.includes('19:00'));
  });
});

describe('reservation schema', () => {
  const schema = createReservationSchema(reservation.maxPartySize);
  const check = (input: unknown) => z.safeParse(schema, input);

  it('accepts a complete request', () => {
    assert.equal(check(valid()).success, true);
  });

  it('needs a phone number or an email', () => {
    const result = check(valid({ phone: '', email: '' }));
    assert.equal(result.success, false);
    assert.equal(!result.success && result.error.issues[0].message, 'contactRequired');
    assert.equal(check(valid({ phone: '', email: 'anna@example.com' })).success, true);
  });

  it('rejects an invalid email, a huge party and a missing name', () => {
    assert.equal(check(valid({ email: 'not-an-email' })).success, false);
    assert.equal(check(valid({ partySize: reservation.maxPartySize + 1 })).success, false);
    assert.equal(check(valid({ name: ' ' })).success, false);
  });

  it('rejects NaN party size (what an empty select produces)', () => {
    assert.equal(check(valid({ partySize: Number.NaN })).success, false);
  });
});

describe('submitReservation (dry-run, no email key configured)', () => {
  it('accepts a valid request', async () => {
    delete process.env.RESEND_API_KEY;
    const result = await submitReservation(valid());
    assert.deepEqual(result, { ok: true });
  });

  it('answers "ok" to a bot that fills the honeypot, without validating further', async () => {
    const result = await submitReservation(valid({ website: 'http://spam.example' }));
    assert.deepEqual(result, { ok: true });
  });

  it('refuses a booking on the closed day', async () => {
    const result = await submitReservation(valid({ date: nextWeekday(1) }));
    assert.deepEqual(result, { ok: false, fieldErrors: { date: 'dateInvalid' } });
  });

  it('refuses a time that is not offered', async () => {
    const result = await submitReservation(valid({ time: '15:00' }));
    assert.deepEqual(result, { ok: false, fieldErrors: { time: 'timeRequired' } });
  });

  it('returns field errors for malformed input instead of throwing', async () => {
    const result = await submitReservation({ name: 1 });
    assert.equal(result.ok, false);
  });
});
