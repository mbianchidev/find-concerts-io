import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="container" id="main" tabIndex={-1}>
      <div className="page-intro">
        <p className="eyebrow">NOT ON THIS LIST</p>
        <h1>This show is not here.</h1>
        <p className="intro-copy">
          It may no longer be available, or you may need to sign in to the
          account that owns it.
        </p>
        <div className="detail-actions">
          <Link className="button" href="/">
            Back to discovery
          </Link>
          <Link className="button button-outline" href="/account">
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
