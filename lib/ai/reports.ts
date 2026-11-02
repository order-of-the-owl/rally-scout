import { callStructured } from '@/lib/ai/client';
import { buildMatchSummaryInput, MATCH_SUMMARY_SYSTEM, MATCH_SUMMARY_TOOL } from '@/lib/ai/prompts/match-summary';
import {
  buildScoutingReportInput,
  SCOUTING_REPORT_SYSTEM,
  SCOUTING_REPORT_TOOL,
} from '@/lib/ai/prompts/scouting-report';
import { matchSummarySchema, scoutingReportSchema } from '@/lib/ai/schemas';
import { getEnv } from '@/lib/config/env';
import { saveScoutingReport } from '@/lib/db/queries/ai';
import { getMatchWithPoints, listCompletedMatchesForAnalysis, saveMatchSummary } from '@/lib/db/queries/matches';
import { getOpponent } from '@/lib/db/queries/opponents';
import type { User } from '@/lib/db/queries/users';
import { AiFeature, MatchStatus, Side } from '@/lib/domain/enums';
import type { MatchId, OpponentId, UserId } from '@/lib/domain/ids';
import { deriveState } from '@/lib/domain/scoring';
import {
  computeHeadToHead,
  computeMatchStats,
  detectWeaknesses,
  findBiggestSwing,
  hasEnoughDataForScouting,
  scoutingConfidence,
} from '@/lib/domain/stats';

export type ReportResult = 'generated' | 'not_enough_data' | 'not_found';

export async function generateScoutingReport(user: User, opponentId: OpponentId): Promise<ReportResult> {
  const opponent = await getOpponent(user.id, opponentId);
  if (!opponent) {
    return 'not_found';
  }

  const completed = await listCompletedMatchesForAnalysis(user.id, opponentId);
  const totalPoints = completed.reduce((total, { points }) => total + points.length, 0);
  if (!hasEnoughDataForScouting(completed.length, totalPoints)) {
    return 'not_enough_data';
  }

  const headToHead = computeHeadToHead(
    completed.flatMap(({ match, points }) => (match.winner ? [{ ...match, winner: match.winner, points }] : [])),
  );
  const confidence = scoutingConfidence(completed.length);
  const { AI_MODEL_REPORT, AI_MODEL_FAST } = getEnv();

  const { data: report, model } = await callStructured({
    userId: user.id,
    feature: AiFeature.ScoutingReport,
    model: AI_MODEL_REPORT,
    fallbackModel: AI_MODEL_FAST,
    system: SCOUTING_REPORT_SYSTEM,
    input: buildScoutingReportInput({
      headToHead,
      weaknesses: detectWeaknesses(completed),
      confidence,
      player: {
        handedness: user.handedness,
        grip: user.grip,
        playStyle: user.playStyle,
        blade: user.blade,
        forehandRubber: user.forehandRubber,
        backhandRubber: user.backhandRubber,
      },
      opponent: {
        handedness: opponent.handedness,
        grip: opponent.grip,
        playStyle: opponent.playStyle,
        forehandRubberType: opponent.forehandRubberType,
        backhandRubberType: opponent.backhandRubberType,
        notes: opponent.notes,
      },
    }),
    schema: scoutingReportSchema,
    toolName: SCOUTING_REPORT_TOOL,
  });

  await saveScoutingReport({
    ownerId: user.id,
    opponentId,
    statsSnapshot: headToHead,
    report: { ...report, confidence },
    model,
    matchCount: completed.length,
  });
  return 'generated';
}

export async function generateMatchSummary(userId: UserId, matchId: MatchId): Promise<ReportResult> {
  const result = await getMatchWithPoints(userId, matchId);
  if (!result) {
    return 'not_found';
  }

  const { match, points } = result;
  if (match.status !== MatchStatus.Completed) {
    return 'not_enough_data';
  }

  const { games } = deriveState(match, points);
  const stats = computeMatchStats(points);
  const { AI_MODEL_REPORT, AI_MODEL_FAST } = getEnv();
  const { data: summary } = await callStructured({
    userId,
    feature: AiFeature.MatchSummary,
    model: AI_MODEL_REPORT,
    fallbackModel: AI_MODEL_FAST,
    system: MATCH_SUMMARY_SYSTEM,
    input: buildMatchSummaryInput({
      result: match.winner === Side.Me ? 'me won' : 'opponent won',
      games,
      stats,
      biggestSwing: findBiggestSwing(stats.momentum),
    }),
    schema: matchSummarySchema,
    toolName: MATCH_SUMMARY_TOOL,
  });

  await saveMatchSummary(userId, matchId, summary);
  return 'generated';
}
