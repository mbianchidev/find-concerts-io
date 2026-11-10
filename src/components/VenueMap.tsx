'use client';

import { useId, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { Venue } from '@/types';
import { apiData } from '@/lib/api';
import {
  getVenueCoordinates,
  OPENSTREETMAP_ORIGIN,
  venueMapUrls,
  venueSearchUrl,
} from '@/lib/maps';
import { venueCoordinatesSchema } from '@/lib/schema';
import Icon from './Icon';
import { ErrorState } from './Ui';

export default function VenueMap({
  eventId,
  venue,
  isPrivate = false,
}: {
  eventId: string;
  venue: Venue;
  isPrivate?: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const lookup = useMutation({
    mutationFn: () =>
      apiData(
        `/events/${encodeURIComponent(eventId)}/location`,
        venueCoordinatesSchema
      ),
    onSuccess: () => setOpen(true),
  });

  if (isPrivate)
    return (
      <section className="panel venue-map" aria-labelledby={`${id}-title`}>
        <h2 id={`${id}-title`}>Venue map</h2>
        <p>Private import locations aren&apos;t sent to OpenStreetMap.</p>
        <a
          className="show-link"
          href={OPENSTREETMAP_ORIGIN}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open OpenStreetMap <Icon name="external" />
        </a>
      </section>
    );

  const point = getVenueCoordinates(venue) || lookup.data;
  const urls = point ? venueMapUrls(point) : undefined;
  const name = venue.name.trim() || 'this venue';

  return (
    <section className="panel venue-map" aria-labelledby={`${id}-title`}>
      <div className="venue-map-heading">
        <div>
          <h2 id={`${id}-title`}>Venue map</h2>
          <p>
            {[venue.name, venue.city, venue.country]
              .filter(Boolean)
              .join(', ') || 'Venue to be announced'}
          </p>
        </div>
        <div className="venue-map-actions">
          <button
            type="button"
            className="button"
            disabled={lookup.isPending}
            aria-expanded={open}
            aria-controls={`${id}-map`}
            onClick={() => {
              if (open) setOpen(false);
              else if (point) setOpen(true);
              else lookup.mutate();
            }}
          >
            <Icon name="location" />
            {lookup.isPending
              ? 'Finding venue...'
              : open
                ? 'Hide venue map'
                : 'Show venue map'}
          </button>
          <a
            className="show-link"
            href={urls?.external || venueSearchUrl(venue)}
            target="_blank"
            rel="noopener noreferrer"
          >
            {point ? 'Open larger map' : 'Search OpenStreetMap'}{' '}
            <Icon name="external" />
          </a>
        </div>
      </div>
      <ErrorState error={lookup.error} />
      {open && urls ? (
        <iframe
          id={`${id}-map`}
          className="venue-map-frame"
          title={`Venue map for ${name}`}
          src={urls.embed}
          loading="lazy"
          referrerPolicy="no-referrer"
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        />
      ) : (
        <div className="venue-map-placeholder" id={`${id}-map`}>
          <Icon name="location" width="36" height="36" />
          <p>
            {lookup.isPending
              ? 'Looking up the public venue location...'
              : 'Show the venue pin on OpenStreetMap, with drag and + / - zoom controls.'}
          </p>
        </div>
      )}
      <p className="muted-note">
        Loading the map or following a map link connects your browser to
        OpenStreetMap. Missing public venue locations are looked up only when
        you choose Show venue map. You can open the map directly if the embedded
        map is blocked.
      </p>
      <p className="venue-map-attribution">
        &copy;{' '}
        <a
          href={`${OPENSTREETMAP_ORIGIN}/copyright`}
          target="_blank"
          rel="noopener noreferrer"
        >
          OpenStreetMap contributors
        </a>
      </p>
    </section>
  );
}
