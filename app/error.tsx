'use client';

import Link from 'next/link';
import type { ReactElement } from 'react';

import { Logo } from '@/components/app/Logo';
import { Button } from '@/components/ui/button';
import { Route } from '@/lib/config/routes';

export default function ErrorPage({ reset }: Readonly<{ reset: () => void }>): ReactElement {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-10 text-center">
      <Logo href={Route.Home} />
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-5xl font-black uppercase leading-none">Something went wrong</h1>
        <p className="text-pretty text-foreground-soft">Your saved matches are safe. Please try again.</p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button size="large" onClick={reset}>
          Try again
        </Button>
        <Button asChild size="large" variant="outline">
          <Link href={Route.Dashboard}>Go to dashboard</Link>
        </Button>
      </div>
    </main>
  );
}
