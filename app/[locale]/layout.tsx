import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { notFound } from 'next/navigation';
import Script from 'next/script';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { StickyCTA } from '@/components/layout/StickyCTA';
import { getThemeVars } from '@/lib/color';
import { siteConfig } from '@/lib/config';
import { routing } from '@/i18n/routing';
import '../globals.css';

// Fonts are self-hosted files (see app/fonts): no request to Google, no build-time download.
const inter = localFont({
  src: '../fonts/inter-latin-wght-normal.woff2',
  variable: '--font-inter',
  weight: '100 900',
  display: 'swap',
  adjustFontFallback: 'Arial',
});

const instrument = localFont({
  src: '../fonts/instrument-serif-latin-400-normal.woff2',
  variable: '--font-instrument',
  weight: '400',
  display: 'swap',
  adjustFontFallback: 'Times New Roman',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.siteUrl),
  applicationName: siteConfig.name,
  title: { default: siteConfig.name, template: `%s | ${siteConfig.name}` },
  icons: { icon: '/favicon.svg' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: siteConfig.colors.primary,
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'common' });
  const { analytics } = siteConfig;

  // Only loaded when switched on in data/config.json AND the site is built on Vercel.
  // Elsewhere (local production build, other hosts) /_vercel/insights/script.js does not
  // exist: the request would 404 and log a console error.
  const VercelAnalytics =
    analytics.vercel && process.env.VERCEL === '1'
      ? (await import('@vercel/analytics/next')).Analytics
      : null;

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${instrument.variable}`}
      style={getThemeVars(siteConfig.colors) as React.CSSProperties}
    >
      <body className="flex min-h-svh flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:shadow-lg"
        >
          {t('skipToContent')}
        </a>
        <Header locale={locale} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer locale={locale} />
        <StickyCTA locale={locale} />
        {VercelAnalytics ? <VercelAnalytics /> : null}
        {analytics.plausibleDomain ? (
          <Script
            defer
            data-domain={analytics.plausibleDomain}
            src="https://plausible.io/js/script.js"
            strategy="afterInteractive"
          />
        ) : null}
      </body>
    </html>
  );
}
