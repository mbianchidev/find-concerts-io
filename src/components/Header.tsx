'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef, useState } from 'react';
import { useApp } from './AppProvider';
import Icon from './Icon';

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
  const { user, saves } = useApp();

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
      <div className="container header-inner">
        <Link
          href="/"
          className="brand"
          aria-label="Find Concerts home"
          onClick={() => setOpen(false)}
        >
          <span className="brand-mark">
            <svg
              viewBox="0 0 32 32"
              width="26"
              height="26"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M6 10v12M12 5v22M18 10v12M24 7v18"
                stroke="currentColor"
                strokeWidth="3"
              />
            </svg>
          </span>
          <span>
            FIND CONCERTS
            <span className="brand-caption">GOOD MUSIC. REAL PLANS.</span>
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
          <Link
            className="account-link"
            href="/account"
            aria-label={user ? 'Account settings' : 'Sign in'}
            onClick={() => setOpen(false)}
          >
            <Icon name="user" />
            <span>{user ? user.username : 'Sign in'}</span>
          </Link>
          <button
            ref={trigger}
            className="icon-button mobile-toggle"
            aria-label={open ? 'Close navigation' : 'Open navigation'}
            aria-expanded={open}
            aria-controls="main-navigation"
            onClick={() => setOpen(!open)}
          >
            <Icon name={open ? 'close' : 'menu'} />
          </button>
        </div>
      </div>
    </header>
  );
}
