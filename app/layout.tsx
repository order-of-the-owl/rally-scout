import type { Metadata, Viewport } from 'next';
import { Big_Shoulders as BigShoulders, Instrument_Sans as InstrumentSans } from 'next/font/google';
import type { ReactElement, ReactNode } from 'react';

import './globals.css';

const displayFont = BigShoulders({
  subsets: ['latin'],
  weight: ['800', '900'],
  variable: '--font-big-shoulders',
});

const bodyFont = InstrumentSans({
  subsets: ['latin'],
  variable: '--font-instrument-sans',
});

export const metadata: Metadata = {
  title: 'Rally Scout',
  description: 'Stop losing to the same opponents for the same reasons.',
};

export const viewport: Viewport = {
  themeColor: '#0a100e',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>): ReactElement {
  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
