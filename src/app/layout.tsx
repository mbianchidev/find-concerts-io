import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import AppProvider from '@/components/AppProvider';
import Header from '@/components/Header';
import { AppNotice } from '@/components/Ui';
import Telemetry from '@/components/Telemetry';
import { THEME_COLORS, THEME_SCRIPT } from '@/lib/theme';
import './globals.css';

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

export const metadata: Metadata = {
  title: {
    default: 'Find Concerts IO',
    template: '%s / Find Concerts',
  },
  description:
    'Find metal, hardcore, rock, and punk gigs. Filter by city, date, and venue. Save gigs and keep your private concert history.',
  keywords: [
    'metal concerts',
    'hardcore punk',
    'rock shows',
    'punk gigs',
    'live music',
  ],
  referrer: 'no-referrer',
  icons: {
    icon: {
      url: `${BASE_PATH}/mark.svg`,
      type: 'image/svg+xml',
      sizes: 'any',
    },
    apple: {
      url: `${BASE_PATH}/apple-touch-icon.png`,
      type: 'image/png',
      sizes: '180x180',
    },
  },
};

export const viewport: Viewport = {
  themeColor: THEME_COLORS.dark,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      {/* Browser extensions can add body attributes before hydration. */}
      <body suppressHydrationWarning>
        <AppProvider>
          <Telemetry />
          <Header />
          <AppNotice />
          {children}
          <footer className="site-footer">
            <div className="container footer-inner">
              <p>
                Find Concerts IO. Confirm dates and ticket availability with the
                venue before booking.
              </p>
              <div className="footer-links">
                <Link href="/sources">Sources</Link>
                <Link href="/integrations">Integrations</Link>
                <Link href="/privacy">Privacy</Link>
                <a
                  href="https://github.com/mbianchidev/find-concerts-io"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub
                </a>
              </div>
            </div>
          </footer>
        </AppProvider>
      </body>
    </html>
  );
}
