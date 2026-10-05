'use client';

import { useMemo, useState } from 'react';
import type { DietTag, MenuCategoryView } from '@/types';
import { MenuCategory } from './MenuCategory';
import { MenuFilters } from './MenuFilters';
import type { MenuLabels } from './MenuItem';

interface Props {
  categories: MenuCategoryView[];
  availableTags: DietTag[];
  locale: string;
  currency: string;
  labels: MenuLabels;
  note?: string;
}

/**
 * The interactive part of the menu page: diet filters and the sticky section navigation.
 * The full menu is rendered on the server, so it is readable and indexable without JavaScript.
 */
export function MenuBrowser({ categories, availableTags, locale, currency, labels, note }: Props) {
  const [active, setActive] = useState<DietTag[]>([]);

  const visible = useMemo(
    () =>
      categories
        .map((category) => ({
          ...category,
          items: category.items.filter((item) => active.every((tag) => item.tags.includes(tag))),
        }))
        .filter((category) => category.items.length > 0),
    [categories, active],
  );
  const count = visible.reduce((total, category) => total + category.items.length, 0);

  const toggle = (tag: DietTag) =>
    setActive((current) =>
      current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag],
    );

  return (
    <>
      <div className="mx-auto max-w-3xl px-5">
        <MenuFilters
          available={availableTags}
          active={active}
          labels={labels}
          onToggle={toggle}
          onClear={() => setActive([])}
        />
        {active.length > 0 ? (
          <p aria-live="polite" className="mt-3 text-sm text-muted">
            {labels.resultsByCount[count]}
          </p>
        ) : null}
      </div>

      <div className="sticky top-0 z-30 mt-8 border-b border-line bg-background/95 backdrop-blur">
        <nav aria-label={labels.sections} className="mx-auto max-w-3xl px-5">
          <ul className="flex [scrollbar-width:none] gap-6 overflow-x-auto">
            {visible.map((category) => (
              <li key={category.id} className="shrink-0">
                <a
                  href={`#cat-${category.id}`}
                  className="inline-flex h-12 items-center text-[0.9375rem] font-medium underline-offset-[6px] hover:underline"
                >
                  {category.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="mx-auto max-w-3xl px-5">
        {visible.map((category) => (
          <MenuCategory
            key={category.id}
            category={category}
            locale={locale}
            currency={currency}
            labels={labels}
          />
        ))}

        {count === 0 ? <p className="pt-14 text-lg text-muted">{labels.noResults}</p> : null}

        {note ? <p className="mt-16 border-t border-line pt-6 text-sm text-muted">{note}</p> : null}
      </div>
    </>
  );
}
