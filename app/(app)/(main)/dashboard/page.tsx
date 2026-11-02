import { ChevronRight, CirclePlay } from 'lucide-react';
import Link from 'next/link';
import type { ReactElement } from 'react';

import { WeaknessList } from '@/components/stats/WeaknessList';
import { Button } from '@/components/ui/button';
import { requireOnboardedUser } from '@/lib/auth';
import { DASHBOARD_RECENT_MATCHES_LIMIT, DASHBOARD_WEAKNESSES_LIMIT } from '@/lib/config/app';
import { liveMatchRoute, matchRoute, Route } from '@/lib/config/routes';
import { getInProgressMatch, listCompletedMatchesForAnalysis, listRecentCompletedMatches } from '@/lib/db/queries/matches';
import { listOpponents } from '@/lib/db/queries/opponents';
import { Side } from '@/lib/domain/enums';
import { detectWeaknesses } from '@/lib/domain/stats';

export default async function DashboardPage(): Promise<ReactElement> {
  const { id: userId } = await requireOnboardedUser();
  const [opponents, inProgress, recentMatches, completedMatches] = await Promise.all([
    listOpponents(userId),
    getInProgressMatch(userId),
    listRecentCompletedMatches(userId, DASHBOARD_RECENT_MATCHES_LIMIT),
    listCompletedMatchesForAnalysis(userId),
  ]);
  const topWeaknesses = detectWeaknesses(completedMatches).slice(0, DASHBOARD_WEAKNESSES_LIMIT);

  return (
    <section className="flex flex-col gap-6 py-6">
      <h1 className="font-display text-5xl font-black uppercase leading-none">Dashboard</h1>

      {inProgress ? (
        <Link
          href={liveMatchRoute(inProgress.id)}
          className="flex items-center justify-between gap-4 rounded-xl bg-primary p-5 text-primary-foreground transition-transform hover:-translate-y-0.5"
        >
          <span className="flex min-w-0 flex-col">
            <span className="text-xl font-semibold">Resume your match</span>
            <span className="truncate">vs {inProgress.opponentName}</span>
          </span>
          <CirclePlay aria-hidden="true" className="size-8 shrink-0" />
        </Link>
      ) : opponents.length === 0 ? (
        <div className="flex flex-col items-start gap-4 rounded-xl border border-border bg-card p-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold">Add your first opponent</h2>
            <p className="text-pretty text-foreground-soft">
              Pick someone you play regularly. Their matches will build into a game plan for the rematch.
            </p>
          </div>
          <Button asChild size="large">
            <Link href={Route.NewOpponent}>Add an opponent</Link>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-4 rounded-xl border border-border bg-card p-6">
          {recentMatches.length === 0 ? (
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-semibold">Play your first match</h2>
              <p className="text-pretty text-foreground-soft">
                Score it point by point, and your stats and weaknesses will show up here.
              </p>
            </div>
          ) : null}
          <Button asChild size="large" className="w-full sm:w-auto">
            <Link href={Route.NewMatch}>
              <CirclePlay aria-hidden="true" className="size-5" />
              New match
            </Link>
          </Button>
        </div>
      )}

      {topWeaknesses.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold">Your top weaknesses</h2>
          <WeaknessList weaknesses={topWeaknesses} />
        </div>
      ) : null}

      {recentMatches.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold">Recent matches</h2>
          <ul className="flex flex-col border-t border-border">
            {recentMatches.map(({ id, opponentName, winner }) => (
              <li key={id} className="border-b border-border">
                <Link
                  href={matchRoute(id)}
                  className="flex min-h-14 items-center justify-between gap-4 py-2 transition-colors hover:text-primary"
                >
                  <span className="truncate font-medium">vs {opponentName}</span>
                  <span className="flex shrink-0 items-center gap-2 text-sm font-semibold">
                    <span className={winner === Side.Me ? 'text-primary' : 'text-muted-foreground'}>
                      {winner === Side.Me ? 'Won' : 'Lost'}
                    </span>
                    <ChevronRight aria-hidden="true" className="size-5 text-muted-foreground" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
