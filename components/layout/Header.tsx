import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { siteConfig } from '@/lib/config';
import { getReserveAction } from '@/lib/cta';
import { localizedPath } from '@/lib/links';
import type { Locale } from '@/types';
import { LanguageSwitcher } from './LanguageSwitcher';

export async function Header({ locale }: { locale: Locale }) {
  const [t, tl, reserve] = await Promise.all([
    getTranslations({ locale, namespace: 'nav' }),
    getTranslations({ locale, namespace: 'languageSwitcher' }),
    getReserveAction(locale),
  ]);
  const { name, logo } = siteConfig;

  const navLink = 'underline-offset-[6px] hover:underline decoration-2';

  return (
    <header className="border-b border-line">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
        <Link href={localizedPath(locale, '/')} className="flex items-center" aria-label={name}>
          {logo ? (
            logo.src.endsWith('.svg') ? (
              // SVG logos need no optimisation, a plain <img> is the lightest option.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logo.src}
                width={logo.width}
                height={logo.height}
                alt={name}
                className="h-9 w-auto"
              />
            ) : (
              <Image
                src={logo.src}
                width={logo.width}
                height={logo.height}
                alt={name}
                priority
                className="h-9 w-auto"
              />
            )
          ) : (
            <span className="font-display text-[1.75rem] leading-none tracking-tight">{name}</span>
          )}
        </Link>

        <div className="flex items-center gap-6">
          <nav
            aria-label={t('main')}
            className="hidden items-center gap-7 text-[0.9375rem] md:flex"
          >
            <Link href={localizedPath(locale, '/menu')} className={navLink}>
              {t('menu')}
            </Link>
            {reserve.external ? (
              <a href={reserve.href} target="_blank" rel="noopener noreferrer" className={navLink}>
                {t('reserve')}
              </a>
            ) : (
              <Link href={reserve.href} className={navLink}>
                {t('reserve')}
              </Link>
            )}
            <Link href={localizedPath(locale, '/contact')} className={navLink}>
              {t('contact')}
            </Link>
          </nav>
          <LanguageSwitcher
            locale={locale}
            locales={siteConfig.locales}
            label={tl('label')}
            className="-mr-1.5"
          />
        </div>
      </div>
    </header>
  );
}
