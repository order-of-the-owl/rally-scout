'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { requireOnboardedUser } from '@/lib/auth';
import { opponentRoute, Route } from '@/lib/config/routes';
import { createOpponent, updateOpponent } from '@/lib/db/queries/opponents';
import { opponentIdSchema, type OpponentId } from '@/lib/domain/ids';
import { logger } from '@/lib/logger';
import { readSubmittedValues } from '@/lib/validation/form-state';
import { opponentSchema, type OpponentFormState } from '@/lib/validation/opponent';

export async function createOpponentAction(
  _previousState: OpponentFormState,
  formData: FormData,
): Promise<OpponentFormState> {
  const { id: userId } = await requireOnboardedUser();
  const values = readSubmittedValues(formData, opponentSchema.keyof().options);

  const parsed = opponentSchema.safeParse(values);
  if (!parsed.success) {
    return { status: 'invalid', fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  let opponentId: OpponentId;
  try {
    ({ id: opponentId } = await createOpponent(userId, parsed.data));
  } catch (error) {
    logger.error('opponent.create_failed', { userId, error });
    return { status: 'failed', values };
  }

  logger.info('opponent.created', { userId, opponentId });
  revalidatePath(Route.Opponents);
  redirect(opponentRoute(opponentId));
}

export async function updateOpponentAction(
  rawOpponentId: string,
  _previousState: OpponentFormState,
  formData: FormData,
): Promise<OpponentFormState> {
  const { id: userId } = await requireOnboardedUser();
  const values = readSubmittedValues(formData, opponentSchema.keyof().options);

  const parsed = opponentSchema.safeParse(values);
  if (!parsed.success) {
    return { status: 'invalid', fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  const opponentId = opponentIdSchema.parse(rawOpponentId);
  try {
    const updated = await updateOpponent(userId, opponentId, parsed.data);
    if (!updated) {
      logger.warn('opponent.update_not_found', { userId, opponentId });
      return { status: 'failed', values };
    }
  } catch (error) {
    logger.error('opponent.update_failed', { userId, opponentId, error });
    return { status: 'failed', values };
  }

  logger.info('opponent.updated', { userId, opponentId });
  revalidatePath(Route.Opponents);
  redirect(opponentRoute(opponentId));
}
