'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { z } from 'zod';
import { apiData } from '@/lib/api';

const KEY = 'find-concerts-analytics-consent';
const EVENT = 'concerts-consent-changed';
const responseSchema = z.object({
  recorded: z.boolean(),
  reason: z.string().optional(),
});

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(EVENT, callback);
  };
}

function snapshot() {
  try {
    return localStorage.getItem(KEY) || 'no';
  } catch {
    return 'unavailable';
  }
}

function send(name: 'CLS' | 'INP' | 'LCP' | 'page_view', value: number) {
  if (snapshot() !== 'yes' || navigator.doNotTrack === '1') return;
  void apiData('/metrics', responseSchema, {
    method: 'POST',
    body: JSON.stringify({ consent: true, name, value }),
  }).catch((error: unknown) =>
    console.error(
      'Optional anonymous metric could not be recorded',
      error instanceof Error ? error.message : 'Unknown error'
    )
  );
}

export default function Telemetry() {
  const consent = useSyncExternalStore(subscribe, snapshot, () => 'no');
  const pathname = usePathname();
  useEffect(() => {
    if (consent === 'yes') send('page_view', 1);
  }, [consent, pathname]);
  useEffect(() => {
    if (consent !== 'yes') return;
    let active = true;
    void import('web-vitals')
      .then(({ onCLS, onINP, onLCP }) => {
        if (!active) return;
        onCLS((metric) => {
          if (active) send('CLS', metric.value);
        });
        onINP((metric) => {
          if (active) send('INP', metric.value);
        });
        onLCP((metric) => {
          if (active) send('LCP', metric.value);
        });
      })
      .catch((error: unknown) =>
        console.error('Core Web Vitals instrumentation unavailable', error)
      );
    return () => {
      active = false;
    };
  }, [consent]);
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const base = process.env.NEXT_PUBLIC_BASE_PATH || '';
      void navigator.serviceWorker
        .register(`${base}/sw.js`, { scope: `${base}/` })
        .catch((error: unknown) =>
          console.error(
            'Offline shell and browser push registration failed',
            error
          )
        );
    }
  }, []);
  return null;
}

export function AnalyticsSetting() {
  const consent = useSyncExternalStore(subscribe, snapshot, () => 'no');
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="setting-row">
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={consent === 'yes'}
          disabled={consent === 'unavailable'}
          onChange={(event) => {
            try {
              localStorage.setItem(KEY, event.target.checked ? 'yes' : 'no');
              window.dispatchEvent(new Event(EVENT));
              setError(null);
            } catch (cause) {
              console.error('Analytics consent could not be stored', cause);
              setError(
                'Your privacy preference could not be saved. Analytics remains off.'
              );
            }
          }}
        />
        Share anonymous usage and performance counts
      </label>
      <p className="form-help">
        Off by default. No identity, search terms, concert details, or private
        notes are collected. Do Not Track always takes priority. Counts expire
        after 14 days.
      </p>
      {(error || consent === 'unavailable') && (
        <p role="alert">
          {error || 'Browser storage is unavailable. Analytics is off.'}
        </p>
      )}
    </div>
  );
}
