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
  description: 'Spontaneous, lightweight invites for your real life.',
  openGraph: {
    siteName: 'Nowish',
    type: 'website',
    url: '/',
    title: 'Nowish',
    description: 'Spontaneous, lightweight invites for your real life.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nowish',
    description: 'Spontaneous, lightweight invites for your real life.',
  },
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
