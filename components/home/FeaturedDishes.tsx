import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { siteConfig } from '@/lib/config';
import { localizedPath } from '@/lib/links';
import { cn, formatPrice } from '@/lib/utils';
import type { Locale, MenuItemView } from '@/types';

interface Props {
  locale: Locale;
  items: MenuItemView[];
}

/** Dishes flagged `featured` in data/menu.json. Renders nothing if there are none. */
export async function FeaturedDishes({ locale, items }: Props) {
  if (items.length === 0) return null;
  const t = await getTranslations({ locale, namespace: 'home' });

  return (
    <section className="mx-auto max-w-6xl px-5 py-20 md:py-28">
      <div className="mb-12 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div>
          <h2 className="text-5xl md:text-6xl">{t('featuredTitle')}</h2>
          <p className="mt-3 text-lg text-muted">{t('featuredIntro')}</p>
        </div>
        <Link
          href={localizedPath(locale, '/menu')}
          className="font-medium underline decoration-2 underline-offset-[6px] hover:text-primary"
        >
          {t('fullMenu')}
        </Link>
      </div>

      <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item, index) => (
          <li key={item.id} className={cn(index % 2 === 1 && 'lg:mt-14')}>
            {item.image ? (
              <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-surface">
                <Image
                  src={item.image}
                  alt=""
                  fill
                  quality={60}
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
            ) : null}
            <h3 className="mt-5 text-[1.75rem] leading-tight">{item.name}</h3>
            {item.description ? (
              <p className="mt-1.5 text-[0.9375rem] text-muted">{item.description}</p>
            ) : null}
            <p className="mt-2 font-medium tabular-nums">
              {formatPrice(item.price, locale, siteConfig.currency)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
