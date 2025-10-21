/* app/layout.tsx */
import type { Metadata, Viewport } from 'next';
import './globals.css';

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://nowish.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: { default: 'Nowish', template: '%s · Nowish' },
  description: 'Spontaneous hangs with your people.',
  openGraph: { type: 'website', siteName: 'Nowish', url: BASE, title: 'Nowish', description: 'Spontaneous hangs with your people.' },
  twitter: { card: 'summary_large_image', site: '@nowish', title: 'Nowish', description: 'Spontaneous hangs with your people.' },
  icons: { icon: '/favicon.ico', apple: '/apple-touch-icon.png' },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
  colorScheme: 'light',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100 text-slate-900">
        <main className="mx-auto w-full max-w-screen-sm px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}