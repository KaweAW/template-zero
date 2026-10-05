'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { submitReservation } from '@/app/actions/reserve';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { CheckIcon, MessageIcon } from '@/components/ui/icons';
import { fill, formatBookingDate } from '@/lib/format';
import { getZonedDateString } from '@/lib/hours';
import { addDays, getBookableSlots, getSlotsForDay, weekdayOf } from '@/lib/reservation';
import {
  createReservationSchema,
  type ReservationInput,
  type VALIDATION_KEYS,
} from '@/lib/reservation-schema';
import { whatsappLink } from '@/lib/whatsapp';
import type { Hours, Locale, ReservationSettings } from '@/types';

export interface ReservationLabels {
  name: string;
  phone: string;
  email: string;
  contactHint: string;
  date: string;
  time: string;
  pickDateFirst: string;
  selectTime: string;
  partySize: string;
  notes: string;
  notesHint: string;
  closedThatDay: string;
  noSlots: string;
  /** Already contains the group limit and the phone number. */
  largeGroup: string;
  submit: string;
  submitting: string;
  successTitle: string;
  /** Contains {name} {guests} {date} {time}. */
  successBody: string;
  newRequest: string;
  errorTitle: string;
  errorBody: string;
  whatsappCta: string;
  /** Contains {venue} {guests} {date} {time} {name}. */
  whatsappMessage: string;
  /** Contains {name} (the venue). Used while the form is still incomplete. */
  whatsappFallback: string;
  /** "1 guest", "2 guests"... indexed by number of guests (plural rules applied on the server). */
  guestLabels: string[];
  validation: Record<(typeof VALIDATION_KEYS)[number], string>;
}

interface Props {
  locale: Locale;
  venueName: string;
  hours: Hours;
  timezone: string;
  reservation: ReservationSettings;
  whatsapp?: string;
  labels: ReservationLabels;
}

type Status = 'idle' | 'success' | 'error';

const noopSubscribe = () => () => {};

