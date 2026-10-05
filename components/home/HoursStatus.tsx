'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { fill, weekdayName } from '@/lib/format';
import { getOpenStatus } from '@/lib/hours';
import { cn } from '@/lib/utils';
import type { Hours } from '@/types';

export interface HoursLabels {
  open: string;
  closingSoon: string;
  closed: string;
  /** Contain {time} / {day} placeholders. */
  closesAt: string;
  opensToday: string;
  opensTomorrow: string;
  opensOn: string;
}

interface Props {
  hours: Hours;
  timezone: string;
  locale: string;
  labels: HoursLabels;
  className?: string;
}

// The page is static, so the open/closed state can only be known in the browser. The server
// renders an empty box of the same height (no layout shift) and the browser fills it in.
const subscribe = (notify: () => void) => {
  const id = setInterval(notify, 30_000);
  return () => clearInterval(id);
};
const getSnapshot = () => Math.floor(Date.now() / 60_000);
const getServerSnapshot = () => null;

export function HoursStatus({ hours, timezone, locale, labels, className }: Props) {
  const minute = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const status = useMemo(
    () => (minute === null ? null : getOpenStatus(hours, timezone, new Date(minute * 60_000))),
    [minute, hours, timezone],
  );

  if (!status) return <div className="h-10" aria-hidden="true" />;

  let headline = labels.closed;
  let detail: string | null = null;
  let dot = 'bg-accent';

  if (status.state === 'open') {
    headline = status.closingSoon ? labels.closingSoon : labels.open;
    detail = fill(labels.closesAt, { time: status.closesAt });
    dot = status.closingSoon ? 'bg-amber-500' : 'bg-emerald-600';
  } else if (status.next) {
    const { opensAt, daysAhead, dayIndex } = status.next;
    detail =
      daysAhead === 0
        ? fill(labels.opensToday, { time: opensAt })
        : daysAhead === 1
          ? fill(labels.opensTomorrow, { time: opensAt })
          : fill(labels.opensOn, { day: weekdayName(locale, dayIndex), time: opensAt });
  }

  return (
    <p
      className={cn(
        'inline-flex min-h-10 flex-wrap items-center gap-x-3 gap-y-0.5 rounded-full bg-background/95 px-4 py-2 text-sm text-foreground',
        className,
      )}
    >
      <span className="flex items-center gap-2 font-medium">
        <span aria-hidden="true" className={cn('size-2.5 rounded-full', dot)} />
        {headline}
      </span>
      {detail ? <span className="text-muted">{detail}</span> : null}
    </p>
  );
}
