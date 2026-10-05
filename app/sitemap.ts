import type { MetadataRoute } from 'next';
import type { AppPathname } from '@/i18n/pathnames';
import { absoluteUrl, siteConfig } from '@/lib/config';
import { localizedPath } from '@/lib/links';

// The case-study page is sales material and stays out of the sitemap on purpose.
const PAGES: { path: AppPathname; changeFrequency: 'weekly' | 'monthly'; priority: number }[] = [
  { path: '/', changeFrequency: 'monthly', priority: 1 },
  { path: '/menu', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/reserve', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/contact', changeFrequency: 'monthly', priority: 0.6 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.flatMap(({ path, changeFrequency, priority }) =>
    siteConfig.locales.map((locale) => ({
      url: absoluteUrl(localizedPath(locale, path)),
      changeFrequency,
      priority,
      alternates: {
        languages: Object.fromEntries(
          siteConfig.locales.map((l) => [l, absoluteUrl(localizedPath(l, path))]),
        ),
      },
    })),
  );
}
