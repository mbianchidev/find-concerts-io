'use client';

import { useId, useState } from 'react';
import { z } from 'zod';
import type { SearchFilters, VenueFacet } from '@/types';
import { useApiData } from '@/lib/api';
import { artistKey } from '@/lib/concerts';
import Icon from './Icon';
import { ErrorState } from './Ui';

const citiesSchema = z.array(z.string());

export default function SearchBar({
  onSearch,
  initial = {},
  citiesPath = '/cities',
  scope = 'public',
  venues = [],
  venuesPending = false,
  defaultPeriod = 'upcoming',
}: {
  onSearch: (filters: SearchFilters) => void;
  initial?: SearchFilters;
  citiesPath?: '/cities' | '/me/cities';
  scope?: string;
  venues?: VenueFacet[];
  venuesPending?: boolean;
  defaultPeriod?: SearchFilters['period'];
}) {
  const id = useId();
  const [place, setPlace] = useState(initial.city || initial.location || '');
  const [artist, setArtist] = useState(initial.artist || '');
  const [from, setFrom] = useState(initial.date_from || initial.date || '');
  const [to, setTo] = useState(initial.date_to || initial.date || '');
  const [period, setPeriod] = useState(
    initial.period ||
      (initial.date || initial.date_from || initial.date_to
        ? 'all'
        : defaultPeriod)
  );
  const [venue, setVenue] = useState(initial.venue || '');
  const cities = useApiData(citiesPath, citiesSchema, scope);

  return (
    <>
      <form
        className="search-bar"
        role="search"
        aria-label="Find concerts"
        onSubmit={(event) => {
          event.preventDefault();
          const city =
            cities.data?.find(
              (value) => artistKey(value) === artistKey(place)
            ) ||
            (initial.city && artistKey(initial.city) === artistKey(place)
              ? initial.city
              : undefined);
          onSearch({
            city: city || undefined,
            location: city ? undefined : place.trim() || undefined,
            artist: artist.trim() || undefined,
            date_from: from || undefined,
            date_to: to || undefined,
            period,
            venue: venue || undefined,
          });
        }}
      >
        <div className="search-field">
          <label htmlFor={`${id}-place`}>
            <Icon name="location" />
            Where
          </label>
          <input
            id={`${id}-place`}
            list={`${id}-cities`}
            value={place}
            onChange={(event) => setPlace(event.target.value)}
            placeholder="City, venue, or country"
            maxLength={250}
            disabled={cities.isPending}
          />
          <datalist id={`${id}-cities`}>
            {cities.data?.map((value) => (
              <option key={value} value={value} />
            ))}
          </datalist>
        </div>
        <div className="search-field">
          <label htmlFor={`${id}-artist`}>
            <Icon name="music" />
            Who
          </label>
          <input
            id={`${id}-artist`}
            value={artist}
            onChange={(event) => setArtist(event.target.value)}
            placeholder="An artist or a support act"
            maxLength={250}
          />
        </div>
        <fieldset className="search-field date-filter">
          <legend>
            <Icon name="calendar" />
            When
          </legend>
          <div className="date-presets" role="group" aria-label="Concert dates">
            {(
              [
                ['upcoming', 'Upcoming'],
                ['today', 'Today'],
                ['past', 'Past'],
                ['all', 'All dates'],
              ] as const
            ).map(([value, label]) => (
              <button
                type="button"
                key={value}
                aria-pressed={period === value}
                onClick={() => setPeriod(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="date-range">
            <label htmlFor={`${id}-from`}>
              From
              <input
                id={`${id}-from`}
                type="date"
                value={from}
                max={to || undefined}
                onChange={(event) => {
                  setFrom(event.target.value);
                  setPeriod('all');
                }}
              />
            </label>
            <label htmlFor={`${id}-to`}>
              To
              <input
                id={`${id}-to`}
                type="date"
                value={to}
                min={from || undefined}
                onChange={(event) => {
                  setTo(event.target.value);
                  setPeriod('all');
                }}
              />
            </label>
          </div>
        </fieldset>
        <button className="button search-submit" type="submit">
          <Icon name="search" />
          Find shows
        </button>
        <button
          className="search-clear text-button"
          type="button"
          onClick={() => {
            setPlace('');
            setArtist('');
            setFrom('');
            setTo('');
            setPeriod(defaultPeriod);
            setVenue('');
            onSearch({});
          }}
        >
          Clear
        </button>
        <details
          className="advanced-filters"
          open={initial.venue ? true : undefined}
        >
          <summary>Advanced filters</summary>
          <div className="advanced-options">
            <label htmlFor={`${id}-venue`}>Venue</label>
            <select
              id={`${id}-venue`}
              value={venue}
              disabled={venuesPending}
              onChange={(event) => setVenue(event.target.value)}
              aria-describedby={`${id}-venue-help`}
            >
              <option value="">
                {venuesPending ? 'Loading venues...' : 'All matching venues'}
              </option>
              {venue && !venues.some((item) => item.id === venue) && (
                <option value={venue} disabled>
                  {venuesPending
                    ? 'Loading selected venue...'
                    : 'Selected venue has no matching shows'}
                </option>
              )}
              {venues.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {item.city ? ` / ${item.city}` : ''} ({item.event_count})
                </option>
              ))}
            </select>
            <p className="form-help" id={`${id}-venue-help`}>
              Counts include all shows matching the applied filters, before
              choosing a venue.
            </p>
          </div>
        </details>
      </form>
      <ErrorState error={cities.error} retry={() => void cities.refetch()} />
    </>
  );
}
