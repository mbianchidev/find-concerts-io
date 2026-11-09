'use client';

import { useState } from 'react';
import { z } from 'zod';
import type { SearchFilters } from '@/types';
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
}: {
  onSearch: (filters: SearchFilters) => void;
  initial?: SearchFilters;
  citiesPath?: '/cities' | '/me/cities';
  scope?: string;
}) {
  const [city, setCity] = useState(initial.city || '');
  const [location, setLocation] = useState(initial.location || '');
  const [artist, setArtist] = useState(initial.artist || '');
  const [date, setDate] = useState(initial.date || '');
  const cities = useApiData(citiesPath, citiesSchema, scope);
  const selectedCity =
    cities.data?.find((value) => artistKey(value) === artistKey(city)) || city;

  return (
    <>
      <form
        className="search-bar"
        role="search"
        aria-label="Find concerts"
        onSubmit={(event) => {
          event.preventDefault();
          onSearch({
            city: city || undefined,
            location: location.trim() || undefined,
            artist: artist.trim() || undefined,
            date: date || undefined,
          });
        }}
      >
        <div className="search-field">
          <label htmlFor="city">
            <Icon name="location" />
            City
          </label>
          <select
            id="city"
            value={selectedCity}
            disabled={cities.isPending}
            onChange={(event) => setCity(event.target.value)}
          >
            <option value="">All cities</option>
            {city &&
              !cities.data?.some(
                (value) => artistKey(value) === artistKey(city)
              ) && <option value={city}>{city}</option>}
            {cities.data?.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <div className="search-field">
          <label htmlFor="location">
            <Icon name="location" />
            Where
          </label>
          <input
            id="location"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Venue, area, or country"
            maxLength={250}
          />
        </div>
        <div className="search-field">
          <label htmlFor="artist">
            <Icon name="music" />
            Who
          </label>
          <input
            id="artist"
            value={artist}
            onChange={(event) => setArtist(event.target.value)}
            placeholder="An artist or a support act"
            maxLength={250}
          />
        </div>
        <div className="search-field">
          <label htmlFor="date">
            <Icon name="calendar" />
            When
          </label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>
        <button className="button search-submit" type="submit">
          <Icon name="search" />
          Find shows
        </button>
        <button
          className="search-clear text-button"
          type="button"
          onClick={() => {
            setCity('');
            setLocation('');
            setArtist('');
            setDate('');
            onSearch({});
          }}
        >
          Clear
        </button>
      </form>
      <ErrorState error={cities.error} retry={() => void cities.refetch()} />
    </>
  );
}
