import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fromMinutes, getOpenStatus, toMinutes } from '../../lib/hours';
import type { Hours } from '../../types';

const TZ = 'Europe/Berlin';
const lunchAndDinner = [
  { open: '11:30', close: '14:30' },
  { open: '17:30', close: '22:30' },
];
const hours: Hours = {
  mon: [],
  tue: lunchAndDinner,
  wed: lunchAndDinner,
  thu: lunchAndDinner,
  fri: lunchAndDinner,
  sat: [{ open: '12:00', close: '23:00' }],
  sun: [{ open: '12:00', close: '21:30' }],
};

// 2026-10-06 is a Tuesday and Berlin is on CEST (UTC+2), so 10:00Z = 12:00 local.
const at = (iso: string) => new Date(iso);

describe('time helpers', () => {
  it('converts between "HH:MM" and minutes', () => {
    assert.equal(toMinutes('17:30'), 1050);
    assert.equal(fromMinutes(1050), '17:30');
    assert.equal(fromMinutes(25 * 60 + 30), '01:30');
  });
});

describe('getOpenStatus', () => {
  it('is open during lunch and reports the closing time', () => {
    const status = getOpenStatus(hours, TZ, at('2026-10-06T10:00:00Z'));
    assert.deepEqual(status, {
      state: 'open',
      closesAt: '14:30',
      minutesLeft: 150,
      closingSoon: false,
    });
  });

  it('flags "closing soon" in the last 30 minutes', () => {
    const status = getOpenStatus(hours, TZ, at('2026-10-06T12:15:00Z')); // 14:15 local
    assert.equal(status.state, 'open');
    assert.equal(status.state === 'open' && status.closingSoon, true);
  });

  it('is closed between lunch and dinner and names the next opening today', () => {
    const status = getOpenStatus(hours, TZ, at('2026-10-06T13:00:00Z')); // 15:00 local
    assert.deepEqual(status, {
      state: 'closed',
      next: { opensAt: '17:30', daysAhead: 0, dayIndex: 2 },
    });
  });

  it('after the last closing time points at tomorrow', () => {
    const status = getOpenStatus(hours, TZ, at('2026-10-06T21:00:00Z')); // 23:00 local
    assert.deepEqual(status, {
      state: 'closed',
      next: { opensAt: '11:30', daysAhead: 1, dayIndex: 3 },
    });
  });

  it('skips a closed day (Monday) and finds Tuesday', () => {
    const status = getOpenStatus(hours, TZ, at('2026-10-05T10:00:00Z'));
    assert.deepEqual(status, {
      state: 'closed',
      next: { opensAt: '11:30', daysAhead: 1, dayIndex: 2 },
    });
  });

  it('uses the venue time zone, not the server time zone', () => {
    // 22:00Z is already Wednesday 00:00 in Berlin.
    const status = getOpenStatus(hours, TZ, at('2026-10-06T22:00:00Z'));
    assert.equal(status.state, 'closed');
    assert.equal(status.state === 'closed' && status.next?.dayIndex, 3);
  });

  it('handles opening hours that run past midnight', () => {
    const bar: Hours = {
      ...hours,
      fri: [{ open: '18:00', close: '02:00' }],
      sat: [{ open: '18:00', close: '02:00' }],
    };
    // Saturday 00:30 local is still Friday's session.
    const late = getOpenStatus(bar, TZ, at('2026-10-09T22:30:00Z'));
    assert.deepEqual(late, {
      state: 'open',
      closesAt: '02:00',
      minutesLeft: 90,
      closingSoon: false,
    });
    // Friday 23:00 local is inside the same session.
    const evening = getOpenStatus(bar, TZ, at('2026-10-09T21:00:00Z'));
    assert.equal(evening.state, 'open');
    assert.equal(evening.state === 'open' && evening.closesAt, '02:00');
  });

  it('copes with the end of daylight saving time', () => {
    // 2026-10-25 02:30 happens twice in Berlin; the venue is open Sunday 12:00 either way.
    const status = getOpenStatus(hours, TZ, at('2026-10-25T11:30:00Z')); // 12:30 CET
    assert.equal(status.state, 'open');
  });
});
