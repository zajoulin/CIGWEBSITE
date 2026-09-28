import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { Providers } from './providers';
import org from '../content/org.json';

export const metadata: Metadata = {
  metadataBase: new URL('https://cig.example.org'),
  title: {
    default: `${org.name} (${org.abbr}) — ${org.university.name}`,
    template: `%s — ${org.abbr} · ${org.name}`,
  },
  description: org.heroSub,
  applicationName: org.name,
  keywords: [
    'cardiology interest group',
    'CIG',
    "Al-Balqa' Applied University",
    'student medical society',
    'cardiology',
    'cardiovascular anatomy',
    'medical education',
    'interactive anatomy',
    'pathophysiology',
    'ECG',
  ],
  icons: {
    icon: [
      { url: '/brand/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/brand/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/brand/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    type: 'website',
    siteName: org.name,
    title: `${org.name} (${org.abbr}) — ${org.university.name}`,
    description: org.heroSub,
    images: [{ url: '/brand/cig-logo.png', alt: org.crest.alt }],
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#043464',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
