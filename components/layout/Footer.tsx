import { getTranslations } from 'next-intl/server';
import { HoursTable } from '@/components/home/HoursTable';
import { FacebookIcon, InstagramIcon } from '@/components/ui/icons';
import { siteConfig } from '@/lib/config';
import { getContent } from '@/lib/content';
import type { Locale } from '@/types';

export async function Footer({ locale }: { locale: Locale }) {
  const [t, th, content] = await Promise.all([
    getTranslations({ locale, namespace: 'footer' }),
    getTranslations({ locale, namespace: 'hours' }),
    getContent(locale),
  ]);
  const { name, contact, social, legal } = siteConfig;
  const { address } = contact;
  const link = 'underline-offset-4 hover:underline';

  return (
    <footer className="mt-24 bg-foreground text-background">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 pt-16 pb-28 md:grid-cols-3 md:pb-14">
        <div>
          <p className="font-display text-4xl leading-none">{name}</p>
          <p className="mt-4 max-w-xs text-background/75">{content.tagline}</p>
        </div>

        <div>
          <h2 className="font-sans text-sm font-medium text-background/75">{t('hours')}</h2>
          <HoursTable locale={locale} closedLabel={th('closedAllDay')} className="mt-4" />
        </div>

        <div>
          <h2 className="font-sans text-sm font-medium text-background/75">{t('contact')}</h2>
          <address className="mt-4 space-y-1 text-[0.9375rem] not-italic">
            <p>{address.street}</p>
            <p>
              {address.postalCode} {address.city}
            </p>
            <p className="pt-3">
              <a href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`} className={link}>
                {contact.phone}
              </a>
            </p>
            <p>
              <a href={`mailto:${contact.email}`} className={link}>
                {contact.email}
              </a>
            </p>
          </address>
          {social.instagram || social.facebook ? (
            <ul className="mt-5 flex gap-4">
              {social.instagram ? (
                <li>
                  <a
                    href={social.instagram}
                    aria-label="Instagram"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <InstagramIcon />
                  </a>
                </li>
              ) : null}
              {social.facebook ? (
                <li>
                  <a
                    href={social.facebook}
                    aria-label="Facebook"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <FacebookIcon />
                  </a>
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
      </div>

      <div className="border-t border-background/15">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-5 text-sm text-background/75">
          <p>{t('copyright', { year: new Date().getFullYear(), name })}</p>
          <ul className="flex gap-5">
            {legal.imprintUrl ? (
              <li>
                <a href={legal.imprintUrl} className={link}>
                  {t('imprint')}
                </a>
              </li>
            ) : null}
            {legal.privacyUrl ? (
              <li>
                <a href={legal.privacyUrl} className={link}>
                  {t('privacy')}
                </a>
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </footer>
  );
}
