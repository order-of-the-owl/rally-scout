import Link from 'next/link';
import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { requireOnboardedUser } from '@/lib/auth';
import { Route } from '@/lib/config/routes';
import { listOpponents } from '@/lib/db/queries/opponents';

export default async function DashboardPage(): Promise<ReactElement> {
  const { id: userId } = await requireOnboardedUser();
  const opponents = await listOpponents(userId);

  return (
    <section className="flex flex-col gap-6 py-6">
      <h1 className="font-display text-5xl font-black uppercase leading-none">Dashboard</h1>
      <div className="flex flex-col items-start gap-4 rounded-xl border border-border bg-card p-6">
        {opponents.length === 0 ? (
          <>
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-semibold">Add your first opponent</h2>
              <p className="text-pretty text-foreground-soft">
                Pick someone you play regularly. Their matches will build into a game plan for the rematch.
              </p>
            </div>
            <Button asChild size="large">
              <Link href={Route.NewOpponent}>Add an opponent</Link>
            </Button>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-semibold">
                {opponents.length} {opponents.length === 1 ? 'opponent' : 'opponents'} on your list
              </h2>
              <p className="text-pretty text-foreground-soft">Add details about how they play, or add someone new.</p>
            </div>
            <Button asChild size="large">
              <Link href={Route.Opponents}>View opponents</Link>
            </Button>
          </>
        )}
      </div>
    </section>
  );
}
