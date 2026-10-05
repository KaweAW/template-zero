import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { JsonLd } from '@/components/seo/JsonLd';
import { MenuBrowser } from '@/components/menu/MenuBrowser';
import type { MenuLabels } from '@/components/menu/MenuItem';
import { routing } from '@/i18n/routing';
import { ALLERGENS, DIET_TAGS } from '@/lib/constants';
import { siteConfig } from '@/lib/config';
import { getMenu } from '@/lib/content';
import { menuJsonLd } from '@/lib/jsonld';
import { buildPageMetadata } from '@/lib/seo';
import type { Allergen, DietTag } from '@/types';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'seo' });
  return buildPageMetadata({
    locale,
    pathname: '/menu',
    title: t('menuTitle'),
    description: t('menuDescription', { name: siteConfig.name }),
  });
}

/** This is the page the table QR codes open: keep it fast, keep the URL stable. */
export default async function MenuPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const [menu, t] = await Promise.all([
    getMenu(locale),
    getTranslations({ locale, namespace: 'menu' }),
  ]);

  const allItems = menu.categories.flatMap((category) => category.items);
  const availableTags = DIET_TAGS.filter((tag) => allItems.some((item) => item.tags.includes(tag)));

  const labels: MenuLabels = {
    sections: t('sections'),
    filters: t('filters.label'),
    allergens: t('allergens'),
    noResults: t('noResults'),
    clear: t('filters.clear'),
    tags: Object.fromEntries(
      DIET_TAGS.map((tag) => [tag, { short: t(`tagsShort.${tag}`), long: t(`filters.${tag}`) }]),
    ) as Record<DietTag, { short: string; long: string }>,
    allergenNames: Object.fromEntries(
      ALLERGENS.map((allergen) => [allergen, t(`allergenNames.${allergen}`)]),
    ) as Record<Allergen, string>,
    resultsByCount: Array.from({ length: allItems.length + 1 }, (_, count) =>
      t('results', { count }),
    ),
  };

  return (
    <>
      <JsonLd data={menuJsonLd(locale, menu, t('title'))} />
      <div className="mx-auto max-w-3xl px-5 pt-12 pb-8 md:pt-20">
        <h1 className="text-6xl md:text-8xl">{t('title')}</h1>
      </div>
      <MenuBrowser
        categories={menu.categories}
        availableTags={availableTags}
        locale={locale}
        currency={siteConfig.currency}
        labels={labels}
        note={menu.note}
      />
    </>
  );
}
