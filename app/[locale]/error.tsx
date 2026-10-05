'use client';

import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
// A client error boundary cannot use the server-side translator, so its text comes from one
// tiny shared file (messages/errors.json, all languages side by side, well under 1 KB).
import errors from '@/messages/errors.json';

type ErrorStrings = (typeof errors)['en'];

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const params = useParams<{ locale?: string }>();
  const t: ErrorStrings =
    (errors as Record<string, ErrorStrings>)[params.locale ?? ''] ?? errors.en;

  return (
    <div className="mx-auto max-w-3xl px-5 py-24 md:py-36">
      <h1 className="text-6xl md:text-8xl">{t.title}</h1>
      <p className="mt-6 max-w-prose text-lg text-muted">{t.body}</p>
      <Button size="lg" className="mt-10" onClick={reset}>
        {t.retry}
      </Button>
    </div>
  );
}
