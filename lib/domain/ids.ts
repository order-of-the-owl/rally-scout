import { z } from 'zod';

export const userIdSchema = z.string().min(1).brand<'UserId'>();
export type UserId = z.infer<typeof userIdSchema>;

export const opponentIdSchema = z.uuid().brand<'OpponentId'>();
export type OpponentId = z.infer<typeof opponentIdSchema>;

export const matchIdSchema = z.uuid().brand<'MatchId'>();
export type MatchId = z.infer<typeof matchIdSchema>;

export const pointIdSchema = z.uuid().brand<'PointId'>();
export type PointId = z.infer<typeof pointIdSchema>;

export const scoutingReportIdSchema = z.uuid().brand<'ScoutingReportId'>();
export type ScoutingReportId = z.infer<typeof scoutingReportIdSchema>;

export const aiCallIdSchema = z.uuid().brand<'AiCallId'>();
export type AiCallId = z.infer<typeof aiCallIdSchema>;
