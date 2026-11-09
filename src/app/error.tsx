'use client';

import { useEffect } from 'react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Concert page failed', {
      digest: error.digest,
      name: error.name,
    });
  }, [error]);
  return (
    <main className="container" id="main" tabIndex={-1}>
      <div className="page-intro">
        <p className="eyebrow">SOMETHING DID NOT LOAD</p>
        <h1>The show is not over.</h1>
        <p className="intro-copy">
          This page could not be loaded. Try again, and check the server logs if
          the problem continues.
        </p>
        <button className="button" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  );
}
