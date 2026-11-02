import { Side, type PointEnding } from '@/lib/domain/enums';
import { pointTagOptions } from '@/lib/domain/point-tags';
import { canAddPoint, deriveState, type MatchSettings, type MatchState } from '@/lib/domain/scoring';
import type { StatPoint } from '@/lib/domain/stats';

export interface SimulationProfile {
  winRateOnMyServe: number;
  winRateOnTheirServe: number;
  endingWeights: Partial<Record<PointEnding, number>>;
  tagRate: number;
}

export type RandomSource = () => number;

export function createRandomSource(seed: number): RandomSource {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function pickWeighted<Option>(
  options: readonly Option[],
  weightOf: (option: Option) => number,
  random: RandomSource,
): Option {
  const totalWeight = options.reduce((total, option) => total + weightOf(option), 0);
  let remaining = random() * totalWeight;
  for (const option of options) {
    remaining -= weightOf(option);
    if (remaining <= 0) {
      return option;
    }
  }
  const [fallback] = options;
  if (fallback === undefined) {
    throw new Error('Cannot pick from an empty list');
  }
  return fallback;
}

export function simulateMatch(
  settings: MatchSettings,
  profile: SimulationProfile,
  random: RandomSource,
): { points: StatPoint[]; state: MatchState } {
  const points: StatPoint[] = [];
  let state = deriveState(settings, points);

  while (canAddPoint(state) && !state.isComplete) {
    const { server, gameNumber } = state;
    const winRate = server === Side.Me ? profile.winRateOnMyServe : profile.winRateOnTheirServe;
    const winner = random() < winRate ? Side.Me : Side.Opponent;

    const tag =
      random() < profile.tagRate
        ? pickWeighted(
            pointTagOptions(winner, server),
            ({ ending }) => profile.endingWeights[ending] ?? 1,
            random,
          )
        : null;

    points.push({ winner, server, gameNumber, ending: tag?.ending ?? null, actor: tag?.actor ?? null });
    state = deriveState(settings, points);
  }

  return { points, state };
}
