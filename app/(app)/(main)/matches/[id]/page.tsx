import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { requireOnboardedUser } from '@/lib/auth';
import { liveMatchRoute, opponentRoute, Route } from '@/lib/config/routes';
import { getMatchWithPoints } from '@/lib/db/queries/matches';
import { MatchStatus, Side } from '@/lib/domain/enums';
import { matchIdSchema } from '@/lib/domain/ids';
import { deriveState } from '@/lib/domain/scoring';

interface MatchPageProps {
  params: Promise<{ id: string }>;
}

export default async function MatchPage({ params }: MatchPageProps): Promise<ReactElement> {
  const { id: userId } = await requireOnboardedUser();
  const parsedId = matchIdSchema.safeParse((await params).id);
  if (!parsedId.success) {
    notFound();
  }

  const result = await getMatchWithPoints(userId, parsedId.data);
  if (!result) {
    notFound();
  }
  const { match, points } = result;
  if (match.status === MatchStatus.InProgress) {
    redirect(liveMatchRoute(match.id));
  }

  const { games, gamesWon } = deriveState(match, points);
  const isAbandoned = match.status === MatchStatus.Abandoned;

  return (
    <section className="flex flex-col gap-8 py-6">
      <div className="flex flex-col gap-2">
        <p className="font-medium text-muted-foreground">
          vs <Link href={opponentRoute(match.opponentId)} className="underline underline-offset-4">{match.opponentName}</Link>
        </p>
        <h1 className="font-display text-5xl font-black uppercase leading-none">
          {isAbandoned ? 'Abandoned' : match.winner === Side.Me ? 'You won' : 'You lost'}{' '}
          <span className="tabular-nums text-primary">
            {gamesWon.me}–{gamesWon.opponent}
          </span>
        </h1>
      </div>

      {games.length > 0 ? (
        <ol className="flex flex-col border-t border-border">
          {games.map(({ me, opponent, winner }, index) => (
            <li key={index} className="flex items-center justify-between gap-4 border-b border-border py-3.5">
              <span className="text-muted-foreground">Game {index + 1}</span>
              <span className={`font-display text-3xl font-extrabold tabular-nums ${winner === Side.Me ? 'text-primary' : ''}`}>
                {me}–{opponent}
              </span>
            </li>
          ))}
        </ol>
      ) : null}

      <Button asChild size="large" className="w-full sm:w-auto sm:self-start">
        <Link href={Route.Dashboard}>Back to dashboard</Link>
      </Button>
    </section>
  );
}
