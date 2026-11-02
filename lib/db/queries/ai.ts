import { and, count, desc, eq, gte } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { aiCalls, scoutingReports } from '@/lib/db/schema';
import type { AiFeature } from '@/lib/domain/enums';
import type { OpponentId, UserId } from '@/lib/domain/ids';

export type StoredScoutingReport = typeof scoutingReports.$inferSelect;

export async function countAiCallsSince(ownerId: UserId, since: Date): Promise<number> {
  const [result] = await getDb()
    .select({ total: count() })
    .from(aiCalls)
    .where(and(eq(aiCalls.ownerId, ownerId), gte(aiCalls.createdAt, since)));
  return result?.total ?? 0;
}

export async function recordAiCall(call: {
  ownerId: UserId;
  feature: AiFeature;
  model: string;
  totalTokens: number | null;
  latencyMs: number;
}): Promise<void> {
  await getDb().insert(aiCalls).values(call);
}

export async function saveScoutingReport(report: {
  ownerId: UserId;
  opponentId: OpponentId;
  statsSnapshot: unknown;
  report: unknown;
  model: string;
  matchCount: number;
}): Promise<void> {
  await getDb().insert(scoutingReports).values(report);
}

export async function listScoutingReports(ownerId: UserId, opponentId: OpponentId): Promise<StoredScoutingReport[]> {
  return getDb()
    .select()
    .from(scoutingReports)
    .where(and(eq(scoutingReports.ownerId, ownerId), eq(scoutingReports.opponentId, opponentId)))
    .orderBy(desc(scoutingReports.createdAt));
}
