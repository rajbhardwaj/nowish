/* app/layout.tsx */
import type { Metadata, Viewport } from 'next';
import './globals.css';

const BASE =
  process.env.NEXT_PUBLIC_BASE_URL ?? 'https://nowish.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: { default: 'Nowish', template: '%s · Nowish' },
  description: 'Spontaneous hangs with your people.',
  openGraph: {
    type: 'website',
    siteName: 'Nowish',
    url: BASE,
    title: 'Nowish',
    description: 'Spontaneous hangs with your people.',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@nowish',
    title: 'Nowish',
    description: 'Spontaneous hangs with your people.',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0b1220',
  colorScheme: 'light dark',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          backgroundColor: '#0b1220', // dark background
          color: '#e5e7eb',           // light gray text
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
        }}
      >
        <main
          style={{
            maxWidth: 640,        // ~max-w-screen-sm
            margin: '0 auto',
            padding: '24px 16px', // ~py-6 px-4
          }}
        >
          {children}
        </main>
      </body>
    </html>
  );
}