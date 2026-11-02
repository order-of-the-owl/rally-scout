import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import type { ReactElement, ReactNode } from 'react';

import { requireUser } from '@/lib/auth';
import { Route } from '@/lib/config/routes';

export default async function AppLayout({ children }: Readonly<{ children: ReactNode }>): Promise<ReactElement> {
  await requireUser();

  return (
    <div className="mx-auto max-w-310 px-4 sm:px-6 lg:px-10">
      <header className="flex items-center justify-between gap-4 py-6">
        <Link
          href={Route.Dashboard}
          className="flex min-h-11 items-center gap-2.5 font-display text-[1.625rem] font-extrabold tracking-wide"
        >
          <span aria-hidden="true" className="size-3.5 rounded-full bg-primary" />
          RALLY SCOUT
        </Link>
        <UserButton />
      </header>
      <main>{children}</main>
    </div>
  );
}
