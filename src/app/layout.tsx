import type { Metadata } from 'next';
import Link from 'next/link';
import AppProvider from '@/components/AppProvider';
import Header from '@/components/Header';
import { AppNotice } from '@/components/Ui';
import Telemetry from '@/components/Telemetry';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Find Concerts / Your next front row',
    template: '%s / Find Concerts',
  },
  description:
    'Find metal, hardcore, rock, and punk concerts from original venue listings. Follow artists, save shows, and keep your private concert history in one place.',
  keywords: [
    'metal concerts',
    'hardcore punk',
    'rock shows',
    'punk gigs',
    'live music',
  ],
  referrer: 'no-referrer',
  icons: { icon: '/mark.svg', apple: '/mark.svg' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
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