export function ReservationForm({
  locale,
  venueName,
  hours,
  timezone,
  reservation,
  whatsapp,
  labels,
}: Props) {
  const schema = useMemo(
    () => createReservationSchema(reservation.maxPartySize),
    [reservation.maxPartySize],
  );
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    reset,
    formState: { errors },
  } = useForm<ReservationInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      date: '',
      time: '',
      partySize: 2,
      notes: '',
      website: '',
      locale,
    },
  });

  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status>('idle');
  const [sent, setSent] = useState<ReservationInput | null>(null);
  const successRef = useRef<HTMLDivElement>(null);

  // "Today" in the venue's time zone. Empty on the server, so the static page stays correct.
  const today = useSyncExternalStore(
    noopSubscribe,
    () => getZonedDateString(timezone),
    () => '',
  );

  const values = watch();
  const slots = useMemo(
    () => (values.date ? getBookableSlots({ hours, timezone, reservation }, values.date) : []),
    [values.date, hours, timezone, reservation],
  );

  // Forget a chosen time that is not offered on the newly picked date.
  useEffect(() => {
    if (values.time && !slots.includes(values.time)) setValue('time', '');
  }, [slots, values.time, setValue]);

  useEffect(() => {
    if (status === 'success') successRef.current?.focus();
  }, [status]);

  const message = (key?: string) =>
    key ? (labels.validation[key as keyof ReservationLabels['validation']] ?? key) : undefined;

  const dateNotice =
    values.date && slots.length === 0
      ? getSlotsForDay(hours, weekdayOf(values.date), reservation).length === 0
        ? labels.closedThatDay
        : labels.noSlots
      : undefined;

  const guestLabel = (count: number) => labels.guestLabels[count] ?? String(count);

  const onSubmit = handleSubmit((data) => {
    setStatus('idle');
    startTransition(async () => {
      try {
        const result = await submitReservation(data);
        if (result.ok) {
          setSent(data);
          setStatus('success');
          reset();
        } else if (result.fieldErrors) {
          for (const [field, key] of Object.entries(result.fieldErrors)) {
            setError(field as keyof ReservationInput, { message: key });
          }
        } else {
          setStatus('error');
        }
      } catch {
        setStatus('error');
      }
    });
  });

  const whatsappHref = whatsapp
    ? whatsappLink(
        whatsapp,
        values.name && values.date && values.time && values.partySize
          ? fill(labels.whatsappMessage, {
              venue: venueName,
              guests: guestLabel(values.partySize),
              date: formatBookingDate(values.date, locale),
              time: values.time,
              name: values.name,
            })
          : fill(labels.whatsappFallback, { name: venueName }),
      )
    : null;

  if (status === 'success' && sent) {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        role="status"
        className="rounded-md border border-primary bg-surface p-8 outline-none md:p-10"
      >
        <span className="inline-flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <CheckIcon />
        </span>
        <h2 className="mt-6 text-4xl md:text-5xl">{labels.successTitle}</h2>
        <p className="mt-3 max-w-prose text-lg">
          {fill(labels.successBody, {
            name: sent.name,
            guests: guestLabel(sent.partySize),
            date: formatBookingDate(sent.date, locale),
            time: sent.time,
          })}
        </p>
        <Button variant="outline" className="mt-8" onClick={() => setStatus('idle')}>
          {labels.newRequest}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5 sm:grid-cols-6">
      {status === 'error' ? (
        <div
          role="alert"
          className="rounded-md border border-accent bg-accent/10 p-5 sm:col-span-6"
        >
          <p className="font-medium">{labels.errorTitle}</p>
          <p className="mt-1 text-[0.9375rem]">{labels.errorBody}</p>
        </div>
      ) : null}

      <Field
        id="name"
        label={labels.name}
        error={message(errors.name?.message)}
        className="sm:col-span-6"
      >
        <Input
          id="name"
          autoComplete="name"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
          {...register('name')}
        />
      </Field>

      <Field
        id="phone"
        label={labels.phone}
        error={message(errors.phone?.message)}
        className="sm:col-span-3"
      >
        <Input
          id="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          aria-invalid={!!errors.phone}
          aria-describedby={errors.phone ? 'phone-error' : 'contact-hint'}
          {...register('phone')}
        />
      </Field>

      <Field
        id="email"
        label={labels.email}
        error={message(errors.email?.message)}
        className="sm:col-span-3"
      >
        <Input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : 'contact-hint'}
          {...register('email')}
        />
      </Field>

      <p id="contact-hint" className="-mt-2 text-sm text-muted sm:col-span-6">
        {labels.contactHint}
      </p>

      <Field
        id="date"
        label={labels.date}
        error={dateNotice ?? message(errors.date?.message)}
        className="sm:col-span-2"
      >
        <Input
          id="date"
          type="date"
          min={today || undefined}
          max={today ? addDays(today, reservation.advanceDays) : undefined}
          aria-invalid={!!errors.date || !!dateNotice}
          aria-describedby={errors.date || dateNotice ? 'date-error' : undefined}
          {...register('date')}
        />
      </Field>

      <Field
        id="time"
        label={labels.time}
        error={message(errors.time?.message)}
        className="sm:col-span-2"
      >
        <Select
          id="time"
          disabled={slots.length === 0}
          aria-invalid={!!errors.time}
          aria-describedby={errors.time ? 'time-error' : undefined}
          {...register('time')}
        >
          <option value="">{values.date ? labels.selectTime : labels.pickDateFirst}</option>
          {slots.map((slot) => (
            <option key={slot} value={slot}>
              {slot}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        id="partySize"
        label={labels.partySize}
        hint={labels.largeGroup}
        error={message(errors.partySize?.message)}
        className="sm:col-span-2"
      >
        <Select
          id="partySize"
          aria-invalid={!!errors.partySize}
          aria-describedby={errors.partySize ? 'partySize-error' : 'partySize-hint'}
          {...register('partySize', { valueAsNumber: true })}
        >
          {Array.from({ length: reservation.maxPartySize }, (_, i) => i + 1).map((count) => (
            <option key={count} value={count}>
              {guestLabel(count)}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        id="notes"
        label={labels.notes}
        hint={labels.notesHint}
        error={message(errors.notes?.message)}
        className="sm:col-span-6"
      >
        <Textarea
          id="notes"
          rows={3}
          aria-invalid={!!errors.notes}
          aria-describedby={errors.notes ? 'notes-error' : 'notes-hint'}
          {...register('notes')}
        />
      </Field>

      {/* Honeypot: invisible to people and assistive tech, bots fill it in and get ignored. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input type="text" tabIndex={-1} autoComplete="off" {...register('website')} />
        </label>
      </div>
      <input type="hidden" {...register('locale')} />

      <div className="flex flex-wrap items-center gap-3 pt-2 sm:col-span-6">
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          aria-busy={pending}
          className="w-full sm:w-auto"
        >
          {pending ? labels.submitting : labels.submit}
        </Button>
        {whatsappHref ? (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-md border border-foreground/30 px-6 font-medium hover:bg-foreground/5 sm:w-auto"
          >
            <MessageIcon />
            {labels.whatsappCta}
          </a>
        ) : null}
      </div>
    </form>
  );
}
