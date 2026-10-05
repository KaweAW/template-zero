import { defineRouting } from 'next-intl/routing';
import config from '../data/config.json';
import type { Locale } from '../types';
import { pathnames } from './pathnames';

/**
 * Active languages come straight from data/config.json, so enabling or disabling a
 * language never requires touching code. URL paths live in ./pathnames.ts.
 */
export const routing = defineRouting({
  locales: config.locales as Locale[],
  defaultLocale: config.defaultLocale as Locale,
  localePrefix: 'always',
  pathnames,
});
