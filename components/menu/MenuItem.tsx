import Image from 'next/image';
import { formatPrice } from '@/lib/utils';
import type { Allergen, DietTag, MenuItemView } from '@/types';

export interface MenuLabels {
  sections: string;
  filters: string;
  allergens: string;
  noResults: string;
  clear: string;
  tags: Record<DietTag, { short: string; long: string }>;
  allergenNames: Record<Allergen, string>;
  /** Pre-formatted "N dishes shown", indexed by N (plural rules are applied on the server). */
  resultsByCount: string[];
}

interface Props {
  item: MenuItemView;
  locale: string;
  currency: string;
  labels: MenuLabels;
}

/** A small box with the short code ("V", "GF"). The full word is read out by screen readers. */
export function TagBadge({ tag, labels }: { tag: DietTag; labels: MenuLabels }) {
  const { short, long } = labels.tags[tag];
  return (
    <span
      title={long}
      className="inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-foreground/40 px-1 text-[0.6875rem] leading-none font-semibold text-foreground"
    >
      <span aria-hidden="true">{short}</span>
      <span className="sr-only">{long}</span>
    </span>
  );
}

/** One dish: name, dotted leader, price, description, diet badges and allergens. */
export function MenuItem({ item, locale, currency, labels }: Props) {
  return (
    <li className="flex gap-4">
      {item.image ? (
        <div className="relative size-20 shrink-0 overflow-hidden rounded-sm bg-surface sm:size-24">
          <Image src={item.image} alt="" fill quality={60} sizes="96px" className="object-cover" />
        </div>
      ) : null}

      <div className="min-w-0 flex-1">
        <div className="flex items-end gap-2">
          <h3 className="text-[1.375rem] leading-tight sm:text-2xl">{item.name}</h3>
          <span
            aria-hidden="true"
            className="mb-[0.3em] min-w-4 flex-1 border-b-2 border-dotted border-foreground/25"
          />
          <span className="pb-px font-medium tabular-nums">
            {formatPrice(item.price, locale, currency)}
          </span>
        </div>

        {item.description ? (
          <p className="mt-1 text-[0.9375rem] text-muted">{item.description}</p>
        ) : null}

        {item.tags.length > 0 || item.allergens.length > 0 ? (
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
            {item.tags.length > 0 ? (
              <span className="flex items-center gap-1.5">
                {item.tags.map((tag) => (
                  <TagBadge key={tag} tag={tag} labels={labels} />
                ))}
              </span>
            ) : null}
            {item.allergens.length > 0 ? (
              <span>
                {labels.allergens}: {item.allergens.map((a) => labels.allergenNames[a]).join(', ')}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </li>
  );
}
