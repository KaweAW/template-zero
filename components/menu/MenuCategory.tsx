import type { MenuCategoryView } from '@/types';
import { MenuItem, type MenuLabels } from './MenuItem';

interface Props {
  category: MenuCategoryView;
  locale: string;
  currency: string;
  labels: MenuLabels;
}

export function MenuCategory({ category, locale, currency, labels }: Props) {
  return (
    <section
      id={`cat-${category.id}`}
      aria-labelledby={`cat-${category.id}-title`}
      className="pt-14"
    >
      <h2
        id={`cat-${category.id}-title`}
        className="border-b border-foreground pb-3 text-5xl md:text-6xl"
      >
        {category.name}
      </h2>
      <ul className="mt-8 space-y-8">
        {category.items.map((item) => (
          <MenuItem key={item.id} item={item} locale={locale} currency={currency} labels={labels} />
        ))}
      </ul>
    </section>
  );
}
