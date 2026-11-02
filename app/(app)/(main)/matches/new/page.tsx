import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactElement } from 'react';
import { z } from 'zod';

import { NewMatchForm } from '@/components/matches/NewMatchForm';
import { Button } from '@/components/ui/button';
import { requireOnboardedUser } from '@/lib/auth';
import { liveMatchRoute, Route } from '@/lib/config/routes';
import { getInProgressMatch } from '@/lib/db/queries/matches';
import { listOpponents } from '@/lib/db/queries/opponents';

const searchParamsSchema = z.object({ opponent: z.string().optional().catch(undefined) });

interface NewMatchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function NewMatchPage({ searchParams }: NewMatchPageProps): Promise<ReactElement> {
  const { id: userId } = await requireOnboardedUser();
  const inProgress = await getInProgressMatch(userId);
  if (inProgress) {
    redirect(liveMatchRoute(inProgress.id));
  }

  const { opponent: preselectedOpponentId } = searchParamsSchema.parse(await searchParams);
  const opponents = await listOpponents(userId);

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-8 py-6">
      <h1 className="font-display text-5xl font-black uppercase leading-none">New match</h1>
      {opponents.length === 0 ? (
        <div className="flex flex-col items-start gap-4 rounded-xl border border-border bg-card p-6">
          <p className="text-pretty text-foreground-soft">Add the player you&apos;re facing first. A name is enough.</p>
          <Button asChild size="large">
            <Link href={Route.NewOpponent}>Add an opponent</Link>
          </Button>
        </div>
      ) : (
        <NewMatchForm
          opponents={opponents.map(({ id, name }) => ({ id, name }))}
          preselectedOpponentId={preselectedOpponentId}
        />
      )}
    </section>
  );
}
