'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MapPinIcon } from '@/components/ui/icons';

interface Props {
  /** Address or "lat,lng" used as the search query. */
  query: string;
  title: string;
  loadLabel: string;
  notice: string;
}

/**
 * Click-to-load map. Nothing is requested from Google until the visitor asks for it, which
 * keeps the page fast (no iframe on first load) and avoids sending visitor IPs to Google
 * without consent, so no cookie banner is needed for the map.
 */
export function MapEmbed({ query, title, loadLabel, notice }: Props) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-sm bg-surface md:aspect-[16/10]">
      {loaded ? (
        <iframe
          title={title}
          src={`https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
          <Button variant="primary" size="lg" onClick={() => setLoaded(true)}>
            <MapPinIcon />
            {loadLabel}
          </Button>
          <p className="max-w-sm text-sm text-muted">{notice}</p>
        </div>
      )}
    </div>
  );
}
