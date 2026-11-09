'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { User } from '@/types';
import { apiData } from '@/lib/api';
import { userSchema } from '@/lib/schema';
import { useApp } from './AppProvider';
import { ErrorState } from './Ui';

export default function ProfileSettings({ user }: { user: User }) {
  const client = useQueryClient();
  const { changePassword, authPending } = useApp();
  const [displayName, setDisplayName] = useState(user.display_name);
  const [location, setLocation] = useState(user.location);
  const [bio, setBio] = useState(user.bio);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const save = useMutation({
    mutationFn: () =>
      apiData('/me/profile', userSchema, {
        method: 'PATCH',
        body: JSON.stringify({ display_name: displayName, location, bio }),
      }),
    onSuccess: (profile) => {
      if (client.getQueryData<User | null>(['session'])?.id === profile.id) {
        client.setQueryData(['session'], profile);
        setDisplayName(profile.display_name);
        setLocation(profile.location);
        setBio(profile.bio);
      }
    },
  });
  const password = useMutation({
    mutationFn: () =>
      changePassword(currentPassword, newPassword, confirmation),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmation('');
    },
  });
  const initials = (user.display_name || user.username)
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => Array.from(part)[0])
    .join('')
    .toUpperCase();

  return (
    <>
      <section className="panel" id="profile" aria-labelledby="profile-title">
        <div className="profile-identity">
          <span className="profile-avatar" aria-hidden="true">
            {initials}
          </span>
          <div>
            <h2 id="profile-title">Profile settings.</h2>
            <p>{user.username}</p>
          </div>
        </div>
        <p>
          Your profile is private to your account. It is not published or sent
          to concert websites.
        </p>
        <form
          className="form-stack"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
        >
          <div className="form-field">
            <label htmlFor="profile-username">Username</label>
            <input
              id="profile-username"
              value={user.username}
              readOnly
              aria-describedby="profile-username-help"
            />
            <span id="profile-username-help" className="form-help">
              Your sign-in identifier stays unchanged when editing your profile.
            </span>
          </div>
          <div className="form-field">
            <label htmlFor="display-name">Display name</label>
            <input
              id="display-name"
              value={displayName}
              maxLength={80}
              autoComplete="nickname"
              disabled={save.isPending}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="profile-location">Location</label>
            <input
              id="profile-location"
              value={location}
              maxLength={120}
              disabled={save.isPending}
              placeholder="Optional city or region"
              onChange={(event) => setLocation(event.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="profile-bio">Bio</label>
            <textarea
              id="profile-bio"
              value={bio}
              maxLength={500}
              rows={4}
              disabled={save.isPending}
              onChange={(event) => setBio(event.target.value)}
              aria-describedby="profile-bio-help"
            />
            <span id="profile-bio-help" className="form-help">
              {bio.length} / 500 characters. Optional.
            </span>
          </div>
          <button className="button" disabled={save.isPending || authPending}>
            {save.isPending ? 'Saving profile...' : 'Save profile'}
          </button>
        </form>
        <ErrorState error={save.error} />
        {save.isSuccess && (
          <p className="success-panel" role="status">
            Profile saved.
          </p>
        )}
      </section>
      <section className="panel" aria-labelledby="password-title">
        <h2 id="password-title">Account security.</h2>
        <p>
          Change your password without changing your concert history. Other
          sessions are logged out; browser push must be re-enabled for the new
          session.
        </p>
        <form
          className="form-stack"
          onSubmit={(event) => {
            event.preventDefault();
            password.mutate();
          }}
        >
          <div className="form-field">
            <label htmlFor="current-password">Current password</label>
            <input
              id="current-password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={1024}
              value={currentPassword}
              disabled={authPending}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="new-password">New password</label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={1024}
              value={newPassword}
              disabled={authPending}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="confirm-new-password">Confirm new password</label>
            <input
              id="confirm-new-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={1024}
              value={confirmation}
              disabled={authPending}
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </div>
          <button
            className="button button-outline"
            disabled={authPending || password.isPending}
          >
            {password.isPending ? 'Changing password...' : 'Change password'}
          </button>
        </form>
        <ErrorState error={password.error} />
        {password.isSuccess && (
          <p className="success-panel" role="status">
            Password changed. Other sessions are logged out.
          </p>
        )}
      </section>
    </>
  );
}
