import { Pencil } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactElement } from 'react';

import { ScoutingSection } from '@/components/ai/ScoutingSection';
import { BackLink } from '@/components/app/BackLink';
import { gripLabels, handednessLabels, playStyleLabels, rubberTypeLabels } from '@/components/forms/option-labels';
import { formatPercentage, formatRecord, StatCard } from '@/components/stats/StatCard';
import { WeaknessList } from '@/components/stats/WeaknessList';
import { Button } from '@/components/ui/button';
import { requireOnboardedUser } from '@/lib/auth';
import { editOpponentRoute, matchRoute, newMatchAgainstRoute, Route } from '@/lib/config/routes';
import { listScoutingReports } from '@/lib/db/queries/ai';
import { listCompletedMatchesForAnalysis } from '@/lib/db/queries/matches';
import { getOpponent } from '@/lib/db/queries/opponents';
import { Side } from '@/lib/domain/enums';
import { opponentIdSchema } from '@/lib/domain/ids';
import { computeHeadToHead, detectWeaknesses, hasEnoughDataForScouting } from '@/lib/domain/stats';

const NOT_SET = 'Not sure';

interface OpponentPageProps {
  params: Promise<{ id: string }>;
}

export default async function OpponentPage({ params }: OpponentPageProps): Promise<ReactElement> {
  const { id: userId } = await requireOnboardedUser();
  const parsedId = opponentIdSchema.safeParse((await params).id);
  if (!parsedId.success) {
    notFound();
  }

  const opponent = await getOpponent(userId, parsedId.data);
  if (!opponent) {
    notFound();
  }

  const [completedMatches, reports] = await Promise.all([
    listCompletedMatchesForAnalysis(userId, opponent.id),
    listScoutingReports(userId, opponent.id),
  ]);
  const totalPoints = completedMatches.reduce((total, { points }) => total + points.length, 0);
  const headToHead = computeHeadToHead(
    completedMatches.flatMap(({ match, points }) => (match.winner ? [{ ...match, winner: match.winner, points }] : [])),
  );
  const weaknesses = detectWeaknesses(completedMatches);

  const details = [
    { label: 'Playing hand', value: opponent.handedness ? handednessLabels[opponent.handedness] : NOT_SET },
    { label: 'Grip', value: opponent.grip ? gripLabels[opponent.grip] : NOT_SET },
    { label: 'Playing style', value: opponent.playStyle ? playStyleLabels[opponent.playStyle] : NOT_SET },
    {
      label: 'Forehand rubber',
      value: opponent.forehandRubberType ? rubberTypeLabels[opponent.forehandRubberType] : NOT_SET,
    },
    {
      label: 'Backhand rubber',
      value: opponent.backhandRubberType ? rubberTypeLabels[opponent.backhandRubberType] : NOT_SET,
    },
  ];

  return (
    <section className="flex flex-col gap-8 py-6">
      <BackLink href={Route.Opponents} label="All opponents" />
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="break-words font-display text-5xl font-black uppercase leading-none">{opponent.name}</h1>
        </div>
        <Button asChild variant="ghost" className="shrink-0">
          <Link href={editOpponentRoute(opponent.id)}>
            <Pencil aria-hidden="true" className="size-4" />
            Edit
          </Link>
        </Button>
      </div>

      <Button asChild size="large" className="w-full sm:w-auto sm:self-start">
        <Link href={newMatchAgainstRoute(opponent.id)}>Start a match</Link>
      </Button>

      <ScoutingSection
        opponentId={opponent.id}
        reports={reports}
        hasEnoughData={hasEnoughDataForScouting(completedMatches.length, totalPoints)}
      />

      {completedMatches.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">Head to head</h2>
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
            <StatCard label="Matches" value={formatRecord(headToHead.matches)} />
            <StatCard label="Games" value={formatRecord(headToHead.games)} />
            <StatCard label="Deuce games" value={formatRecord(headToHead.stats.deuceGames)} />
            <StatCard label="Deciding games" value={formatRecord(headToHead.decidingGames)} />
            <StatCard
              label="Points won"
              value={formatPercentage(headToHead.pointsWonTrend.allTime)}
              detail={`Last 5 matches: ${formatPercentage(headToHead.pointsWonTrend.recent)}`}
            />
            <StatCard label="On your serve" value={formatPercentage(headToHead.stats.pointsWon.onMyServe)} />
            <StatCard label="On their serve" value={formatPercentage(headToHead.stats.pointsWon.onTheirServe)} />
            <StatCard label="Receive errors" value={String(headToHead.stats.serveReceive.receiveErrors)} />
          </div>
        </div>
      ) : (
        <p className="text-pretty text-foreground-soft">Play a match against {opponent.name} to see your head-to-head.</p>
      )}

      {weaknesses.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">What keeps costing you</h2>
          <WeaknessList weaknesses={weaknesses} />
        </div>
      ) : null}

      <dl className="grid gap-x-8 border-t border-border sm:grid-cols-2">
        {details.map(({ label, value }) => (
          <div key={label} className="flex justify-between gap-4 border-b border-border py-3.5">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="text-right font-medium">{value}</dd>
          </div>
        ))}
      </dl>

      {completedMatches.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">Match history</h2>
          <ul className="flex flex-col border-t border-border">
            {completedMatches.map(({ match }) => (
              <li key={match.id} className="border-b border-border">
                <Link
                  href={matchRoute(match.id)}
                  className="flex min-h-12 items-center justify-between gap-4 py-2 transition-colors hover:text-primary"
                >
                  <time dateTime={match.playedAt.toISOString()} className="text-foreground-soft">
                    {match.playedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </time>
                  <span className={`font-semibold ${match.winner === Side.Me ? 'text-primary' : 'text-muted-foreground'}`}>
                    {match.winner === Side.Me ? 'Won' : 'Lost'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {opponent.notes ? (
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold">Notes</h2>
          <p className="whitespace-pre-wrap text-pretty text-foreground-soft">{opponent.notes}</p>
        </div>
      ) : null}
    </section>
  );
}
