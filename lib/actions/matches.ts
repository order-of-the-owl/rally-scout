'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { requireOnboardedUser } from '@/lib/auth';
import { liveMatchRoute, Route } from '@/lib/config/routes';
import { abandonMatch, createMatch, recordPoint, tagPoint, undoLastPoint } from '@/lib/db/queries/matches';
import { matchIdSchema, type MatchId } from '@/lib/domain/ids';
import { logger } from '@/lib/logger';
import { readSubmittedValues } from '@/lib/validation/form-state';
import {
  newMatchSchema,
  recordPointInputSchema,
  tagPointInputSchema,
  undoPointInputSchema,
  type LiveActionResult,
  type LivePoint,
  type NewMatchFormState,
} from '@/lib/validation/match';

function toLivePoints(points: readonly LivePoint[]): LivePoint[] {
  return points.map(({ seq, winner }) => ({ seq, winner }));
}

export async function createMatchAction(
  _previousState: NewMatchFormState,
  formData: FormData,
): Promise<NewMatchFormState> {
  const { id: userId } = await requireOnboardedUser();
  const values = readSubmittedValues(formData, newMatchSchema.keyof().options);

  const parsed = newMatchSchema.safeParse(values);
  if (!parsed.success) {
    return { status: 'invalid', fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  let matchId: MatchId;
  try {
    const match = await createMatch(userId, parsed.data);
    if (!match) {
      logger.warn('match.create_opponent_not_found', { userId, opponentId: parsed.data.opponentId });
      return { status: 'failed', values };
    }
    matchId = match.id;
  } catch (error) {
    logger.error('match.create_failed', { userId, error });
    return { status: 'failed', values };
  }

  logger.info('match.started', { userId, matchId });
  revalidatePath(Route.Dashboard);
  redirect(liveMatchRoute(matchId));
}

export async function recordPointAction(rawInput: unknown): Promise<LiveActionResult> {
  const { id: userId } = await requireOnboardedUser();
  const input = recordPointInputSchema.safeParse(rawInput);
  if (!input.success) {
    return { status: 'failed' };
  }
  const { matchId, winner, expectedSeq } = input.data;

  try {
    const result = await recordPoint(userId, matchId, winner, expectedSeq);
    switch (result.status) {
      case 'changed':
        return { status: 'ok' };
      case 'stale':
      case 'closed':
        logger.warn('match.point_rejected', { userId, matchId, reason: result.status, expectedSeq });
        return { status: 'rejected', points: toLivePoints(result.points) };
      case 'not_found':
        logger.warn('match.point_match_not_found', { userId, matchId });
        return { status: 'failed' };
    }
  } catch (error) {
    logger.error('match.point_failed', { userId, matchId, error });
    return { status: 'failed' };
  }
}

export async function undoPointAction(rawInput: unknown): Promise<LiveActionResult> {
  const { id: userId } = await requireOnboardedUser();
  const input = undoPointInputSchema.safeParse(rawInput);
  if (!input.success) {
    return { status: 'failed' };
  }
  const { matchId, expectedSeq } = input.data;

  try {
    const result = await undoLastPoint(userId, matchId, expectedSeq);
    switch (result.status) {
      case 'changed':
        return { status: 'ok' };
      case 'stale':
      case 'closed':
        logger.warn('match.undo_rejected', { userId, matchId, reason: result.status, expectedSeq });
        return { status: 'rejected', points: toLivePoints(result.points) };
      case 'not_found':
        logger.warn('match.undo_match_not_found', { userId, matchId });
        return { status: 'failed' };
    }
  } catch (error) {
    logger.error('match.undo_failed', { userId, matchId, error });
    return { status: 'failed' };
  }
}

export async function tagPointAction(rawInput: unknown): Promise<LiveActionResult> {
  const { id: userId } = await requireOnboardedUser();
  const input = tagPointInputSchema.safeParse(rawInput);
  if (!input.success) {
    return { status: 'failed' };
  }
  const { matchId, seq, ending, actor } = input.data;

  try {
    const isTagged = await tagPoint(userId, matchId, seq, { ending, actor });
    return isTagged ? { status: 'ok' } : { status: 'failed' };
  } catch (error) {
    logger.error('match.tag_failed', { userId, matchId, error });
    return { status: 'failed' };
  }
}

export async function abandonMatchAction(rawMatchId: string): Promise<void> {
  const { id: userId } = await requireOnboardedUser();
  const matchId = matchIdSchema.parse(rawMatchId);

  await abandonMatch(userId, matchId);
  logger.info('match.abandoned', { userId, matchId });
  revalidatePath(Route.Dashboard);
  redirect(Route.Dashboard);
}

export async function revalidateAfterMatchEnd(): Promise<void> {
  await requireOnboardedUser();
  revalidatePath(Route.Dashboard);
}
