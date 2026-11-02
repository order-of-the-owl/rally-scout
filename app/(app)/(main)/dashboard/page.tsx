import type { ReactElement } from 'react';

import { requireOnboardedUser } from '@/lib/auth';

export default async function DashboardPage(): Promise<ReactElement> {
  await requireOnboardedUser();

  return (
    <section className="flex flex-col gap-3 py-10">
      <h1 className="font-display text-5xl font-black uppercase leading-none">Dashboard</h1>
      <p className="text-foreground-soft">Your matches and patterns will show up here.</p>
    </section>
  );
}
