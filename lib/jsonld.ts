import { DAY_KEYS } from './constants';
import { absoluteUrl, siteConfig } from './config';
import { localizedPath } from './links';
import type { DietTag, Locale, MenuView, SiteContent } from '../types';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DIET_URIS: Partial<Record<DietTag, string>> = {
  vegetarian: 'https://schema.org/VegetarianDiet',
  vegan: 'https://schema.org/VeganDiet',
  glutenFree: 'https://schema.org/GlutenFreeDiet',
  lactoseFree: 'https://schema.org/LowLactoseDiet',
};

/** Restaurant / BarOrPub / CafeOrCoffeeShop entity: what Google uses for the local knowledge panel. */
export function businessJsonLd(locale: Locale, content: SiteContent) {
  const c = siteConfig;
  const openingHoursSpecification = DAY_KEYS.flatMap((key, index) =>
    c.hours[key].map((range) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: DAY_NAMES[index],
      opens: range.open,
      closes: range.close === '24:00' ? '23:59' : range.close,
    })),
  );

  return {
    '@context': 'https://schema.org',
    '@type': c.type,
    '@id': absoluteUrl('/#business'),
    name: c.name,
    description: content.seoDescription,
    url: absoluteUrl(localizedPath(locale, '/')),
    image: absoluteUrl(c.images.hero),
    telephone: c.contact.phone,
    email: c.contact.email,
    priceRange: c.priceRange,
    servesCuisine: c.cuisine,
    address: {
      '@type': 'PostalAddress',
      streetAddress: c.contact.address.street,
      postalCode: c.contact.address.postalCode,
      addressLocality: c.contact.address.city,
      addressRegion: c.contact.address.region,
      addressCountry: c.contact.address.country,
    },
    geo: c.contact.geo && {
      '@type': 'GeoCoordinates',
      latitude: c.contact.geo.lat,
      longitude: c.contact.geo.lng,
    },
    openingHoursSpecification,
    hasMenu: absoluteUrl(localizedPath(locale, '/menu')),
    acceptsReservations:
      c.reservation.mode === 'whatsapp' ? true : absoluteUrl(localizedPath(locale, '/reserve')),
    sameAs: Object.values(c.social),
  };
}

/** schema.org Menu with sections, items, prices and dietary suitability. */
export function menuJsonLd(locale: Locale, menu: MenuView, title: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Menu',
    '@id': absoluteUrl(`${localizedPath(locale, '/menu')}#menu`),
    name: title,
    inLanguage: locale,
    url: absoluteUrl(localizedPath(locale, '/menu')),
    provider: { '@id': absoluteUrl('/#business') },
    hasMenuSection: menu.categories.map((category) => ({
      '@type': 'MenuSection',
      name: category.name,
      hasMenuItem: category.items.map((item) => ({
        '@type': 'MenuItem',
        name: item.name,
        description: item.description,
        offers: {
          '@type': 'Offer',
          price: item.price.toFixed(2),
          priceCurrency: siteConfig.currency,
        },
        suitableForDiet: item.tags.map((tag) => DIET_URIS[tag]).filter(Boolean),
      })),
    })),
  };
}
