export interface Artist {
  id: number;
  name: string;
  url: string;
  image_url: string;
  thumb_url: string;
  facebook_page_url: string;
  mbid: string;
  tracker_count: number;
  upcoming_event_count: number;
}

export interface Venue {
  name: string;
  latitude: string;
  longitude: string;
  city: string;
  region: string;
  country: string;
}

export interface Offer {
  type: string;
  url: string;
  status: string;
}

export interface Event {
  id: string;
  artist_id: string;
  url: string;
  on_sale_datetime: string;
  datetime: string;
  description?: string;
  venue: Venue;
  offers: Offer[];
  lineup: string[];
}

export interface SearchFilters {
  location?: string;
  artist?: string;
  date?: string;
  genre?: string;
}