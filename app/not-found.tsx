import Link from 'next/link';
import type { ReactElement } from 'react';

import { Logo } from '@/components/app/Logo';
import { Button } from '@/components/ui/button';
import { Route } from '@/lib/config/routes';

export default function NotFound(): ReactElement {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-10 text-center">
      <Logo href={Route.Home} />
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-5xl font-black uppercase leading-none">Out of bounds</h1>
        <p className="text-pretty text-foreground-soft">We couldn&apos;t find that page.</p>
      </div>
      <Button asChild size="large">
        <Link href={Route.Dashboard}>Go to dashboard</Link>
      </Button>
    </main>
  );
}
