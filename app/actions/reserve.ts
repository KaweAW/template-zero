'use server';

import { getTranslations } from 'next-intl/server';
import { Resend } from 'resend';
import { siteConfig } from '@/lib/config';
import { formatBookingDate } from '@/lib/format';
import { getBookableSlots } from '@/lib/reservation';
import { createReservationSchema, type ReservationInput } from '@/lib/reservation-schema';
import type { Locale } from '@/types';

export type ReservationResult =
  | { ok: true }
  | {
      ok: false;
      /** Field name -> key in the "validation" messages. Absent for delivery problems. */
      fieldErrors?: Record<string, string>;
    };

const oneLine = (value: string) => value.replace(/[\r\n]+/g, ' ').trim();

async function compose(locale: Locale, data: ReservationInput) {
  const [t, tr] = await Promise.all([
    getTranslations({ locale, namespace: 'email' }),
    getTranslations({ locale, namespace: 'reservation' }),
  ]);
  const vars = {
    name: oneLine(data.name),
    guests: tr('guests', { count: data.partySize }),
    date: formatBookingDate(data.date, locale),
    time: data.time,
  };
  return { t, tr, vars };
}

/**
 * Validates a booking request again on the server (never trust the browser), checks it against
 * the opening hours, then emails the restaurant (and optionally the guest) through Resend.
 */
export async function submitReservation(input: unknown): Promise<ReservationResult> {
  const { reservation, hours, timezone, contact, name: venue, defaultLocale } = siteConfig;

  const parsed = createReservationSchema(reservation.maxPartySize).safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? 'form');
      fieldErrors[field] ??= issue.message;
    }
    return { ok: false, fieldErrors };
  }
  const data = parsed.data;

  // Honeypot filled in: a bot. Answer "success" so it learns nothing.
  if (data.website) return { ok: true };

  if (!siteConfig.locales.includes(data.locale)) {
    return { ok: false, fieldErrors: { form: 'dateInvalid' } };
  }

  const slots = getBookableSlots({ hours, timezone, reservation }, data.date);
  if (slots.length === 0) return { ok: false, fieldErrors: { date: 'dateInvalid' } };
  if (!slots.includes(data.time)) return { ok: false, fieldErrors: { time: 'timeRequired' } };

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESERVATION_FROM_EMAIL;
  const to = process.env.RESERVATION_TO_EMAIL || contact.email;

  if (!apiKey || !from) {
    // Dry-run is automatic in development and can be forced (e.g. for end-to-end tests that run
    // against a production build) with RESERVATION_DRY_RUN=true. Never enable it on a live site.
    if (process.env.NODE_ENV !== 'production' || process.env.RESERVATION_DRY_RUN === 'true') {
      console.info('[reservation:dry-run] RESEND_API_KEY is not set, nothing was emailed.', data);
      return { ok: true };
    }
    // Fail loudly: a silently dropped booking is the worst outcome for a restaurant.
    console.error('[reservation] RESEND_API_KEY / RESERVATION_FROM_EMAIL are not configured.');
    return { ok: false };
  }

  const resend = new Resend(apiKey);

  // 1. Email to the restaurant, in the restaurant's language.
  const owner = await compose(defaultLocale, data);
  const ownerText = [
    owner.t('ownerIntro'),
    '',
    `${owner.tr('name')}: ${data.name}`,
    `${owner.tr('phone')}: ${data.phone || '-'}`,
    `${owner.tr('email')}: ${data.email || '-'}`,
    `${owner.tr('date')}: ${owner.vars.date}`,
    `${owner.tr('time')}: ${data.time}`,
    `${owner.tr('partySize')}: ${owner.vars.guests}`,
    data.notes ? `${owner.tr('notes')}: ${data.notes}` : '',
    '',
    `Language: ${data.locale}`,
  ].join('\n');

  const sentToOwner = await resend.emails.send({
    from,
    to,
    replyTo: data.email || undefined,
    subject: oneLine(owner.t('ownerSubject', owner.vars)),
    text: ownerText,
  });
  if (sentToOwner.error) {
    console.error('[reservation] Resend rejected the owner email:', sentToOwner.error);
    return { ok: false };
  }

  // 2. Optional confirmation of receipt to the guest, in the guest's language.
  //    A failure here must not turn a successful request into an error.
  if (reservation.sendCustomerConfirmation && data.email) {
    try {
      const guest = await compose(data.locale, data);
      const result = await resend.emails.send({
        from,
        to: data.email,
        replyTo: contact.email,
        subject: oneLine(guest.t('customerSubject', { venue })),
        text: guest.t('customerBody', { ...guest.vars, phone: contact.phone, venue }),
      });
      if (result.error) console.error('[reservation] Guest confirmation failed:', result.error);
    } catch (error) {
      console.error('[reservation] Guest confirmation failed:', error);
    }
  }

  return { ok: true };
}
