import { getTranslations } from 'next-intl/server';
import { siteConfig } from './config';
import { localizedPath } from './links';
import { whatsappLink } from './whatsapp';
import type { Locale } from '../types';

export interface ReserveAction {
  href: string;
  /** Opens in a new tab (WhatsApp). */
  external: boolean;
  label: string;
  shortLabel: string;
}

/**
 * The main "reserve" call to action, in one place. With reservation.mode = "whatsapp" every
 * reserve button becomes a WhatsApp deep link; otherwise it goes to the reservation page.
 */
export async function getReserveAction(locale: Locale): Promise<ReserveAction> {
  const t = await getTranslations({ locale, namespace: 'common' });
  const { reservation, contact, name } = siteConfig;

  if (reservation.mode === 'whatsapp' && contact.whatsapp) {
    return {
      href: whatsappLink(contact.whatsapp, t('whatsappPrefill', { name })),
      external: true,
      label: t('reserve'),
      shortLabel: t('whatsapp'),
    };
  }
  return {
    href: localizedPath(locale, '/reserve'),
    external: false,
    label: t('reserve'),
    shortLabel: t('reserveShort'),
  };
}
