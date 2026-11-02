import { z } from 'zod';

export const userIdSchema = z.string().min(1).brand<'UserId'>();
export type UserId = z.infer<typeof userIdSchema>;

export const opponentIdSchema = z.uuid().brand<'OpponentId'>();
export type OpponentId = z.infer<typeof opponentIdSchema>;
