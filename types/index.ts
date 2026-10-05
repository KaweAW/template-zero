import type { z } from 'zod';
import type {
  caseStudySchema,
  contentSchema,
  menuStructureSchema,
  menuTranslationSchema,
  siteConfigSchema,
} from '@/lib/schemas';
import type {
  ALLERGENS,
  BUSINESS_TYPES,
  DAY_KEYS,
  DIET_TAGS,
  SUPPORTED_LOCALES,
} from '@/lib/constants';

export type Locale = (typeof SUPPORTED_LOCALES)[number];
export type DayKey = (typeof DAY_KEYS)[number];
export type Allergen = (typeof ALLERGENS)[number];
export type DietTag = (typeof DIET_TAGS)[number];
export type BusinessType = (typeof BUSINESS_TYPES)[number];

export type SiteConfig = z.infer<typeof siteConfigSchema>;
export type Hours = SiteConfig['hours'];
export type TimeRange = Hours['mon'][number];
export type ReservationSettings = SiteConfig['reservation'];
export type SiteContent = z.infer<typeof contentSchema>;
export type MenuStructure = z.infer<typeof menuStructureSchema>;
export type MenuTranslation = z.infer<typeof menuTranslationSchema>;
export type CaseStudy = z.infer<typeof caseStudySchema>;

/** A menu item after merging structure (menu.json) with words (menu.<locale>.json). */
export interface MenuItemView {
  id: string;
  name: string;
  description?: string;
  price: number;
  tags: DietTag[];
  allergens: Allergen[];
  image?: string;
  featured?: boolean;
}

export interface MenuCategoryView {
  id: string;
  name: string;
  items: MenuItemView[];
}

export interface MenuView {
  categories: MenuCategoryView[];
  note?: string;
}
