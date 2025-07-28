import { Event, Artist } from '@/types';

export const mockArtists: Artist[] = [
  {
    id: 510,
    name: 'Maroon 5',
    url: 'http://www.bandsintown.com/Maroon5?came_from=67',
    image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
    thumb_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=150',
    facebook_page_url: 'https://www.facebook.com/maroon5',
    mbid: '0ab49580-c84f-44d4-875f-d83760ea2cfe',
    tracker_count: 2450000,
    upcoming_event_count: 8
  },
  {
    id: 438314,
    name: 'Skrillex',
    url: 'http://www.bandsintown.com/Skrillex?came_from=67',
    image_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
    thumb_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=150',
    facebook_page_url: 'https://www.facebook.com/skrillex',
    mbid: '1f038562-197e-4f73-a31e-8e95359515c5',
    tracker_count: 1850000,
    upcoming_event_count: 5
  },
  {
    id: 789123,
    name: 'The Weeknd',
    url: 'http://www.bandsintown.com/TheWeeknd?came_from=67',
    image_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400',
    thumb_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=150',
    facebook_page_url: 'https://www.facebook.com/theweeknd',
    mbid: 'c8b03190-306c-4120-bb0b-6f2ebfc06ea9',
    tracker_count: 3200000,
    upcoming_event_count: 12
  },
  {
    id: 456789,
    name: 'Coldplay',
    url: 'http://www.bandsintown.com/Coldplay?came_from=67',
    image_url: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=400',
    thumb_url: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=150',
    facebook_page_url: 'https://www.facebook.com/coldplay',
    mbid: 'cc197bad-dc9c-440d-a5b5-d52ba2e14234',
    tracker_count: 4100000,
    upcoming_event_count: 15
  }
];

export const mockEvents: Event[] = [
  {
    id: '13722599',
    artist_id: '438314',
    url: 'http://www.bandsintown.com/event/13722599?app_id=foo&artist=Skrillex&came_from=67',
    on_sale_datetime: '2024-01-15T18:00:00',
    datetime: '2024-08-19T20:00:00',
    description: 'Skrillex presents: The Ultimate EDM Experience',
    venue: {
      name: 'Encore Beach Club',
      latitude: '36.12714',
      longitude: '-115.1629562',
      city: 'Las Vegas',
      region: 'NV',
      country: 'United States'
    },
    offers: [
      {
        type: 'Tickets',
        url: 'http://www.bandsintown.com/event/13722599/buy_tickets',
        status: 'available'
      }
    ],
    lineup: ['Skrillex', 'Diplo', 'Major Lazer']
  },
  {
    id: '13722600',
    artist_id: '510',
    url: 'http://www.bandsintown.com/event/13722600?app_id=foo&artist=Maroon5&came_from=67',
    on_sale_datetime: '2024-02-01T10:00:00',
    datetime: '2024-09-15T19:30:00',
    description: 'Maroon 5 World Tour 2024',
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
        url: 'http://www.bandsintown.com/event/13722600/buy_tickets',
        status: 'available'
      }
    ],
    lineup: ['Maroon 5']
  },
  {
    id: '13722601',
    artist_id: '789123',
    url: 'http://www.bandsintown.com/event/13722601?app_id=foo&artist=TheWeeknd&came_from=67',
    on_sale_datetime: '2024-01-20T12:00:00',
    datetime: '2024-10-05T21:00:00',
    description: 'The Weeknd: After Hours Til Dawn Tour',
    venue: {
      name: 'Staples Center',
      latitude: '34.043',
      longitude: '-118.267',
      city: 'Los Angeles',
      region: 'CA',
      country: 'United States'
    },
    offers: [
      {
        type: 'Tickets',
        url: 'http://www.bandsintown.com/event/13722601/buy_tickets',
        status: 'available'
      }
    ],
    lineup: ['The Weeknd', 'Doja Cat']
  },
  {
    id: '13722602',
    artist_id: '456789',
    url: 'http://www.bandsintown.com/event/13722602?app_id=foo&artist=Coldplay&came_from=67',
    on_sale_datetime: '2024-03-01T14:00:00',
    datetime: '2024-11-12T20:00:00',
    description: 'Coldplay: Music of the Spheres World Tour',
    venue: {
      name: 'Wembley Stadium',
      latitude: '51.5560',
      longitude: '-0.2795',
      city: 'London',
      region: 'England',
      country: 'United Kingdom'
    },
    offers: [
      {
        type: 'Tickets',
        url: 'http://www.bandsintown.com/event/13722602/buy_tickets',
        status: 'available'  
      }
    ],
    lineup: ['Coldplay', 'H.E.R.']
  },
  {
    id: '13722603',
    artist_id: '510',
    url: 'http://www.bandsintown.com/event/13722603?app_id=foo&artist=Maroon5&came_from=67',
    on_sale_datetime: '2024-02-15T11:00:00',
    datetime: '2024-08-30T19:00:00',
    description: 'Maroon 5 Summer Concert Series',
    venue: {
      name: 'Red Rocks Amphitheatre',
      latitude: '39.6654',
      longitude: '-105.2057',
      city: 'Morrison',
      region: 'CO',
      country: 'United States'
    },
    offers: [
      {
        type: 'Tickets',
        url: 'http://www.bandsintown.com/event/13722603/buy_tickets',
        status: 'available'
      }
    ],
    lineup: ['Maroon 5', 'OneRepublic']
  },
  {
    id: '13722604',
    artist_id: '789123',
    url: 'http://www.bandsintown.com/event/13722604?app_id=foo&artist=TheWeeknd&came_from=67',
    on_sale_datetime: '2024-01-25T16:00:00',
    datetime: '2024-09-22T20:30:00',
    description: 'The Weeknd: Exclusive Arena Show',
    venue: {
      name: 'Scotiabank Arena',
      latitude: '43.6434',
      longitude: '-79.3791',
      city: 'Toronto',
      region: 'ON',
      country: 'Canada'
    },
    offers: [
      {
        type: 'Tickets',
        url: 'http://www.bandsintown.com/event/13722604/buy_tickets',
        status: 'available'
      }
    ],
    lineup: ['The Weeknd']
  }
];

export const genres = [
  'Pop',
  'Rock',
  'Electronic/Dance',
  'Hip-Hop/Rap',
  'R&B/Soul',
  'Alternative',
  'Indie',
  'Country',
  'Jazz',
  'Classical',
  'Folk',
  'Reggae',
  'Metal',
  'Punk',
  'Blues'
];