import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { buttonVariants } from '@/components/ui/button';
import { siteConfig } from '@/lib/config';
import { getContent } from '@/lib/content';
import { getReserveAction } from '@/lib/cta';
import { getHoursLabels } from '@/lib/labels';
import { localizedPath } from '@/lib/links';
import type { Locale } from '@/types';
import { HoursStatus } from './HoursStatus';

const step = (i: number) => ({ '--i': i }) as React.CSSProperties;

/**
 * The first screen. The photo is the LCP element, so it is the only image with `priority`.
 * Text sits on a dark gradient so it stays readable on any photo a client sends us.
 */
export async function Hero({ locale }: { locale: Locale }) {
  const [content, t, hoursLabels, reserve] = await Promise.all([
    getContent(locale),
    getTranslations({ locale, namespace: 'home' }),
    getHoursLabels(locale),
    getReserveAction(locale),
  ]);

  const reserveClass = buttonVariants({ variant: 'accent', size: 'lg' });

  return (
    <section className="relative isolate flex min-h-[min(84svh,48rem)] items-end overflow-hidden bg-primary">
      <Image
        src={siteConfig.images.hero}
        alt={content.hero.imageAlt}
        fill
        priority
        quality={60}
        sizes="100vw"
        className="-z-20 object-cover"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/40 to-black/10"
      />

      <div className="mx-auto w-full max-w-6xl px-5 pt-32 pb-12 text-white md:pb-16">
        <div className="settle" style={step(0)}>
          <HoursStatus
            hours={siteConfig.hours}
            timezone={siteConfig.timezone}
            locale={locale}
            labels={hoursLabels}
          />
        </div>
        <h1 className="settle mt-5 max-w-[15ch] text-[clamp(3.25rem,11vw,8rem)]" style={step(1)}>
          {content.hero.title}
        </h1>
        <p className="settle mt-5 max-w-xl text-lg text-white/90 md:text-xl" style={step(2)}>
          {content.hero.subtitle}
        </p>
        <div className="settle mt-8 flex flex-wrap gap-3" style={step(3)}>
          {reserve.external ? (
            <a
              href={reserve.href}
              target="_blank"
              rel="noopener noreferrer"
              className={reserveClass}
            >
              {t('ctaReserve')}
            </a>
          ) : (
            <Link href={reserve.href} className={reserveClass}>
              {t('ctaReserve')}
            </Link>
          )}
          <Link
            href={localizedPath(locale, '/menu')}
            className={buttonVariants({ variant: 'outlineInverse', size: 'lg' })}
          >
            {t('ctaMenu')}
          </Link>
        </div>
      </div>
    </section>
  );
}
