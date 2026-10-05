import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ReservationForm, type ReservationLabels } from '@/components/forms/ReservationForm';
import { buttonVariants } from '@/components/ui/button';
import { MessageIcon, PhoneIcon } from '@/components/ui/icons';
import { routing } from '@/i18n/routing';
import { siteConfig } from '@/lib/config';
import { getReserveAction } from '@/lib/cta';
import { VALIDATION_KEYS } from '@/lib/reservation-schema';
import { buildPageMetadata } from '@/lib/seo';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'seo' });
  return buildPageMetadata({
    locale,
    pathname: '/reserve',
    title: t('reserveTitle'),
    description: t('reserveDescription', { name: siteConfig.name }),
  });
}

export default async function ReservePage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const [t, v, tc, reserve] = await Promise.all([
    getTranslations({ locale, namespace: 'reservation' }),
    getTranslations({ locale, namespace: 'validation' }),
    getTranslations({ locale, namespace: 'common' }),
    getReserveAction(locale),
  ]);
  const { reservation, contact, name, hours, timezone } = siteConfig;
  const whatsappOnly = reservation.mode === 'whatsapp' && Boolean(contact.whatsapp);

  const labels: ReservationLabels = {
    name: t('name'),
    phone: t('phone'),
    email: t('email'),
    contactHint: t('contactHint'),
    date: t('date'),
    time: t('time'),
    pickDateFirst: t('pickDateFirst'),
    selectTime: t('selectTime'),
    partySize: t('partySize'),
    notes: t('notes'),
    notesHint: t('notesHint'),
    closedThatDay: t('closedThatDay'),
    noSlots: t('noSlots'),
    largeGroup: t('largeGroup', { max: reservation.maxPartySize, phone: contact.phone }),
    submit: t('submit'),
    submitting: t('submitting'),
    successTitle: t('successTitle'),
    successBody: t.raw('successBody') as string,
    newRequest: t('newRequest'),
    errorTitle: t('errorTitle'),
    errorBody: t('errorBody'),
    whatsappCta: t('whatsappCta'),
    whatsappMessage: t.raw('whatsappMessage') as string,
    whatsappFallback: tc.raw('whatsappPrefill') as string,
    guestLabels: Array.from({ length: reservation.maxPartySize + 1 }, (_, count) =>
      t('guests', { count }),
    ),
    validation: Object.fromEntries(
      VALIDATION_KEYS.map((key) => [key, v(key)]),
    ) as ReservationLabels['validation'],
  };

  return (
    <div className="mx-auto max-w-3xl px-5 pt-12 pb-8 md:pt-20">
      <h1 className="text-6xl md:text-8xl">{t('title')}</h1>
      <p className="mt-6 max-w-prose text-lg text-muted">{t('intro')}</p>

      <div className="mt-12">
        {whatsappOnly ? (
          <div className="flex flex-wrap gap-3">
            <a
              href={reserve.href}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: 'primary', size: 'lg' })}
            >
              <MessageIcon />
              {t('whatsappCta')}
            </a>
            <a
              href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`}
              className={buttonVariants({ variant: 'outline', size: 'lg' })}
            >
              <PhoneIcon />
              {contact.phone}
            </a>
          </div>
        ) : (
          <ReservationForm
            locale={locale}
            venueName={name}
            hours={hours}
            timezone={timezone}
            reservation={reservation}
            whatsapp={reservation.mode === 'both' ? contact.whatsapp : undefined}
            labels={labels}
          />
        )}
      </div>
    </div>
  );
}
