import * as z from 'zod/mini';
import { SUPPORTED_LOCALES } from './constants';
import { DATE_PATTERN } from './reservation';

/**
 * Shared by the form (client-side validation) and the server action (the real validation).
 * Error messages are keys into the "validation" namespace of messages/<locale>.json.
 *
 * Uses zod/mini, the tree-shakeable build of Zod: this file is shipped to the browser, and the
 * full Zod would add roughly 60 KB (raw) to the reservation page.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[\d\s().-]{6,}$/;

export function createReservationSchema(maxPartySize: number) {
  return z
    .object({
      name: z
        .string()
        .check(z.trim(), z.minLength(2, 'nameRequired'), z.maxLength(80, 'nameTooLong')),
      phone: z.string().check(
        z.trim(),
        z.maxLength(30, 'phoneInvalid'),
        z.refine((v) => v === '' || PHONE_PATTERN.test(v), 'phoneInvalid'),
      ),
      email: z.string().check(
        z.trim(),
        z.maxLength(120, 'emailInvalid'),
        z.refine((v) => v === '' || EMAIL_PATTERN.test(v), 'emailInvalid'),
      ),
      date: z.string().check(z.regex(DATE_PATTERN, 'dateRequired')),
      time: z.string().check(z.regex(/^\d{2}:\d{2}$/, 'timeRequired')),
      partySize: z
        .number('partySizeInvalid')
        .check(
          z.int('partySizeInvalid'),
          z.gte(1, 'partySizeInvalid'),
          z.lte(maxPartySize, 'partySizeInvalid'),
        ),
      notes: z.string().check(z.trim(), z.maxLength(500, 'notesTooLong')),
      /** Honeypot: hidden from people, filled in by bots. Must stay empty. */
      website: z.string().check(z.maxLength(200)),
      locale: z.enum(SUPPORTED_LOCALES),
    })
    .check(
      z.refine((data) => Boolean(data.phone || data.email), {
        path: ['phone'],
        error: 'contactRequired',
      }),
    );
}

export type ReservationInput = z.infer<ReturnType<typeof createReservationSchema>>;

export const VALIDATION_KEYS = [
  'nameRequired',
  'nameTooLong',
  'phoneInvalid',
  'emailInvalid',
  'contactRequired',
  'dateRequired',
  'dateInvalid',
  'timeRequired',
  'partySizeInvalid',
  'notesTooLong',
] as const;
