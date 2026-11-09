'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
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
import { apiData, ApiError } from '@/lib/api';
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
  authStatus: 'loading' | 'error' | 'authenticated' | 'guest';
  authPending: boolean;
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
  changePassword: (
    current: string,
    next: string,
    confirmation: string
  ) => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

function AppState({ children }: { children: React.ReactNode }) {
  const client = useQueryClient();
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const [authPending, setAuthPending] = useState(false);
  const authLock = useRef(false);
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
    refetchOnWindowFocus: 'always',
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

  const privateQuery = (key: readonly unknown[]) =>
    key[0] === 'saves' ||
    key[0] === 'jobs' ||
    ((key[0] === 'page' || key[0] === 'data') &&
      !['public', 'guest', 'signed-out'].includes(String(key[1])));

  const replaceSession = async (account: User | null) => {
    // Keep the observed session query alive when clearing account-scoped data.
    await client.cancelQueries({
      predicate: (query) =>
        query.queryKey[0] === 'session' || privateQuery(query.queryKey),
    });
    client.removeQueries({
      predicate: (query) => privateQuery(query.queryKey),
    });
    mutation.reset();
    client.getMutationCache().clear();
    client.setQueryData(['session'], account);
    setNotice(null);
    router.refresh();
  };

  async function authenticationChange(
    operation: () => Promise<void>
  ): Promise<void> {
    if (authLock.current)
      throw new Error('Wait for the current account action to finish.');
    authLock.current = true;
    setAuthPending(true);
    try {
      await operation();
    } finally {
      authLock.current = false;
      setAuthPending(false);
    }
  }

  const confirmedSession = async (
    id: string,
    message: string
  ): Promise<User> => {
    const account = await apiData('/sessions/current', userSchema.nullable(), {
      cache: 'no-store',
    });
    if (!account || account.id !== id)
      throw new ApiError(message, 401, 'SESSION_NOT_RETAINED');
    return account;
  };

  const signIn = async (
    username: string,
    password: string,
    register: boolean
  ) => {
    await authenticationChange(async () => {
      const account = await apiData(
        register ? '/users' : '/sessions',
        userSchema,
        {
          method: 'POST',
          body: JSON.stringify({ username, password }),
        }
      );
      const confirmed = await confirmedSession(
        account.id,
        `${register ? 'Account created, but your' : 'Your'} browser did not retain the sign-in cookie. Allow cookies for this site and sign in again.`
      );
      await replaceSession(confirmed);
    });
  };

  const signOut = async () => {
    await authenticationChange(async () => {
      await apiData(
        '/sessions/current',
        z.object({ signed_out: z.boolean() }),
        { method: 'DELETE' }
      );
      await replaceSession(null);
      router.replace('/account');
    });
  };

  const changePassword = async (
    current: string,
    next: string,
    confirmation: string
  ) => {
    await authenticationChange(async () => {
      if (!user)
        throw new ApiError(
          'Sign in before changing your password.',
          401,
          'AUTHENTICATION_REQUIRED'
        );
      await apiData('/me/password', z.object({ changed: z.boolean() }), {
        method: 'PATCH',
        body: JSON.stringify({
          current_password: current,
          new_password: next,
          confirm_password: confirmation,
        }),
      });
      try {
        const account = await confirmedSession(
          user.id,
          'Password changed, but your browser did not retain the sign-in cookie. Sign in with your new password.'
        );
        await client.cancelQueries({ queryKey: ['session'] });
        client.setQueryData(['session'], account);
        await client.invalidateQueries({
          queryKey: ['data', user.id, '/push-subscriptions'],
        });
        router.refresh();
      } catch (error) {
        await replaceSession(null);
        setNotice(
          error instanceof Error
            ? error.message
            : 'The password changed, but the new session could not be verified. Sign in again.'
        );
        throw error;
      }
    });
  };

  return (
    <AppContext.Provider
      value={{
        user,
        saves,
        ready:
          session.isSuccess && !authPending && (!user || savedQuery.isSuccess),
        authStatus: session.isPending
          ? 'loading'
          : session.isError
            ? 'error'
            : user
              ? 'authenticated'
              : 'guest',
        authPending,
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
        changePassword,
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
