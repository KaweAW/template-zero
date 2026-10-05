import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { buttonVariants } from '@/components/ui/button';
import { PhoneIcon } from '@/components/ui/icons';
import { siteConfig } from '@/lib/config';
import { getReserveAction } from '@/lib/cta';
import { localizedPath } from '@/lib/links';
import type { Locale } from '@/types';

/**
 * Fixed bottom bar on phones: the three things a hungry guest wants. Plain links, no JavaScript.
 * Hidden from md upwards, where the header navigation does the same job.
 */
export async function StickyCTA({ locale }: { locale: Locale }) {
  const [t, tc, reserve] = await Promise.all([
    getTranslations({ locale, namespace: 'nav' }),
    getTranslations({ locale, namespace: 'common' }),
    getReserveAction(locale),
  ]);

  return (
    <nav
      aria-label={t('actions')}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-[1fr_1.35fr_auto] gap-2 p-2.5">
        <Link
          href={localizedPath(locale, '/menu')}
          className={buttonVariants({ variant: 'outline' })}
        >
          {tc('menu')}
        </Link>
        {reserve.external ? (
          <a
            href={reserve.href}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: 'primary' })}
          >
            {reserve.shortLabel}
          </a>
        ) : (
          <Link href={reserve.href} className={buttonVariants({ variant: 'primary' })}>
            {reserve.shortLabel}
          </Link>
        )}
        <a
          href={`tel:${siteConfig.contact.phone.replace(/[^\d+]/g, '')}`}
          aria-label={tc('call')}
          className={buttonVariants({ variant: 'outline', size: 'icon' })}
        >
          <PhoneIcon />
        </a>
      </div>
    </nav>
  );
}
