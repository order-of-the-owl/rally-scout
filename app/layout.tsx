import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata, Viewport } from 'next';
import { Big_Shoulders as BigShoulders, Instrument_Sans as InstrumentSans } from 'next/font/google';
import type { ReactElement, ReactNode } from 'react';

import { Route } from '@/lib/config/routes';

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
  viewportFit: 'cover',
};

const clerkAppearance = {
  variables: {
    colorPrimary: 'var(--primary)',
    colorPrimaryForeground: 'var(--primary-foreground)',
    colorBackground: 'var(--card)',
    colorForeground: 'var(--foreground)',
    colorMutedForeground: 'var(--muted-foreground)',
    colorInput: 'var(--card-raised)',
    colorInputForeground: 'var(--foreground)',
    colorNeutral: 'var(--foreground)',
    fontFamily: 'var(--font-sans)',
    borderRadius: 'var(--radius)',
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>): ReactElement {
  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body className="antialiased">
        <ClerkProvider
          appearance={clerkAppearance}
          signInUrl={Route.SignIn}
          signUpUrl={Route.SignUp}
          signInFallbackRedirectUrl={Route.Dashboard}
          signUpFallbackRedirectUrl={Route.Dashboard}
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
