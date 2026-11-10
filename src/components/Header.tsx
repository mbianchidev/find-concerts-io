'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef, useState } from 'react';
import { useApp } from './AppProvider';
import Icon from './Icon';
import ThemeToggle from './ThemeToggle';

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

const links = [
  { href: '/', label: 'Discover' },
  { href: '/artists', label: 'Artists' },
  { href: '/venues', label: 'Venues' },
  { href: '/tours', label: 'Tours' },
  { href: '/saved', label: 'My shows' },
  { href: '/import', label: 'Import' },
];

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const { user, saves, signOut, authPending, authStatus } = useApp();
  const [logoutError, setLogoutError] = useState<string | null>(null);

  return (
    <header
      className="site-header"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="container header-inner" data-authenticated={!!user}>
        <Link
          href="/"
          className="brand"
          aria-label="Find Concerts home"
          onClick={() => setOpen(false)}
        >
          <span className="brand-mark">
            <Image
              src={`${BASE_PATH}/mark.svg`}
              alt=""
              aria-hidden="true"
              width={40}
              height={40}
              loading="eager"
              unoptimized
            />
          </span>
          <span>
            FIND CONCERTS
            <span className="brand-caption">GO SEE A BAND.</span>
          </span>
        </Link>
        <nav
          id="main-navigation"
          className="main-nav"
          data-open={open}
          aria-label="Main navigation"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? 'page' : undefined}
              onClick={() => setOpen(false)}
            >
              {link.label}
              {link.href === '/saved' &&
                saves.filter((item) => item.type === 'event').length > 0 && (
                  <span className="nav-count">
                    {saves.filter((item) => item.type === 'event').length}
                  </span>
                )}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <ThemeToggle />
          {authStatus === 'loading' ? (
            <span className="account-pending" role="status">
              Checking account...
            </span>
          ) : (
            <Link
              className="account-link"
              href={user ? '/account#profile' : '/account'}
              aria-label={
                user
                  ? `Profile settings for ${user.username}`
                  : authStatus === 'error'
                    ? 'Account'
                    : 'Sign in'
              }
              onClick={() => setOpen(false)}
              title={user?.username}
            >
              <Icon name="user" />
              <span>
                {user
                  ? user.username
                  : authStatus === 'error'
                    ? 'Account'
                    : 'Sign in'}
              </span>
            </Link>
          )}
          {user && (
            <button
              className="logout-button"
              disabled={authPending}
              onClick={() => {
                setLogoutError(null);
                void signOut().catch((error: unknown) =>
                  setLogoutError(
                    error instanceof Error
                      ? error.message
                      : 'Log out failed. Try again.'
                  )
                );
              }}
            >
              {authPending ? 'Working...' : 'Log out'}
            </button>
          )}
          <button
            ref={trigger}
            className="icon-button mobile-toggle"
            aria-label={open ? 'Close navigation' : 'Open navigation'}
            aria-expanded={open}
            aria-controls="main-navigation"
            onClick={() => {
              setOpen(!open);
              trigger.current?.focus();
            }}
          >
            <Icon name={open ? 'close' : 'menu'} />
          </button>
        </div>
        {logoutError && (
          <p className="container header-error" role="alert">
            {logoutError}
          </p>
        )}
      </div>
    </header>
  );
}
