import { getTranslations } from 'next-intl/server';
import type { HoursLabels } from '@/components/home/HoursStatus';
import type { Locale } from '@/types';

/**
 * Client components get their text as plain strings from the server instead of using a
 * translation runtime in the browser. Placeholders such as {time} stay in the strings and are
 * filled in the browser with lib/format.ts#fill.
 */
export async function getHoursLabels(locale: Locale): Promise<HoursLabels> {
  const t = await getTranslations({ locale, namespace: 'hours' });
  return {
    open: t('open'),
    closingSoon: t('closingSoon'),
    closed: t('closed'),
    closesAt: t.raw('closesAt') as string,
    opensToday: t.raw('opensToday') as string,
    opensTomorrow: t.raw('opensTomorrow') as string,
    opensOn: t.raw('opensOn') as string,
  };
}
