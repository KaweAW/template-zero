'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LANGUAGE_NAMES } from '@/lib/constants';
import { switchLocalePath } from '@/lib/locale-path';
import { cn } from '@/lib/utils';
import type { Locale } from '@/types';

interface Props {
  locale: Locale;
  locales: Locale[];
  label: string;
  className?: string;
}

/** Same page, other language. Plain links: works without JavaScript once the page is loaded. */
export function LanguageSwitcher({ locale, locales, label, className }: Props) {
  const pathname = usePathname();
  if (locales.length < 2) return null;

  return (
    <nav aria-label={label} className={className}>
      <ul className="flex items-center">
        {locales.map((target) => {
          const current = target === locale;
          return (
            <li key={target}>
              <Link
                href={switchLocalePath(pathname, locale, target)}
                hrefLang={target}
                lang={target}
                prefetch={false}
                aria-label={LANGUAGE_NAMES[target]}
                aria-current={current ? 'true' : undefined}
                className={cn(
                  'inline-flex h-11 min-w-9 items-center justify-center px-1.5 text-sm font-medium underline-offset-[6px]',
                  current ? 'underline decoration-2' : 'text-muted hover:text-foreground',
                )}
              >
                {target.toUpperCase()}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
