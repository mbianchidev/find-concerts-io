'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import type { SavedItem, User } from '@/types';
import { apiData } from '@/lib/api';
import { savedItemSchema, userSchema } from '@/lib/schema';

const SAVES_KEY = 'find-concerts-saved';
const SAVES_EVENT = 'concerts-saves-changed';
const savesSchema = z.array(savedItemSchema);

function subscribe(listener: () => void) {
  window.addEventListener('storage', listener);
  window.addEventListener(SAVES_EVENT, listener);
  return () => {
    window.removeEventListener('storage', listener);
    window.removeEventListener(SAVES_EVENT, listener);
  };
}

function guestSnapshot(): string {
  try {
    const current = localStorage.getItem(SAVES_KEY);
    if (current) return current;
    const old = ['find-concerts-watchlist', 'find-concerts-wishlist'].map(
      (key) => JSON.parse(localStorage.getItem(key) || '[]')
    );
    return JSON.stringify(old.flat());
  } catch {
    return '!unreadable-storage';
  }
}

interface AppContextValue {
  user: User | null;
  ready: boolean;
  saves: SavedItem[];
  pending: boolean;
  notice: string | null;
  dismissNotice: () => void;
  toggleSaved: (type: SavedItem['type'], id: string) => Promise<void>;
  signIn: (
    username: string,
    password: string,
    register: boolean
  ) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

function AppState({ children }: { children: React.ReactNode }) {
  const client = useQueryClient();
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const snapshot = useSyncExternalStore(subscribe, guestSnapshot, () => '[]');
  const local = useMemo(() => {
    try {
      return { saves: savesSchema.parse(JSON.parse(snapshot)), error: null };
    } catch {
      return {
        saves: [],
        error:
          'Local saved data could not be read. It has not been overwritten. Check browser storage access before saving again.',
      };
    }
  }, [snapshot]);
  const session = useQuery({
    queryKey: ['session'],
    queryFn: ({ signal }) =>
      apiData('/sessions/current', userSchema.nullable(), { signal }),
    retry: false,
    staleTime: 60000,
  });
  const user = session.data || null;
  const savedQuery = useQuery({
    queryKey: ['saves', user?.id],
    queryFn: ({ signal }) => apiData('/me/saved', savesSchema, { signal }),
    enabled: !!user,
  });
  const saves = user ? savedQuery.data || [] : local.saves;
  const mutation = useMutation({
    mutationFn: (input: {
      type: SavedItem['type'];
      id: string;
      saved: boolean;
    }) =>
      apiData('/me/saved', savesSchema, {
        method: 'PUT',
        body: JSON.stringify(input),
      }),
    onSuccess: (items) => {
      client.setQueryData(['saves', user?.id], items);
      void client.invalidateQueries({ queryKey: ['page'] });
      void client.invalidateQueries({
        queryKey: ['data', user?.id, '/notifications'],
      });
    },
  });

  const toggleSaved = async (type: SavedItem['type'], id: string) => {
    setNotice(null);
    const exists = saves.some((item) => item.id === id && item.type === type);
    if (user) {
      try {
        await mutation.mutateAsync({ type, id, saved: !exists });
      } catch (error) {
        setNotice(
          error instanceof Error
            ? error.message
            : 'The item could not be saved.'
        );
      }
    } else {
      if (local.error) {
        setNotice(local.error);
        return;
      }
      const next = exists
        ? saves.filter((item) => !(item.id === id && item.type === type))
        : [...saves, { type, id, addedAt: new Date().toISOString() }];
      try {
        localStorage.setItem(SAVES_KEY, JSON.stringify(next));
        window.dispatchEvent(new Event(SAVES_EVENT));
      } catch (error) {
        console.error('Local save failed', error);
        setNotice(
          'The item could not be saved. Allow browser storage or sign in to save it to your account.'
        );
      }
    }
  };

  const refreshSession = useCallback(async () => {
    await client.invalidateQueries({ queryKey: ['session'] });
  }, [client]);

  const signIn = async (
    username: string,
    password: string,
    register: boolean
  ) => {
    const account = await apiData(
      register ? '/users' : '/sessions',
      userSchema,
      {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }
    );
    await client.cancelQueries();
    client.clear();
    client.setQueryData(['session'], account);
    setNotice(null);
    router.refresh();
  };

  const signOut = async () => {
    await apiData('/sessions/current', z.object({ signed_out: z.boolean() }), {
      method: 'DELETE',
    });
    await client.cancelQueries();
    client.clear();
    client.setQueryData(['session'], null);
    setNotice(null);
    router.refresh();
  };

  return (
    <AppContext.Provider
      value={{
        user,
        saves,
        ready: session.isSuccess && (!user || savedQuery.isSuccess),
        pending: mutation.isPending,
        notice:
          notice ||
          session.error?.message ||
          savedQuery.error?.message ||
          (!user ? local.error : null),
        dismissNotice: () => setNotice(null),
        toggleSaved,
        signIn,
        signOut,
        refreshSession,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export default function AppProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30000, retry: 1, refetchOnWindowFocus: true },
        },
      })
  );
  return (
    <QueryClientProvider client={client}>
      <AppState>{children}</AppState>
    </QueryClientProvider>
  );
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error('AppProvider is required.');
  return context;
}
