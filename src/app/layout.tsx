import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Find Concerts - Discover Live Music Events',
  description: 'Find concerts, festivals, and live music events worldwide. Search by artist, location, and date.',
  keywords: 'concerts, music events, festivals, live music, tickets',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        {children}
      </body>
    </html>
  );
}