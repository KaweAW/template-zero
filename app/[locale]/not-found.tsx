import Link from 'next/link';
import { hasLocale } from 'next-intl';
import { getLocale } from 'next-intl/server';
import { buttonVariants } from '@/components/ui/button';
import { routing } from '@/i18n/routing';
import { localizedPath } from '@/lib/links';
import errors from '@/messages/errors.json';

export default async function NotFound() {
  const requested = await getLocale();
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const t = errors[locale];

  return (
    <div className="mx-auto max-w-3xl px-5 py-24 md:py-36">
      <h1 className="text-6xl md:text-8xl">{t.notFoundTitle}</h1>
      <p className="mt-6 max-w-prose text-lg text-muted">{t.notFoundBody}</p>
      <Link href={localizedPath(locale, '/')} className={`${buttonVariants({ size: 'lg' })} mt-10`}>
        {t.backHome}
      </Link>
    </div>
  );
}
