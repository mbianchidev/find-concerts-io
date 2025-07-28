import { Artist, Event } from '@/types';
import { mockArtists, mockEvents } from '@/data/mockData';

/**
 * Mock Bandsintown API service
 * Simulates the Bandsintown API endpoints using local mock data
 */

export interface BandsinTownApiError {
  message: string;
  status: number;
}

/**
 * Get artist information by artist name
 * @param artistname The name of the artist (case-insensitive)
 * @param app_id The application ID (required but not validated in mock)
 * @returns Promise<Artist> Artist information
 * @throws BandsinTownApiError if artist not found
 */
export async function getArtist(artistname: string, app_id: string): Promise<Artist> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
  
  if (!app_id) {
    throw { message: 'app_id is required', status: 400 } as BandsinTownApiError;
  }

  // Find artist by name (case-insensitive)
  const artist = mockArtists.find(a => 
    a.name.toLowerCase() === artistname.toLowerCase()
  );

  if (!artist) {
    throw { message: `Artist '${artistname}' not found`, status: 404 } as BandsinTownApiError;
  }

  return artist;
}

/**
 * Get events for an artist with optional date filtering
 * @param artistname The name of the artist (case-insensitive)
 * @param app_id The application ID (required but not validated in mock)
 * @param date Optional date filter: "upcoming", "past", "all", or date range "YYYY-MM-DD,YYYY-MM-DD"
 * @returns Promise<Event[]> Array of events
 * @throws BandsinTownApiError if artist not found
 */
export async function getArtistEvents(
  artistname: string, 
  app_id: string, 
  date?: string
): Promise<Event[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));
  
  if (!app_id) {
    throw { message: 'app_id is required', status: 400 } as BandsinTownApiError;
  }

  // First, verify the artist exists
  const artist = mockArtists.find(a => 
    a.name.toLowerCase() === artistname.toLowerCase()
  );

  if (!artist) {
    throw { message: `Artist '${artistname}' not found`, status: 404 } as BandsinTownApiError;
  }

  // Find events for this artist
  let events = mockEvents.filter(event => 
    event.lineup.some(lineupArtist => 
      lineupArtist.toLowerCase() === artistname.toLowerCase()
    )
  );

  // Apply date filtering if specified
  if (date) {
    const now = new Date();
    
    switch (date.toLowerCase()) {
      case 'upcoming':
        events = events.filter(event => new Date(event.datetime) > now);
        break;
      case 'past':
        events = events.filter(event => new Date(event.datetime) < now);
        break;
      case 'all':
        // No filtering needed
        break;
      default:
        // Check if it's a date range (YYYY-MM-DD,YYYY-MM-DD)
        if (date.includes(',')) {
          const [startDate, endDate] = date.split(',');
          const start = new Date(startDate);
          const end = new Date(endDate);
          
          if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            throw { message: 'Invalid date range format. Use YYYY-MM-DD,YYYY-MM-DD', status: 400 } as BandsinTownApiError;
          }
          
          events = events.filter(event => {
            const eventDate = new Date(event.datetime);
            return eventDate >= start && eventDate <= end;
          });
        } else {
          // Single date
          const filterDate = new Date(date);
          if (isNaN(filterDate.getTime())) {
            throw { message: 'Invalid date format. Use YYYY-MM-DD', status: 400 } as BandsinTownApiError;
          }
          
          events = events.filter(event => {
            const eventDate = new Date(event.datetime);
            return eventDate.toDateString() === filterDate.toDateString();
          });
        }
        break;
    }
  } else {
    // Default to upcoming events if no date filter specified
    events = events.filter(event => new Date(event.datetime) > new Date());
  }

  return events;
}

/**
 * Get all artists (utility function not in original API but useful for the app)
 * @param app_id The application ID (required but not validated in mock)
 * @returns Promise<Artist[]> Array of all artists
 */
export async function getAllArtists(app_id: string): Promise<Artist[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 200));
  
  if (!app_id) {
    throw { message: 'app_id is required', status: 400 } as BandsinTownApiError;
  }

  return [...mockArtists];
}

/**
 * Get all events (utility function not in original API but useful for the app)
 * @param app_id The application ID (required but not validated in mock)
 * @returns Promise<Event[]> Array of all events
 */
export async function getAllEvents(app_id: string): Promise<Event[]> {
  // Simulate API delay  
  await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
  
  if (!app_id) {
    throw { message: 'app_id is required', status: 400 } as BandsinTownApiError;
  }

  return [...mockEvents];
}