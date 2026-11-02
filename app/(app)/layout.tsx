import { UserButton } from '@clerk/nextjs';
import type { ReactElement, ReactNode } from 'react';

import { Logo } from '@/components/app/Logo';
import { requireUser } from '@/lib/auth';
import { Route } from '@/lib/config/routes';

export default async function AppLayout({ children }: Readonly<{ children: ReactNode }>): Promise<ReactElement> {
  await requireUser();

  return (
    <div className="mx-auto max-w-310 px-4 sm:px-6 lg:px-10">
      <header className="flex items-center justify-between gap-4 py-6">
        <Logo href={Route.Dashboard} />
        <UserButton />
      </header>
      <main>{children}</main>
    </div>
  );
}
