import { Event, Artist, VenueData } from '@/types';

export const mockArtists: Artist[] = [
  {
    id: 1,
    name: 'Arctic Monkeys',
    url: 'http://bandsintown.com/arcticmonkeys',
    image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&h=300&fit=crop',
    thumb_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=150&h=150&fit=crop',
    facebook_page_url: 'https://facebook.com/arcticmonkeys',
    mbid: 'ada7a83c-e3e1-40f2-9f9d-21f9c28e4d42',
    tracker_count: 250000,
    upcoming_event_count: 15,
    genre: 'Rock'
  },
  {
    id: 2,
    name: 'Billie Eilish',
    url: 'http://bandsintown.com/billieeilish',
    image_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=500&h=300&fit=crop',
    thumb_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=150&h=150&fit=crop',
    facebook_page_url: 'https://facebook.com/billieeilish',
    mbid: 'f4abc0b5-3d5a-4a4e-8a0b-3d5a4a4e8a0b',
    tracker_count: 180000,
    upcoming_event_count: 22,
    genre: 'Pop'
  },
  {
    id: 3,
    name: 'The Weeknd',
    url: 'http://bandsintown.com/theweeknd',
    image_url: 'https://images.unsplash.com/photo-1471478331149-c72f17e33c73?w=500&h=300&fit=crop',
    thumb_url: 'https://images.unsplash.com/photo-1471478331149-c72f17e33c73?w=150&h=150&fit=crop',
    facebook_page_url: 'https://facebook.com/theweeknd',
    mbid: 'c14b4180-dc87-481e-b17a-64e4150f90f6',
    tracker_count: 320000,
    upcoming_event_count: 18,
    genre: 'R&B'
  }
];

export const mockVenues: VenueData[] = [
  {
    id: '1',
    name: 'Madison Square Garden',
    latitude: '40.7505',
    longitude: '-73.9934',
    city: 'New York',
    region: 'NY',
    country: 'United States',
    description: 'The World\'s Most Famous Arena',
    capacity: 20789,
    image_url: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=500&h=300&fit=crop'
  },
  {
    id: '2',
    name: 'The Forum',
    latitude: '33.9581',
    longitude: '-118.3417',
    city: 'Los Angeles',
    region: 'CA',
    country: 'United States',
    description: 'Historic entertainment venue in Inglewood',
    capacity: 17500,
    image_url: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=500&h=300&fit=crop'
  },
  {
    id: '3',
    name: 'O2 Arena',
    latitude: '51.5033',
    longitude: '-0.0031',
    city: 'London',
    region: 'England',
    country: 'United Kingdom',
    description: 'Premier entertainment venue in London',
    capacity: 20000,
    image_url: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=500&h=300&fit=crop'
  },
  {
    id: '4',
    name: 'Bercy Arena',
    latitude: '48.8398',
    longitude: '2.3791',
    city: 'Paris',
    region: 'Île-de-France',
    country: 'France',
    description: 'Multi-purpose indoor sports arena and concert hall',
    capacity: 20300,
    image_url: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=500&h=300&fit=crop'
  },
  {
    id: '5',
    name: 'Scotiabank Arena',
    latitude: '43.6435',
    longitude: '-79.3791',
    city: 'Toronto',
    region: 'ON',
    country: 'Canada',
    description: 'Multi-purpose arena in downtown Toronto',
    capacity: 19800,
    image_url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=500&h=300&fit=crop'
  }
];

