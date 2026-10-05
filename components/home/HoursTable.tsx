import { Fragment } from 'react';
import { DAY_KEYS } from '@/lib/constants';
import { siteConfig } from '@/lib/config';
import { formatRanges, weekdayName, WEEK_ORDER } from '@/lib/format';
import { cn } from '@/lib/utils';

interface Props {
  locale: string;
  closedLabel: string;
  className?: string;
}

/** The weekly opening hours, Monday first. Rendered on the server: no JavaScript. */
export function HoursTable({ locale, closedLabel, className }: Props) {
  return (
    <dl className={cn('grid grid-cols-[auto_1fr] gap-x-8 gap-y-2 text-[0.9375rem]', className)}>
      {WEEK_ORDER.map((day) => {
        const ranges = siteConfig.hours[DAY_KEYS[day]];
        return (
          <Fragment key={day}>
            <dt className="first-letter:uppercase">{weekdayName(locale, day)}</dt>
            <dd className="tabular-nums">{ranges.length ? formatRanges(ranges) : closedLabel}</dd>
          </Fragment>
        );
      })}
    </dl>
  );
}
