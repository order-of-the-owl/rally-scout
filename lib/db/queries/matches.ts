import { and, asc, desc, eq, getTableColumns } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { getOpponent } from '@/lib/db/queries/opponents';
import { matches, opponents, points } from '@/lib/db/schema';
import { MatchStatus, type PointEnding, type Side } from '@/lib/domain/enums';
import type { MatchId, UserId } from '@/lib/domain/ids';
import { canAddPoint, deriveState } from '@/lib/domain/scoring';
import type { NewMatchInput } from '@/lib/validation/match';

export type Match = typeof matches.$inferSelect;
export type Point = typeof points.$inferSelect;
export type MatchWithOpponentName = Match & { opponentName: string };

type Database = ReturnType<typeof getDb>;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

export type PointChangeResult =
  | { status: 'changed'; points: Point[] }
  | { status: 'stale'; points: Point[] }
  | { status: 'closed'; points: Point[] }
  | { status: 'not_found' };

async function lockOwnedMatch(tx: Transaction, ownerId: UserId, matchId: MatchId): Promise<Match | undefined> {
  const [match] = await tx
    .select()
    .from(matches)
    .where(and(eq(matches.id, matchId), eq(matches.ownerId, ownerId)))
    .for('update');
  return match;
}

function loadPoints(db: Database | Transaction, matchId: MatchId): Promise<Point[]> {
  return db.select().from(points).where(eq(points.matchId, matchId)).orderBy(asc(points.seq));
}

export async function createMatch(ownerId: UserId, input: NewMatchInput): Promise<Match | null> {
  const opponent = await getOpponent(ownerId, input.opponentId);
  if (!opponent) {
    return null;
  }

  const [match] = await getDb()
    .insert(matches)
    .values({ ...input, ownerId })
    .returning();
  if (!match) {
    throw new Error('Match row missing after insert');
  }
  return match;
}

export async function getMatchWithPoints(
  ownerId: UserId,
  matchId: MatchId,
): Promise<{ match: MatchWithOpponentName; points: Point[] } | null> {
  const db = getDb();
  const [match] = await db
    .select({ ...getTableColumns(matches), opponentName: opponents.name })
    .from(matches)
    .innerJoin(opponents, eq(matches.opponentId, opponents.id))
    .where(and(eq(matches.id, matchId), eq(matches.ownerId, ownerId)));
  if (!match) {
    return null;
  }
  return { match, points: await loadPoints(db, matchId) };
}

export async function getInProgressMatch(ownerId: UserId): Promise<MatchWithOpponentName | null> {
  const [match] = await getDb()
    .select({ ...getTableColumns(matches), opponentName: opponents.name })
    .from(matches)
    .innerJoin(opponents, eq(matches.opponentId, opponents.id))
    .where(and(eq(matches.ownerId, ownerId), eq(matches.status, MatchStatus.InProgress)))
    .orderBy(desc(matches.playedAt))
    .limit(1);
  return match ?? null;
}

export async function listRecentCompletedMatches(ownerId: UserId, limit: number): Promise<MatchWithOpponentName[]> {
  return getDb()
    .select({ ...getTableColumns(matches), opponentName: opponents.name })
    .from(matches)
    .innerJoin(opponents, eq(matches.opponentId, opponents.id))
    .where(and(eq(matches.ownerId, ownerId), eq(matches.status, MatchStatus.Completed)))
    .orderBy(desc(matches.completedAt))
    .limit(limit);
}

export async function recordPoint(
  ownerId: UserId,
  matchId: MatchId,
  winner: Side,
  expectedSeq: number,
): Promise<PointChangeResult> {
  return getDb().transaction(async (tx) => {
    const match = await lockOwnedMatch(tx, ownerId, matchId);
    if (!match) {
      return { status: 'not_found' };
    }

    const existing = await loadPoints(tx, matchId);
    if (match.status !== MatchStatus.InProgress) {
      return { status: 'closed', points: existing };
    }
    if (existing.length + 1 !== expectedSeq) {
      return { status: 'stale', points: existing };
    }

    const state = deriveState(match, existing);
    if (state.isComplete || !canAddPoint(state)) {
      return { status: 'closed', points: existing };
    }

    const [point] = await tx
      .insert(points)
      .values({ matchId, seq: expectedSeq, gameNumber: state.gameNumber, winner, server: state.server })
      .returning();
    if (!point) {
      throw new Error('Point row missing after insert');
    }

    const updatedPoints = [...existing, point];
    const nextState = deriveState(match, updatedPoints);
    if (nextState.isComplete) {
      await tx
        .update(matches)
        .set({ status: MatchStatus.Completed, winner: nextState.winner, completedAt: new Date() })
        .where(eq(matches.id, matchId));
    }
    return { status: 'changed', points: updatedPoints };
  });
}

export async function undoLastPoint(ownerId: UserId, matchId: MatchId, expectedSeq: number): Promise<PointChangeResult> {
  return getDb().transaction(async (tx) => {
    const match = await lockOwnedMatch(tx, ownerId, matchId);
    if (!match) {
      return { status: 'not_found' };
    }

    const existing = await loadPoints(tx, matchId);
    if (match.status === MatchStatus.Abandoned) {
      return { status: 'closed', points: existing };
    }
    const lastPoint = existing.at(-1);
    if (lastPoint?.seq !== expectedSeq) {
      return { status: 'stale', points: existing };
    }

    await tx.delete(points).where(eq(points.id, lastPoint.id));
    if (match.status === MatchStatus.Completed) {
      await tx
        .update(matches)
        .set({ status: MatchStatus.InProgress, winner: null, completedAt: null })
        .where(eq(matches.id, matchId));
    }
    return { status: 'changed', points: existing.slice(0, -1) };
  });
}

export async function tagPoint(
  ownerId: UserId,
  matchId: MatchId,
  seq: number,
  tag: { ending: PointEnding; actor: Side | null },
): Promise<boolean> {
  return getDb().transaction(async (tx) => {
    const match = await lockOwnedMatch(tx, ownerId, matchId);
    if (!match) {
      return false;
    }
    const updated = await tx
      .update(points)
      .set(tag)
      .where(and(eq(points.matchId, matchId), eq(points.seq, seq)))
      .returning({ id: points.id });
    return updated.length > 0;
  });
}

export async function abandonMatch(ownerId: UserId, matchId: MatchId): Promise<boolean> {
  const updated = await getDb()
    .update(matches)
    .set({ status: MatchStatus.Abandoned })
    .where(and(eq(matches.id, matchId), eq(matches.ownerId, ownerId), eq(matches.status, MatchStatus.InProgress)))
    .returning({ id: matches.id });
  return updated.length > 0;
}
