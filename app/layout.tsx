// app/layout.tsx
import './globals.css';
import type { Metadata, Viewport } from 'next';

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
    title: 'Nowish',
    description: 'Spontaneous hangs with your people.',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // light theme to keep things readable
  themeColor: '#f8fafc',
  colorScheme: 'light',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-900 antialiased">
        <main className="mx-auto w-full max-w-2xl px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}