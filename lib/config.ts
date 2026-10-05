import { z } from 'zod';
import raw from '../data/config.json';
import { siteConfigSchema } from './schemas';
import type { SiteConfig } from '../types';

/**
 * The single source of truth for one client: data/config.json, validated at build time.
 * If the file is wrong the build fails with a message that names the exact field.
 */
function load(): SiteConfig {
  const result = siteConfigSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Invalid data/config.json:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

export const siteConfig = load();

/** Absolute URL for a path on this site, without a trailing slash problem. */
export function absoluteUrl(path = '/') {
  return new URL(path, siteConfig.siteUrl).toString();
}

/** "Musterstraße 12, 80331 München" */
export function addressLine() {
  const { street, postalCode, city } = siteConfig.contact.address;
  return `${street}, ${postalCode} ${city}`;
}

/** Opens turn-by-turn directions to the venue in Google Maps (or the Maps app on phones). */
export function directionsUrl() {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addressLine())}`;
}
