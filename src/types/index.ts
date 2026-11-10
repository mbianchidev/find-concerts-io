export interface Venue {
  name: string;
  latitude: string;
  longitude: string;
  city: string;
  region: string;
  country: string;
}

export interface VenueCoordinates {
  latitude: number;
  longitude: number;
}

export interface EventSource {
  id: string;
  name: string;
  url: string;
  fetched_at: string;
  genre_basis?: 'description' | 'calendar';
}

export interface ImportDetails {
  sheet: string;
  row: number;
  fields: Record<string, string | number | boolean | null>;
  attendance?: string;
  price?: string;
  status?: string;
  notes?: string;
}

export interface Event {
  id: string;
  title: string;
  datetime: string | null;
  end_datetime?: string;
  date_only?: boolean;
  date_label?: string;
  description?: string;
  venue: Venue;
  lineup: string[];
  genres: string[];
  url: string;
  image_url?: string;
  image_kind?: 'event' | 'artist' | 'venue';
  source: EventSource;
  status: 'scheduled' | 'cancelled' | 'postponed' | 'sold_out';
  popularity: number;
  is_private?: boolean;
  import_details?: ImportDetails;
  reason?: string;
}

export interface Artist {
  id: string;
  name: string;
  genres: string[];
  image_url?: string;
  upcoming_event_count: number;
  url: string;
}

export interface VenueData extends Venue {
  id: string;
  event_count: number;
  image_url?: string;
  genres?: string[];
  url?: string;
  source_url?: string;
}

export interface Tour {
  id: string;
  name: string;
  artist: string;
  start_date: string;
  end_date: string;
  event_count: number;
  cities: string[];
  events: Event[];
}

export interface SearchFilters {
  city?: string;
  location?: string;
  artist?: string;
  date?: string;
  date_from?: string;
  date_to?: string;
  period?: 'all' | 'upcoming' | 'today' | 'past';
  venue?: string;
  sort?: 'date_asc' | 'date_desc' | 'band_asc' | 'band_desc';
  genre?: string;
}

export interface SavedItem {
  id: string;
  type: 'event' | 'artist' | 'venue';
  addedAt: string;
}

export interface User {
  id: string;
  username: string;
  display_name: string;
  location: string;
  bio: string;
  email?: string;
  email_notifications: boolean;
  role: 'admin' | 'user';
}

export interface Notification {
  id: string;
  event_id: string;
  title: string;
  created_at: string;
  read_at: string | null;
}

export interface ImportIssue {
  sheet: string;
  row: number;
  message: string;
  level: 'warning' | 'error';
}

export interface ImportReport {
  imported: number;
  duplicates: number;
  skipped: number;
  total: number;
  errors?: number;
  issues: ImportIssue[];
}

export interface PageResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    has_next: boolean;
    venues?: VenueFacet[];
  };
}

export interface VenueFacet {
  id: string;
  name: string;
  city: string;
  event_count: number;
}

export interface SourceStatus {
  id: string;
  name: string;
  url: string;
  last_run: string | null;
  event_count: number;
  error: string | null;
}