export const mockEvents: Event[] = [
  {
    id: '1',
    artist_id: '1',
    url: 'http://bandsintown.com/event/1',
    on_sale_datetime: '2024-08-01T10:00:00',
    datetime: '2024-12-15T20:00:00',
    description: 'Arctic Monkeys - World Tour 2024',
    venue: {
      name: 'Madison Square Garden',
      latitude: '40.7505',
      longitude: '-73.9934',
      city: 'New York',
      region: 'NY',
      country: 'United States'
    },
    offers: [
      {
        type: 'Tickets',
        url: 'http://bandsintown.com/event/1/tickets',
        status: 'available'
      }
    ],
    lineup: ['Arctic Monkeys', 'The Strokes']
  },
  {
    id: '2',
    artist_id: '2',
    url: 'http://bandsintown.com/event/2',
    on_sale_datetime: '2024-08-05T10:00:00',
    datetime: '2024-11-22T19:30:00',
    description: 'Billie Eilish - Hit Me Hard and Soft Tour',
    venue: {
      name: 'The Forum',
      latitude: '33.9581',
      longitude: '-118.3417',
      city: 'Los Angeles',
      region: 'CA',
      country: 'United States'
    },
    offers: [
      {
        type: 'Tickets',
        url: 'http://bandsintown.com/event/2/tickets',
        status: 'available'
      }
    ],
    lineup: ['Billie Eilish', 'Finneas']
  },
  {
    id: '3',
    artist_id: '3',
    url: 'http://bandsintown.com/event/3',
    on_sale_datetime: '2024-07-20T10:00:00',
    datetime: '2024-10-30T21:00:00',
    description: 'The Weeknd - After Hours til Dawn Tour',
    venue: {
      name: 'O2 Arena',
      latitude: '51.5033',
      longitude: '-0.0031',
      city: 'London',
      region: 'England',
      country: 'United Kingdom'
    },
    offers: [
      {
        type: 'Tickets',
        url: 'http://bandsintown.com/event/3/tickets',
        status: 'available'
      }
    ],
    lineup: ['The Weeknd', 'Gesaffelstein']
  },
  {
    id: '4',
    artist_id: '1',
    url: 'http://bandsintown.com/event/4',
    on_sale_datetime: '2024-08-10T10:00:00',
    datetime: '2024-11-08T20:30:00',
    description: 'Arctic Monkeys - European Tour',
    venue: {
      name: 'Bercy Arena',
      latitude: '48.8398',
      longitude: '2.3791',
      city: 'Paris',
      region: 'Île-de-France',
      country: 'France'
    },
    offers: [
      {
        type: 'Tickets',
        url: 'http://bandsintown.com/event/4/tickets',
        status: 'available'
      }
    ],
    lineup: ['Arctic Monkeys', 'Fontaines D.C.']
  },
  {
    id: '5',
    artist_id: '2',
    url: 'http://bandsintown.com/event/5',
    on_sale_datetime: '2024-08-15T10:00:00',
    datetime: '2024-12-05T19:00:00',
    description: 'Billie Eilish - Holiday Special',
    venue: {
      name: 'Scotiabank Arena',
      latitude: '43.6435',
      longitude: '-79.3791',
      city: 'Toronto',
      region: 'ON',
      country: 'Canada'
    },
    offers: [
      {
        type: 'Tickets',
        url: 'http://bandsintown.com/event/5/tickets',
        status: 'available'
      }
    ],
    lineup: ['Billie Eilish']
  }
];

// Helper function to get artist by ID
export const getArtistById = (id: string): Artist | undefined => {
  return mockArtists.find(artist => artist.id.toString() === id);
};

// Helper function to get unique genres
export const getUniqueGenres = (): string[] => {
  const genres = mockArtists.map(artist => artist.genre);
  return [...new Set(genres)].sort();
};

// Helper function to get venue by name
export const getVenueByName = (name: string): VenueData | undefined => {
  return mockVenues.find(venue => venue.name === name);
};

// Helper function to filter events
export const filterEvents = (events: Event[], filters: {
  location?: string;
  artist?: string;
  date?: string;
}): Event[] => {
  return events.filter(event => {
    if (filters.location && !event.venue.city.toLowerCase().includes(filters.location.toLowerCase()) &&
        !event.venue.country.toLowerCase().includes(filters.location.toLowerCase())) {
      return false;
    }
    
    if (filters.artist) {
      const artist = getArtistById(event.artist_id);
      if (!artist || !artist.name.toLowerCase().includes(filters.artist.toLowerCase())) {
        return false;
      }
    }
    
    if (filters.date) {
      const eventDate = new Date(event.datetime);
      const filterDate = new Date(filters.date);
      if (eventDate.toDateString() !== filterDate.toDateString()) {
        return false;
      }
    }
    
    return true;
  });
};

// Helper function to filter artists
export const filterArtists = (artists: Artist[], filters: {
  name?: string;
  genre?: string;
}): Artist[] => {
  return artists.filter(artist => {
    if (filters.name && !artist.name.toLowerCase().includes(filters.name.toLowerCase())) {
      return false;
    }
    if (filters.genre && filters.genre !== 'all' && artist.genre !== filters.genre) {
      return false;
    }
    return true;
  });
};

// Helper function to filter venues
export const filterVenues = (venues: VenueData[], filters: {
  name?: string;
  location?: string;
}): VenueData[] => {
  return venues.filter(venue => {
    if (filters.name && !venue.name.toLowerCase().includes(filters.name.toLowerCase())) {
      return false;
    }
    
    if (filters.location && !venue.city.toLowerCase().includes(filters.location.toLowerCase()) &&
        !venue.country.toLowerCase().includes(filters.location.toLowerCase())) {
      return false;
    }
    
    return true;
  });
};