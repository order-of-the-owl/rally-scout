import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { ReactElement } from 'react';

import { MatchSummarySection } from '@/components/ai/MatchSummarySection';
import { MomentumChart } from '@/components/stats/MomentumChart';
import { formatPercentage, StatCard } from '@/components/stats/StatCard';
import { Button } from '@/components/ui/button';
import { requireOnboardedUser } from '@/lib/auth';
import { AUTO_SUMMARY_WINDOW_MS } from '@/lib/config/app';
import { liveMatchRoute, opponentRoute, Route } from '@/lib/config/routes';
import { getMatchWithPoints } from '@/lib/db/queries/matches';
import { MatchStatus, Side } from '@/lib/domain/enums';
import { matchIdSchema } from '@/lib/domain/ids';
import { deriveState } from '@/lib/domain/scoring';
import { computeMatchStats } from '@/lib/domain/stats';

function finishedRecently(completedAt: Date | null): boolean {
  return completedAt !== null && Date.now() - completedAt.getTime() < AUTO_SUMMARY_WINDOW_MS;
}

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
  const stats = computeMatchStats(points);
  const { pointsWon, serveReceive, winners, errors, biggestComeback, longestStreak } = stats;

  return (
    <section className="flex flex-col gap-8 py-6">
      <div className="flex flex-col gap-2">
        <p className="font-medium text-muted-foreground">
          vs{' '}
          <Link href={opponentRoute(match.opponentId)} className="underline underline-offset-4">
            {match.opponentName}
          </Link>
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
              <span
                className={`font-display text-3xl font-extrabold tabular-nums ${winner === Side.Me ? 'text-primary' : ''}`}
              >
                {me}–{opponent}
              </span>
            </li>
          ))}
        </ol>
      ) : null}

      {match.status === MatchStatus.Completed ? (
        <MatchSummarySection matchId={match.id} storedSummary={match.summary} shouldGenerateOnMount={finishedRecently(match.completedAt)} />
      ) : null}

      {points.length > 0 ? (
        <>
          <MomentumChart momentum={stats.momentum} />

          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
            <StatCard
              label="Points won"
              value={formatPercentage(pointsWon.overall)}
              detail={`${String(pointsWon.overall.won)} of ${String(pointsWon.overall.total)}`}
            />
            <StatCard
              label="On your serve"
              value={formatPercentage(pointsWon.onMyServe)}
              detail={`${String(pointsWon.onMyServe.won)} of ${String(pointsWon.onMyServe.total)}`}
            />
            <StatCard
              label="On their serve"
              value={formatPercentage(pointsWon.onTheirServe)}
              detail={`${String(pointsWon.onTheirServe.won)} of ${String(pointsWon.onTheirServe.total)}`}
            />
            <StatCard
              label="Longest streak"
              value={String(longestStreak.me)}
              detail={`They reached ${String(longestStreak.opponent)}`}
            />
            <StatCard label="Your winners" value={String(winners.me)} detail={`They hit ${String(winners.opponent)}`} />
            <StatCard label="Your errors" value={String(errors.me)} detail={`They made ${String(errors.opponent)}`} />
            <StatCard
              label="Receive errors"
              value={String(serveReceive.receiveErrors)}
              detail={`${String(serveReceive.aces)} aces, ${String(serveReceive.serveErrors)} serve errors`}
            />
            <StatCard
              label="Biggest comeback"
              value={String(biggestComeback.me)}
              detail={`Theirs was ${String(biggestComeback.opponent)}`}
            />
          </div>

          {stats.taggedPoints === 0 ? (
            <p className="text-pretty text-sm text-muted-foreground">
              Tag how points end while you score to see winners, errors and receive stats here.
            </p>
          ) : null}
        </>
      ) : null}

      <Button asChild size="large" className="w-full sm:w-auto sm:self-start">
        <Link href={Route.Dashboard}>Back to dashboard</Link>
      </Button>
    </section>
  );
}
