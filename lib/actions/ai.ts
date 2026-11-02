'use server';

import { revalidatePath } from 'next/cache';

import { AiRateLimitError } from '@/lib/ai/errors';
import { generateMatchSummary, generateScoutingReport, type ReportResult } from '@/lib/ai/reports';
import { requireOnboardedUser } from '@/lib/auth';
import { matchRoute, opponentRoute } from '@/lib/config/routes';
import { matchIdSchema, opponentIdSchema } from '@/lib/domain/ids';
import { logger } from '@/lib/logger';
import type { AiActionState } from '@/lib/validation/ai';

async function runReport(
  event: string,
  fields: Readonly<Record<string, unknown>>,
  generate: () => Promise<ReportResult>,
  path: string,
): Promise<AiActionState> {
  try {
    const result = await generate();
    if (result === 'generated') {
      logger.info(`${event}.generated`, fields);
      revalidatePath(path);
      return { status: 'generated' };
    }
    return result === 'not_enough_data' ? { status: 'not_enough_data' } : { status: 'failed' };
  } catch (error) {
    if (error instanceof AiRateLimitError) {
      return { status: 'rate_limited' };
    }
    logger.error(`${event}.failed`, { ...fields, error });
    return { status: 'failed' };
  }
}

export async function generateScoutingReportAction(rawOpponentId: string): Promise<AiActionState> {
  const user = await requireOnboardedUser();
  const parsedId = opponentIdSchema.safeParse(rawOpponentId);
  if (!parsedId.success) {
    return { status: 'failed' };
  }
  const opponentId = parsedId.data;

  return runReport(
    'scouting_report',
    { userId: user.id, opponentId },
    () => generateScoutingReport(user, opponentId),
    opponentRoute(opponentId),
  );
}

export async function generateMatchSummaryAction(rawMatchId: string): Promise<AiActionState> {
  const { id: userId } = await requireOnboardedUser();
  const parsedId = matchIdSchema.safeParse(rawMatchId);
  if (!parsedId.success) {
    return { status: 'failed' };
  }
  const matchId = parsedId.data;

  return runReport(
    'match_summary',
    { userId, matchId },
    () => generateMatchSummary(userId, matchId),
    matchRoute(matchId),
  );
}
