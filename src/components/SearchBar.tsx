'use client';

import { useState } from 'react';
import type { SearchFilters } from '@/types';
import Icon from './Icon';

export default function SearchBar({
  onSearch,
  initial = {},
}: {
  onSearch: (filters: SearchFilters) => void;
  initial?: SearchFilters;
}) {
  const [location, setLocation] = useState(initial.location || '');
  const [artist, setArtist] = useState(initial.artist || '');
  const [date, setDate] = useState(initial.date || '');

  return (
    <form
      className="search-bar"
      role="search"
      aria-label="Find concerts"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch({
          location: location.trim() || undefined,
          artist: artist.trim() || undefined,
          date: date || undefined,
        });
      }}
    >
      <div className="search-field">
        <label htmlFor="location">
          <Icon name="location" />
          Where
        </label>
        <input
          id="location"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="City, venue, or country"
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
          setLocation('');
          setArtist('');
          setDate('');
          onSearch({});
        }}
      >
        Clear
      </button>
    </form>
  );
}
