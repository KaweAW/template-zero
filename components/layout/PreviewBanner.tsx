import { getTranslations } from 'next-intl/server';
import { siteConfig } from '@/lib/config';
import type { Locale } from '@/types';

/** Shown only on sales previews (config.preview.enabled): tells the visitor the content is sample content. */
export async function PreviewBanner({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'common' });
  return (
    <p className="bg-foreground px-5 py-2 text-center text-sm text-background">
      {t('previewBanner', { name: siteConfig.name })}
    </p>
  );
}
