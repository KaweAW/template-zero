import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { siteConfig } from '@/lib/config';
import { getCaseStudy } from '@/lib/content';
import { buildPageMetadata } from '@/lib/seo';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'caseStudy' });
  // Sales material, not part of a client's public site: kept out of search results.
  return buildPageMetadata({
    locale,
    pathname: '/case-study',
    title: t('title'),
    description: t('intro'),
    noIndex: true,
  });
}

/**
 * Sales demo page: before/after comparison for a prospect. The figures come from
 * data/case-study.json. While `illustrative` is true the page says so, so sample numbers are
 * never presented as results of a real client.
 */
export default async function CaseStudyPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  if (!siteConfig.features.caseStudy) notFound();
  setRequestLocale(locale);

  const [t, study] = await Promise.all([
    getTranslations({ locale, namespace: 'caseStudy' }),
    getCaseStudy(),
  ]);
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const show = (value: number, unit: string) => `${number.format(value)}${unit ? ` ${unit}` : ''}`;

  return (
    <div className="mx-auto max-w-4xl px-5 pt-12 pb-8 md:pt-20">
      <h1 className="text-6xl md:text-8xl">{t('title')}</h1>
      <p className="mt-4 text-xl text-muted">{study.venue}</p>

      {study.illustrative ? (
        <div className="mt-8 rounded-md border border-accent bg-accent/10 p-5">
          <p className="font-medium">{t('badge')}</p>
          <p className="mt-1 text-[0.9375rem]">{t('badgeText')}</p>
        </div>
      ) : null}

      <p className="mt-10 max-w-prose text-lg">{t('intro')}</p>

      <table className="mt-12 w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-foreground text-sm text-muted">
            <th scope="col" className="py-3 pr-4 font-medium">
              <span className="sr-only">{t('title')}</span>
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              {t('before')}
            </th>
            <th scope="col" className="py-3 pl-4 text-right font-medium">
              {t('after')}
            </th>
          </tr>
        </thead>
        <tbody>
          {study.metrics.map((metric) => (
            <tr key={metric.id} className="border-b border-line align-baseline">
              <th scope="row" className="py-5 pr-4 text-base font-normal">
                {t(`metrics.${metric.id}`)}
              </th>
              <td className="px-4 py-5 text-right text-lg text-muted tabular-nums">
                {show(metric.before, metric.unit)}
              </td>
              <td className="py-5 pl-4 text-right font-display text-4xl tabular-nums">
                {show(metric.after, metric.unit)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="mt-20 text-4xl md:text-5xl">{t('changesTitle')}</h2>
      <ul className="mt-6 max-w-prose space-y-4 text-lg">
        <li>{t('changeMenu')}</li>
        <li>{t('changeReserve')}</li>
        <li>{t('changeQr')}</li>
      </ul>
    </div>
  );
}
