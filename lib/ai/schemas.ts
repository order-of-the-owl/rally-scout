import { z } from 'zod';

import { ReportConfidence } from '@/lib/domain/enums';

const text = z.string().trim().min(1);

export const scoutingReportSchema = z.object({
  headline: text,
  keyPatterns: z.array(z.object({ title: text, evidence: text, impact: text })).min(1),
  gamePlan: z.array(z.object({ tactic: text, why: text })).min(1),
  serveReceivePlan: text,
  mentalNote: text,
  confidence: z.enum(ReportConfidence),
});
export type ScoutingReport = z.infer<typeof scoutingReportSchema>;

export const matchSummarySchema = z.object({
  headline: text,
  turningPoint: text,
  whatWorked: z.array(text).min(1),
  whatToFix: z.array(text).min(1),
});
export type MatchSummary = z.infer<typeof matchSummarySchema>;
