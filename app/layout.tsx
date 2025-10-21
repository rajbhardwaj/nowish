import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://nowish.vercel.app'),
  title: 'Nowish',
  description: 'Make plans without planning. Spontaneous hangs that actually happen.',
  openGraph: {
    siteName: 'Nowish',
    title: 'Nowish',
    description: 'Make plans without planning. Spontaneous hangs that actually happen.',
    images: ['/opengraph-image.png'], // Next will auto-generate fallback if present; ok to leave
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nowish',
    description: 'Make plans without planning. Spontaneous hangs that actually happen.',
  },
  icons: {
    icon: '/icon.png',
    apple: '/apple-icon.png',
  },
  themeColor: '#0f1115',
  viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
