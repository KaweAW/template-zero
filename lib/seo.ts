import type { Metadata } from 'next';
import type { AppPathname } from '../i18n/pathnames';
import { absoluteUrl, siteConfig } from './config';
import { localizedPath } from './links';
import type { Locale } from '../types';

const OG_LOCALES: Record<Locale, string> = {
  de: 'de_DE',
  en: 'en_GB',
  it: 'it_IT',
  fr: 'fr_FR',
};

/** Canonical URL plus hreflang alternates for every active language. */
export function buildAlternates(locale: Locale, pathname: AppPathname): Metadata['alternates'] {
  const languages: Record<string, string> = {};
  for (const l of siteConfig.locales) {
    languages[l] = absoluteUrl(localizedPath(l, pathname));
  }
  languages['x-default'] = absoluteUrl(localizedPath(siteConfig.defaultLocale, pathname));
  return { canonical: absoluteUrl(localizedPath(locale, pathname)), languages };
}

interface PageMetadataInput {
  locale: Locale;
  pathname: AppPathname;
  /** Omit on the homepage to use the site-wide default title. */
  title?: string;
  /** Replaces the title template entirely (used on the homepage). */
  absoluteTitle?: string;
  description: string;
  noIndex?: boolean;
}

export function buildPageMetadata({
  locale,
  pathname,
  title,
  absoluteTitle,
  description,
  noIndex,
}: PageMetadataInput): Metadata {
  const url = absoluteUrl(localizedPath(locale, pathname));
  const shownTitle = absoluteTitle ?? (title ? `${title} | ${siteConfig.name}` : siteConfig.name);
  const image = {
    url: absoluteUrl(siteConfig.images.og),
    width: 1200,
    height: 630,
    alt: siteConfig.name,
  };

  return {
    title: absoluteTitle ? { absolute: absoluteTitle } : title,
    description,
    alternates: buildAlternates(locale, pathname),
    openGraph: {
      type: 'website',
      url,
      siteName: siteConfig.name,
      title: shownTitle,
      description,
      locale: OG_LOCALES[locale],
      alternateLocale: siteConfig.locales.filter((l) => l !== locale).map((l) => OG_LOCALES[l]),
      images: [image],
    },
    twitter: { card: 'summary_large_image', title: shownTitle, description, images: [image.url] },
    robots: noIndex ? { index: false, follow: false } : undefined,
  };
}
