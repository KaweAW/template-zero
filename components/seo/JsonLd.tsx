import { safeJsonLd } from '@/lib/utils';

export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      // Built from our own validated data; "<" is escaped by safeJsonLd.
      dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }}
    />
  );
}
