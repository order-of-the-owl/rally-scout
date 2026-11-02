import { z } from 'zod';

import { BEST_OF_OPTIONS } from '@/lib/domain/constants';
import { EventType, PointEnding, Side } from '@/lib/domain/enums';
import { matchIdSchema, opponentIdSchema } from '@/lib/domain/ids';
import type { FormState } from '@/lib/validation/form-state';

export const newMatchSchema = z.object({
  opponentId: z.uuid('Choose an opponent').pipe(opponentIdSchema),
  bestOf: z.coerce.number().pipe(z.literal(BEST_OF_OPTIONS, 'Choose a match length')),
  firstServer: z.enum(Side, 'Choose who serves first'),
  eventType: z.enum(EventType, 'Choose one'),
});

export type NewMatchInput = z.infer<typeof newMatchSchema>;
export type NewMatchField = keyof NewMatchInput;
export type NewMatchFormState = FormState<NewMatchField>;

const sequenceNumberSchema = z.number().int().positive();

export const recordPointInputSchema = z.object({
  matchId: matchIdSchema,
  winner: z.enum(Side),
  expectedSeq: sequenceNumberSchema,
});

export const undoPointInputSchema = z.object({
  matchId: matchIdSchema,
  expectedSeq: sequenceNumberSchema,
});

export const tagPointInputSchema = z.object({
  matchId: matchIdSchema,
  seq: sequenceNumberSchema,
  ending: z.enum(PointEnding),
  actor: z.enum(Side).nullable(),
});

export interface LivePoint {
  seq: number;
  winner: Side;
}

export type LiveActionResult = { status: 'ok' } | { status: 'rejected'; points: readonly LivePoint[] } | { status: 'failed' };
