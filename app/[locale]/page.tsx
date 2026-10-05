import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { FeaturedDishes } from '@/components/home/FeaturedDishes';
import { Hero } from '@/components/home/Hero';
import { HoursTable } from '@/components/home/HoursTable';
import { JsonLd } from '@/components/seo/JsonLd';
import { buttonVariants } from '@/components/ui/button';
import { routing } from '@/i18n/routing';
import { addressLine, directionsUrl, siteConfig } from '@/lib/config';
import { getContent, getMenu } from '@/lib/content';
import { getReserveAction } from '@/lib/cta';
import { businessJsonLd } from '@/lib/jsonld';
import { localizedPath } from '@/lib/links';
import { buildPageMetadata } from '@/lib/seo';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const content = await getContent(locale);
  return buildPageMetadata({
    locale,
    pathname: '/',
    absoluteTitle: `${siteConfig.name}: ${content.tagline}`,
    description: content.seoDescription,
  });
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const [content, menu, t, th, tc, reserve] = await Promise.all([
    getContent(locale),
    getMenu(locale),
    getTranslations({ locale, namespace: 'home' }),
    getTranslations({ locale, namespace: 'hours' }),
    getTranslations({ locale, namespace: 'contact' }),
    getReserveAction(locale),
  ]);

  const featured = menu.categories
    .flatMap((category) => category.items)
    .filter((item) => item.featured);
  const reserveClass = buttonVariants({ variant: 'inverse', size: 'lg' });

  return (
    <>
      <JsonLd data={businessJsonLd(locale, content)} />
      <Hero locale={locale} />

      <section className="mx-auto grid max-w-6xl gap-8 px-5 py-20 md:grid-cols-[1fr_1.1fr] md:gap-20 md:py-28">
        <h2 className="text-5xl md:text-7xl">{content.about.title}</h2>
        <div className="max-w-prose space-y-5 text-lg md:pt-3">
          {content.about.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </section>

      <FeaturedDishes locale={locale} items={featured} />

      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-5 py-16 md:flex-row md:items-center md:py-20">
          <div className="max-w-xl">
            <h2 className="text-5xl md:text-6xl">{t('reserveBandTitle')}</h2>
            <p className="mt-3 text-lg text-primary-foreground/85">{t('reserveBandText')}</p>
          </div>
          {reserve.external ? (
            <a
              href={reserve.href}
              target="_blank"
              rel="noopener noreferrer"
              className={reserveClass}
            >
              {reserve.label}
            </a>
          ) : (
            <Link href={reserve.href} className={reserveClass}>
              {reserve.label}
            </Link>
          )}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-12 px-5 py-20 md:grid-cols-2 md:gap-20 md:py-28">
        <div>
          <h2 className="text-5xl md:text-6xl">{t('visitTitle')}</h2>
          <address className="mt-6 text-lg not-italic">{addressLine()}</address>
          <p className="mt-4">
            <a
              href={directionsUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline decoration-2 underline-offset-[6px] hover:text-primary"
            >
              {tc('directions')}
            </a>
          </p>
          <p className="mt-2">
            <Link
              href={localizedPath(locale, '/contact')}
              className="font-medium underline decoration-2 underline-offset-[6px] hover:text-primary"
            >
              {tc('title')}
            </Link>
          </p>
        </div>
        <div>
          <h3 className="text-3xl md:text-4xl">{th('title')}</h3>
          <HoursTable locale={locale} closedLabel={th('closedAllDay')} className="mt-5" />
        </div>
      </section>
    </>
  );
}
