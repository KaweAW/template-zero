import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import bundleAnalyzer from '@next/bundle-analyzer';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');
const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === 'true' });

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // `npm run analyze:js` turns this on to see which package each kilobyte of JS comes from.
  productionBrowserSourceMaps: process.env.SOURCEMAPS === 'true',
  images: {
    formats: ['image/avif', 'image/webp'],
    // Optimised images are cached for 31 days. Rename a photo when you replace it.
    minimumCacheTTL: 60 * 60 * 24 * 31,
    qualities: [60, 75],
    // Fewer breakpoints = shorter srcset attributes = smaller HTML.
    deviceSizes: [390, 640, 828, 1080, 1440, 1920],
    imageSizes: [96, 192, 384],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default withBundleAnalyzer(withNextIntl(nextConfig));
