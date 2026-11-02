import { notFound, redirect } from 'next/navigation';
import type { ReactElement } from 'react';

import { Scoreboard } from '@/components/scoreboard/Scoreboard';
import { requireOnboardedUser } from '@/lib/auth';
import { matchRoute } from '@/lib/config/routes';
import { getMatchWithPoints } from '@/lib/db/queries/matches';
import { MatchStatus } from '@/lib/domain/enums';
import { matchIdSchema } from '@/lib/domain/ids';

interface LiveMatchPageProps {
  params: Promise<{ id: string }>;
}

export default async function LiveMatchPage({ params }: LiveMatchPageProps): Promise<ReactElement> {
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
  if (match.status === MatchStatus.Abandoned) {
    redirect(matchRoute(match.id));
  }

  return (
    <Scoreboard
      matchId={match.id}
      opponentName={match.opponentName}
      settings={{ bestOf: match.bestOf, firstServer: match.firstServer }}
      initialPoints={points.map(({ seq, winner }) => ({ seq, winner }))}
    />
  );
}
