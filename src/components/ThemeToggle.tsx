'use client';

import { useState, useSyncExternalStore } from 'react';
import { applyTheme, THEME_EVENT, THEME_KEY, type Theme } from '@/lib/theme';
import Icon from './Icon';

function subscribe(listener: () => void) {
  const sync = (event: StorageEvent) => {
    if (event.key !== THEME_KEY && event.key !== null) return;
    applyTheme(event.newValue === 'light' ? 'light' : 'dark');
    listener();
  };
  window.addEventListener('storage', sync);
  window.addEventListener(THEME_EVENT, listener);
  return () => {
    window.removeEventListener('storage', sync);
    window.removeEventListener(THEME_EVENT, listener);
  };
}

function snapshot(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, snapshot, () => 'dark');
  const [storageError, setStorageError] = useState(false);
  return (
    <>
      <button
        className="icon-button theme-toggle"
        type="button"
        aria-label="Dark mode"
        aria-pressed={theme === 'dark'}
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        onClick={() => {
          const next = theme === 'dark' ? 'light' : 'dark';
          applyTheme(next);
          window.dispatchEvent(new Event(THEME_EVENT));
          try {
            localStorage.setItem(THEME_KEY, next);
            setStorageError(false);
          } catch (error) {
            console.error('Theme preference could not be saved', error);
            setStorageError(true);
          }
        }}
      >
        <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
      </button>
      {storageError && (
        <p className="theme-notice" role="status">
          Theme changed for this tab, but browser storage could not save it.
        </p>
      )}
    </>
  );
}
