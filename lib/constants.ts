/**
 * Fixed vocabularies shared by the schemas, the UI and the validation script.
 * Adding a new language = add its code here + messages/<code>.json + data/*.<code>.json
 * (see README, "Add a language").
 */

export const SUPPORTED_LOCALES = ['de', 'en', 'it', 'fr'] as const;

/** Each language written in itself, for the language switcher. */
export const LANGUAGE_NAMES: Record<(typeof SUPPORTED_LOCALES)[number], string> = {
  de: 'Deutsch',
  en: 'English',
  it: 'Italiano',
  fr: 'Français',
};

/** Index matches Date#getDay(): 0 = Sunday. */
export const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

/** The 14 allergens that must be declared in the EU (Regulation 1169/2011). */
export const ALLERGENS = [
  'gluten',
  'crustaceans',
  'eggs',
  'fish',
  'peanuts',
  'soy',
  'milk',
  'nuts',
  'celery',
  'mustard',
  'sesame',
  'sulphites',
  'lupin',
  'molluscs',
] as const;

export const DIET_TAGS = ['vegetarian', 'vegan', 'glutenFree', 'lactoseFree', 'spicy'] as const;

/** schema.org types used for the JSON-LD business entity. */
export const BUSINESS_TYPES = ['Restaurant', 'BarOrPub', 'CafeOrCoffeeShop'] as const;
