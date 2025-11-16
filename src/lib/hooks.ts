'use client';

import { useState } from 'react';
import { WatchlistItem, WishlistItem } from '@/types';

const WATCHLIST_KEY = 'find-concerts-watchlist';
const WISHLIST_KEY = 'find-concerts-wishlist';

// Helper to get initial state from localStorage
const getInitialWatchlist = (): WatchlistItem[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(WATCHLIST_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading watchlist:', error);
    return [];
  }
};

const getInitialWishlist = (): WishlistItem[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(WISHLIST_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading wishlist:', error);
    return [];
  }
};

// Hook for managing watchlist (artists and venues)
export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(getInitialWatchlist);

  const saveWatchlist = (items: WatchlistItem[]) => {
    try {
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(items));
      setWatchlist(items);
    } catch (error) {
      console.error('Error saving watchlist:', error);
    }
  };

  const addToWatchlist = (id: string, type: 'artist' | 'venue') => {
    const exists = watchlist.find(item => item.id === id && item.type === type);
    if (!exists) {
      const newItem: WatchlistItem = {
        id,
        type,
        addedAt: new Date().toISOString()
      };
      saveWatchlist([...watchlist, newItem]);
    }
  };

  const removeFromWatchlist = (id: string, type: 'artist' | 'venue') => {
    saveWatchlist(watchlist.filter(item => !(item.id === id && item.type === type)));
  };

  const isInWatchlist = (id: string, type: 'artist' | 'venue'): boolean => {
    return watchlist.some(item => item.id === id && item.type === type);
  };

  const toggleWatchlist = (id: string, type: 'artist' | 'venue') => {
    if (isInWatchlist(id, type)) {
      removeFromWatchlist(id, type);
    } else {
      addToWatchlist(id, type);
    }
  };

  return {
    watchlist,
    addToWatchlist,
    removeFromWatchlist,
    isInWatchlist,
    toggleWatchlist
  };
}

// Hook for managing wishlist (events)
export function useWishlist() {
  const [wishlist, setWishlist] = useState<WishlistItem[]>(getInitialWishlist);

  const saveWishlist = (items: WishlistItem[]) => {
    try {
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(items));
      setWishlist(items);
    } catch (error) {
      console.error('Error saving wishlist:', error);
    }
  };

  const addToWishlist = (id: string) => {
    const exists = wishlist.find(item => item.id === id);
    if (!exists) {
      const newItem: WishlistItem = {
        id,
        type: 'event',
        addedAt: new Date().toISOString()
      };
      saveWishlist([...wishlist, newItem]);
    }
  };

  const removeFromWishlist = (id: string) => {
    saveWishlist(wishlist.filter(item => item.id !== id));
  };

  const isInWishlist = (id: string): boolean => {
    return wishlist.some(item => item.id === id);
  };

  const toggleWishlist = (id: string) => {
    if (isInWishlist(id)) {
      removeFromWishlist(id);
    } else {
      addToWishlist(id);
    }
  };

  return {
    wishlist,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    toggleWishlist
  };
}
