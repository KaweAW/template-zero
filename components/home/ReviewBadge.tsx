import { getTranslations } from 'next-intl/server';
import type { Locale, SiteConfig } from '@/types';

type Reviews = NonNullable<SiteConfig['reviews']>;

/** Google rating as numbers only. Never the text of a review (Google's terms forbid copying it). */
export async function ReviewBadge({ locale, reviews }: { locale: Locale; reviews: Reviews }) {
  const t = await getTranslations({ locale, namespace: 'home' });
  const label = t('reviewsLabel', {
    rating: new Intl.NumberFormat(locale, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(reviews.rating),
    count: reviews.count,
  });
  const content = (
    <>
      <span aria-hidden="true" className="text-white">
        ★
      </span>{' '}
      {label}
    </>
  );
  const className = 'inline-block text-sm text-white/90';
  return reviews.url ? (
    <a
      href={reviews.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`${className} underline-offset-4 hover:underline`}
    >
      {content}
    </a>
  ) : (
    <p className={className}>{content}</p>
  );
}
