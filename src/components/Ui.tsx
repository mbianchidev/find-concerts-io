'use client';

import Link from 'next/link';
import { useApp } from './AppProvider';
import Icon from './Icon';

export function PageIntro({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-intro">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {children && <div className="intro-copy">{children}</div>}
    </div>
  );
}

export function EmptyState({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon name="music" />
      </span>
      <h3>{title}</h3>
      <div>{children}</div>
    </div>
  );
}

export function ErrorState({
  error,
  retry,
}: {
  error: Error | null;
  retry?: () => void;
}) {
  if (!error) return null;
  return (
    <div className="error-panel" role="alert">
      <p>{error.message}</p>
      {retry && (
        <button className="button button-outline" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function LoadingGrid() {
  return (
    <div className="event-grid" role="status">
      <span className="sr-only">Loading concerts</span>
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="skeleton-card" aria-hidden="true">
          <div className="skeleton poster-skeleton" />
          <div className="skeleton line-skeleton" />
          <div className="skeleton line-skeleton short" />
        </div>
      ))}
    </div>
  );
}

export function Pager({
  page,
  total,
  hasNext,
  onChange,
}: {
  page: number;
  total: number;
  hasNext: boolean;
  onChange: (page: number) => void;
}) {
  if (page === 1 && !hasNext) return null;
  return (
    <nav className="pager" aria-label="Results pages">
      <button
        className="button button-outline"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
      >
        Previous
      </button>
      <span>
        Page {page} / {total} results
      </span>
      <button
        className="button button-outline"
        disabled={!hasNext}
        onClick={() => onChange(page + 1)}
      >
        Next
      </button>
    </nav>
  );
}

export function AccountGate({ children }: { children: React.ReactNode }) {
  return (
    <EmptyState title="Sign in to continue.">
      <p>{children}</p>
      <Link className="button" href="/account">
        Sign in or create an account <Icon name="arrow" />
      </Link>
    </EmptyState>
  );
}

export function AppNotice() {
  const { notice, dismissNotice, refreshSession } = useApp();
  if (!notice) return null;
  return (
    <div className="app-notice container" role="alert">
      <span>{notice}</span>
      <button
        className="text-button"
        onClick={() => {
          dismissNotice();
          void refreshSession();
        }}
      >
        Retry
      </button>
    </div>
  );
}
