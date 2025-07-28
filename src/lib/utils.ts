import { FavoriteEvent } from '@/types';

const FAVORITES_KEY = 'find-concerts-favorites';

export const getFavorites = (): FavoriteEvent[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const favorites = localStorage.getItem(FAVORITES_KEY);
    return favorites ? JSON.parse(favorites) : [];
  } catch {
    return [];
  }
};

export const addToFavorites = (eventId: string): void => {
  if (typeof window === 'undefined') return;
  
  const favorites = getFavorites();
  const isAlreadyFavorite = favorites.some(fav => fav.eventId === eventId);
  
  if (!isAlreadyFavorite) {
    const newFavorite: FavoriteEvent = {
      eventId,
      savedAt: new Date().toISOString()
    };
    favorites.push(newFavorite);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }
};

export const removeFromFavorites = (eventId: string): void => {
  if (typeof window === 'undefined') return;
  
  const favorites = getFavorites();
  const filteredFavorites = favorites.filter(fav => fav.eventId !== eventId);
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(filteredFavorites));
};

export const isFavorite = (eventId: string): boolean => {
  const favorites = getFavorites();
  return favorites.some(fav => fav.eventId === eventId);
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const filterEvents = (events: any[], filters: any) => {
  return events.filter(event => {
    if (filters.location && !event.venue.city.toLowerCase().includes(filters.location.toLowerCase()) &&
        !event.venue.country.toLowerCase().includes(filters.location.toLowerCase())) {
      return false;
    }
    
    if (filters.artist && !event.lineup.some((artist: string) => 
        artist.toLowerCase().includes(filters.artist.toLowerCase()))) {
      return false;
    }
    
    if (filters.venue && !event.venue.name.toLowerCase().includes(filters.venue.toLowerCase())) {
      return false;
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