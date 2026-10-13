import type { MetadataRoute } from 'next';
import { absoluteUrl, siteConfig } from '@/lib/config';

export default function robots(): MetadataRoute.Robots {
  if (siteConfig.preview?.enabled) return { rules: { userAgent: '*', disallow: '/' } };
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
