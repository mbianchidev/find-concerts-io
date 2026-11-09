'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useApp } from '@/components/AppProvider';
import Icon from '@/components/Icon';
import ProfileSettings from '@/components/ProfileSettings';
import { AnalyticsSetting } from '@/components/Telemetry';
import { ErrorState, PageIntro } from '@/components/Ui';
import { apiData, apiUrl, useApiData } from '@/lib/api';
import { notificationConfigSchema, userSchema } from '@/lib/schema';

const enabledSchema = z.object({ enabled: z.boolean() });

function Account() {
  const { user, signIn, signOut, refreshSession, authStatus } = useApp();
  const router = useRouter();
  const params = useSearchParams();
  const client = useQueryClient();
  const [register, setRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const config = useApiData('/push-config', notificationConfigSchema);
  const pushState = useApiData(
    '/push-subscriptions',
    enabledSchema,
    user?.id || 'signed-out',
    !!user
  );
  const verificationToken = params.get('verify');
  const confirmation = useMutation({
    mutationFn: () =>
      apiData('/email-verifications/confirm', userSchema, {
        method: 'POST',
        body: JSON.stringify({ token: verificationToken }),
      }),
    onSuccess: async () => {
      await refreshSession();
      router.replace('/account');
      setMessage(
        'Email confirmed. Notifications are enabled for new followed-artist shows.'
      );
    },
  });
  const push = useMutation({
    mutationFn: async () => {
      if (
        !('serviceWorker' in navigator) ||
        !('PushManager' in window) ||
        !('Notification' in window)
      )
        throw new Error(
          'This browser does not support push notifications. Use the in-app inbox instead.'
        );
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      if (pushState.data?.enabled) {
        await apiData('/push-subscriptions', enabledSchema, {
          method: 'DELETE',
          body: JSON.stringify({ endpoint: existing?.endpoint }),
        });
        if (existing) await existing.unsubscribe();
        return false;
      }
      if (!config.data?.push || !config.data.publicKey)
        throw new Error('The server has not configured browser push.');
      if ((await Notification.requestPermission()) !== 'granted')
        throw new Error(
          'Notification permission was not granted. Change it in your browser settings to enable push.'
        );
      const base64 = config.data.publicKey
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      const key = Uint8Array.from(
        atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')),
        (character) => character.charCodeAt(0)
      );
      const subscription =
        existing ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key,
        }));
      await apiData('/push-subscriptions', enabledSchema, {
        method: 'POST',
        body: JSON.stringify(subscription.toJSON()),
      });
      return true;
    },
    onSuccess: (enabled) => {
      void client.invalidateQueries({
        queryKey: ['data', user?.id, '/push-subscriptions'],
      });
      setMessage(
        enabled
          ? 'Browser push enabled for this signed-in session.'
          : 'Browser push disabled.'
      );
    },
  });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(username, password, register);
      setPassword('');
      router.push('/saved');
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause
          : new Error('Sign-in could not be completed.')
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="container" id="main" tabIndex={-1}>
      <PageIntro
        eyebrow={user ? 'YOUR ACCOUNT / YOUR CHOICE' : 'YOUR SCENE, WITH YOU'}
        title={
          user
            ? `Hey, ${user.display_name || user.username}.`
            : authStatus === 'loading'
              ? 'Your account.'
              : 'Make room for good nights.'
        }
      >
        <p>
          {user
            ? 'Manage your notifications, privacy choices, and private concert data.'
            : 'Browse without an account. Sign in to keep your saved shows, follows, and private concert history across devices.'}
        </p>
      </PageIntro>
      {authStatus === 'loading' ? (
        <section className="panel" role="status">
          <p>Checking your account...</p>
        </section>
      ) : !user ? (
        <div className="account-grid">
          <section className="panel">
            <div
              className="filter-segments"
              role="group"
              aria-label="Account action"
            >
              <button
                aria-pressed={!register}
                onClick={() => setRegister(false)}
              >
                Sign in
              </button>
              <button aria-pressed={register} onClick={() => setRegister(true)}>
                Create account
              </button>
            </div>
            <form
              className="form-stack"
              onSubmit={(event) => void submit(event)}
            >
              <div className="form-field">
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  aria-describedby="username-help"
                  name="username"
                  autoComplete="username"
                  minLength={3}
                  maxLength={32}
                  pattern="[a-zA-Z0-9_-]+"
                  required
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                />
                <span id="username-help" className="form-help">
                  3 to 32 letters, numbers, underscores, or hyphens.
                </span>
              </div>
              <div className="form-field">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  aria-describedby="password-help"
                  name="password"
                  type="password"
                  autoComplete={register ? 'new-password' : 'current-password'}
                  minLength={12}
                  maxLength={1024}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <span id="password-help" className="form-help">
                  At least 12 characters. Passwords are salted and hashed, never
                  stored as plain text.
                </span>
              </div>
              <button className="button" disabled={busy}>
                {busy ? 'Working...' : register ? 'Create account' : 'Sign in'}
                <Icon name="arrow" />
              </button>
            </form>
            <ErrorState error={error} />
          </section>
          <aside className="panel">
            <h2>Less to manage. More to see.</h2>
            <p>
              Follow artists and venues. Keep a shortlist for the next good
              night. Bring your old spreadsheet without sharing it with the
              world.
            </p>
            <p className="muted-note">
              Guest saves stay in this browser and are not silently uploaded
              when you sign in. Account saves are stored separately.
            </p>
            <p className="muted-note">
              No social login or external account is required. Public
              registration never grants administrator access.
            </p>
          </aside>
        </div>
      ) : (
        <div className="account-grid">
          <div>
            <ProfileSettings key={user.id} user={user} />
            {verificationToken && (
              <section className="panel">
                <h2>Confirm your email.</h2>
                <p>
                  Confirm this address to enable concert emails. Your private
                  workbook notes are never included.
                </p>
                <button
                  className="button"
                  disabled={confirmation.isPending}
                  onClick={() => confirmation.mutate()}
                >
                  Confirm email and enable notifications
                </button>
                <ErrorState error={confirmation.error} />
              </section>
            )}
            <section className="panel">
              <h2>Keep your ear to the ground.</h2>
              <p>
                The in-app inbox works for every account. External notifications
                need a configured provider and your explicit permission.
              </p>
              <ErrorState error={config.error || pushState.error} />
              <div className="setting-row">
                <label>Browser push</label>
                <p>
                  {config.data?.push
                    ? 'Get an alert when a followed artist or venue has a new show. Signing out disables delivery to this session.'
                    : 'Not configured on this server. Set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT to enable it.'}
                </p>
                <button
                  className="button button-outline"
                  disabled={
                    !config.data?.push || push.isPending || pushState.isPending
                  }
                  onClick={() => push.mutate()}
                >
                  {push.isPending
                    ? 'Updating push...'
                    : pushState.data?.enabled
                      ? 'Disable browser push'
                      : 'Enable browser push'}
                </button>
                <ErrorState error={push.error} />
              </div>
              <div className="setting-row">
                <form
                  className="form-stack"
                  onSubmit={(event) => {
                    event.preventDefault();
                    setBusy(true);
                    setError(null);
                    setMessage(null);
                    void apiData(
                      '/email-verifications',
                      z.object({ confirmation_sent: z.boolean() }),
                      { method: 'POST', body: JSON.stringify({ email }) }
                    )
                      .then(() =>
                        setMessage(
                          'Confirmation email sent. Open its link while signed in to enable notifications.'
                        )
                      )
                      .catch((cause: unknown) =>
                        setError(
                          cause instanceof Error
                            ? cause
                            : new Error('Email confirmation failed.')
                        )
                      )
                      .finally(() => setBusy(false));
                  }}
                >
                  <label htmlFor="notification-email">
                    Email notifications
                    <input
                      id="notification-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      required
                      maxLength={254}
                    />
                    <span className="form-help">
                      {config.data?.email
                        ? 'Confirm ownership before emails are enabled. No address is needed for ordinary sign-in.'
                        : 'Not configured. Set SMTP_HOST and SMTP_FROM on the server to enable email delivery.'}
                    </span>
                  </label>
                  <button
                    className="button button-outline"
                    disabled={!config.data?.email || busy}
                  >
                    Send confirmation email
                  </button>
                </form>
                {user.email && (
                  <div className="setting-row">
                    <p>Verified address: {user.email}</p>
                    <button
                      className="text-button"
                      onClick={() => {
                        setError(null);
                        void apiData('/me', userSchema, {
                          method: 'PATCH',
                          body: JSON.stringify({
                            email_notifications: !user.email_notifications,
                          }),
                        })
                          .then(() => refreshSession())
                          .catch((cause: unknown) =>
                            setError(
                              cause instanceof Error
                                ? cause
                                : new Error(
                                    'Notification preference could not be updated.'
                                  )
                            )
                          );
                      }}
                    >
                      {user.email_notifications
                        ? 'Disable email notifications'
                        : 'Enable email notifications'}
                    </button>
                  </div>
                )}
              </div>
              <ErrorState error={error} />
              {message && (
                <div className="success-panel" role="status">
                  {message}
                </div>
              )}
            </section>
            <section className="panel">
              <h2>Your privacy settings.</h2>
              <AnalyticsSetting />
              <Link className="show-link" href="/privacy">
                Read how your data is handled <Icon name="arrow" />
              </Link>
            </section>
          </div>
          <aside>
            <section className="panel">
              <h2>Your data. Your call.</h2>
              <p>
                Export your private concerts, saved items, and in-app
                notifications. Password hashes and session tokens are never
                included.
              </p>
              <a className="button button-outline" href={apiUrl('/me/export')}>
                Export my data
                <Icon name="external" />
              </a>
              <button
                className="text-button"
                style={{ display: 'block' }}
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  setError(null);
                  void signOut()
                    .catch((cause: unknown) =>
                      setError(
                        cause instanceof Error
                          ? cause
                          : new Error('Sign-out failed.')
                      )
                    )
                    .finally(() => setBusy(false));
                }}
              >
                Log out
              </button>
              {user.role === 'admin' && (
                <Link className="show-link" href="/sources">
                  Collector administration <Icon name="arrow" />
                </Link>
              )}
            </section>
            <section className="panel">
              <h2>Delete your account.</h2>
              <p>
                This permanently deletes your private concerts, imports,
                follows, subscriptions, and saved items from the live database.
                It cannot be undone.
              </p>
              <form
                className="form-stack"
                onSubmit={(event) => {
                  event.preventDefault();
                  setBusy(true);
                  setError(null);
                  void apiData('/me', z.object({ deleted: z.boolean() }), {
                    method: 'DELETE',
                    body: JSON.stringify({ password: deletePassword }),
                  })
                    .then(() => signOut())
                    .catch((cause: unknown) =>
                      setError(
                        cause instanceof Error
                          ? cause
                          : new Error('Account deletion failed.')
                      )
                    )
                    .finally(() => setBusy(false));
                }}
              >
                <label htmlFor="delete-password">
                  Current password
                  <input
                    id="delete-password"
                    type="password"
                    autoComplete="current-password"
                    value={deletePassword}
                    required
                    onChange={(event) => setDeletePassword(event.target.value)}
                  />
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" required />I understand this deletes my
                  account and private data.
                </label>
                <button className="button danger-button" disabled={busy}>
                  Delete account and private data
                </button>
              </form>
            </section>
          </aside>
        </div>
      )}
    </main>
  );
}

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <main className="container" id="main">
          <p>Loading account...</p>
        </main>
      }
    >
      <AccountSession />
    </Suspense>
  );
}

function AccountSession() {
  const { user } = useApp();
  return <Account key={user?.id || 'guest'} />;
}
