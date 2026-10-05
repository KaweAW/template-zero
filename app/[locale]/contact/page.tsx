import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { MapEmbed } from '@/components/contact/MapEmbed';
import { HoursTable } from '@/components/home/HoursTable';
import { buttonVariants } from '@/components/ui/button';
import {
  FacebookIcon,
  InstagramIcon,
  MailIcon,
  MapPinIcon,
  MessageIcon,
  PhoneIcon,
} from '@/components/ui/icons';
import { routing } from '@/i18n/routing';
import { addressLine, directionsUrl, siteConfig } from '@/lib/config';
import { buildPageMetadata } from '@/lib/seo';
import { whatsappLink } from '@/lib/whatsapp';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'seo' });
  return buildPageMetadata({
    locale,
    pathname: '/contact',
    title: t('contactTitle'),
    description: t('contactDescription', { name: siteConfig.name }),
  });
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const [t, th, tc] = await Promise.all([
    getTranslations({ locale, namespace: 'contact' }),
    getTranslations({ locale, namespace: 'hours' }),
    getTranslations({ locale, namespace: 'common' }),
  ]);
  const { contact, social, name } = siteConfig;
  const { geo } = contact;
  const link = 'inline-flex items-center gap-2 underline-offset-4 hover:underline';

  return (
    <div className="mx-auto max-w-6xl px-5 pt-12 pb-8 md:pt-20">
      <h1 className="text-6xl md:text-8xl">{t('title')}</h1>
      <p className="mt-6 max-w-prose text-lg text-muted">{t('intro')}</p>

      <div className="mt-14 grid gap-14 md:grid-cols-2 md:gap-20">
        <div className="space-y-10">
          <section>
            <h2 className="text-3xl md:text-4xl">{t('address')}</h2>
            <address className="mt-3 text-lg not-italic">{addressLine()}</address>
            <p className="mt-3">
              <a href={directionsUrl()} target="_blank" rel="noopener noreferrer" className={link}>
                <MapPinIcon />
                {t('directions')}
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-3xl md:text-4xl">{t('phone')}</h2>
            <ul className="mt-3 space-y-3 text-lg">
              <li>
                <a href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`} className={link}>
                  <PhoneIcon />
                  {contact.phone}
                </a>
              </li>
              <li>
                <a href={`mailto:${contact.email}`} className={link}>
                  <MailIcon />
                  {contact.email}
                </a>
              </li>
            </ul>
            {contact.whatsapp ? (
              <a
                href={whatsappLink(contact.whatsapp, tc('whatsappPrefill', { name }))}
                target="_blank"
                rel="noopener noreferrer"
                className={`${buttonVariants({ variant: 'outline' })} mt-5`}
              >
                <MessageIcon />
                {t('whatsappCta')}
              </a>
            ) : null}
          </section>

          <section>
            <h2 className="text-3xl md:text-4xl">{t('hours')}</h2>
            <HoursTable locale={locale} closedLabel={th('closedAllDay')} className="mt-4" />
          </section>

          {social.instagram || social.facebook ? (
            <section>
              <h2 className="text-3xl md:text-4xl">{t('follow')}</h2>
              <ul className="mt-4 flex gap-5">
                {social.instagram ? (
                  <li>
                    <a
                      href={social.instagram}
                      aria-label="Instagram"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <InstagramIcon width={26} height={26} />
                    </a>
                  </li>
                ) : null}
                {social.facebook ? (
                  <li>
                    <a
                      href={social.facebook}
                      aria-label="Facebook"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <FacebookIcon width={26} height={26} />
                    </a>
                  </li>
                ) : null}
              </ul>
            </section>
          ) : null}
        </div>

        <div>
          <h2 className="sr-only">{t('map')}</h2>
          <MapEmbed
            query={geo ? `${geo.lat},${geo.lng}` : addressLine()}
            title={`${t('map')}: ${name}`}
            loadLabel={t('loadMap')}
            notice={t('mapNotice')}
          />
        </div>
      </div>
    </div>
  );
}
