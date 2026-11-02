import { SHARED_SYSTEM_RULES } from '@/lib/ai/prompts/shared';
import type { CompletedGame } from '@/lib/domain/scoring';
import type { MatchStats, MomentumSwing } from '@/lib/domain/stats';

export const MATCH_SUMMARY_TOOL = 'submit_match_summary';

export const MATCH_SUMMARY_SYSTEM = `${SHARED_SYSTEM_RULES}

Write a short post-match summary. "me" in the data is the player you are coaching. Keep the headline to one sentence. Give 1 to 3 items each for what worked and what to fix.`;

export function buildMatchSummaryInput(data: {
  result: string;
  games: readonly CompletedGame[];
  stats: MatchStats;
  biggestSwing: MomentumSwing | null;
}): unknown {
  const { momentum, ...stats } = data.stats;
  return { result: data.result, games: data.games, stats, biggestSwing: data.biggestSwing };
}
