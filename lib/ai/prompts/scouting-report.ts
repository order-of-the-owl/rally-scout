import { SHARED_SYSTEM_RULES } from '@/lib/ai/prompts/shared';
import type { HeadToHead, Weakness } from '@/lib/domain/stats';

export const SCOUTING_REPORT_TOOL = 'submit_scouting_report';

export const SCOUTING_REPORT_SYSTEM = `${SHARED_SYSTEM_RULES}

Write a pre-match scouting report the player can read before a rematch. The headline is at most 10 words. "me" in the data is the player you are coaching. Key patterns state what the numbers show, with the numbers in "evidence". The game plan is 2 to 4 specific tactics. Set "confidence" to the value given in the input.`;

interface PlayerProfileInput {
  handedness: string | null;
  grip: string | null;
  playStyle: string | null;
  blade: string | null;
  forehandRubber: string | null;
  backhandRubber: string | null;
}

interface OpponentProfileInput {
  handedness: string | null;
  grip: string | null;
  playStyle: string | null;
  forehandRubberType: string | null;
  backhandRubberType: string | null;
  notes: string | null;
}

export function buildScoutingReportInput(data: {
  headToHead: HeadToHead;
  weaknesses: readonly Weakness[];
  player: PlayerProfileInput;
  opponent: OpponentProfileInput;
  confidence: string;
}): unknown {
  const { momentum, ...stats } = data.headToHead.stats;
  return {
    confidence: data.confidence,
    player: data.player,
    opponent: data.opponent,
    headToHead: {
      matches: data.headToHead.matches,
      games: data.headToHead.games,
      decidingGames: data.headToHead.decidingGames,
      pointsWonTrend: data.headToHead.pointsWonTrend,
      stats,
    },
    weaknesses: data.weaknesses.map(({ label, evidence, isLowConfidence }) => ({ label, evidence, isLowConfidence })),
  };
}
