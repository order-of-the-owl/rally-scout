import { describe, expect, it } from 'vitest';

import { PointEnding, Side } from '@/lib/domain/enums';
import { deriveState, type MatchSettings } from '@/lib/domain/scoring';
import { aggregateStats, type StatPoint } from '@/lib/domain/stats';
import { createRandomSource, simulateMatch, type SimulationProfile } from '@/scripts/simulate-match';

const SETTINGS: MatchSettings = { bestOf: 5, firstServer: Side.Me };
const PROFILE: SimulationProfile = {
  winRateOnMyServe: 0.52,
  winRateOnTheirServe: 0.34,
  tagRate: 0.85,
  endingWeights: { [PointEnding.ReceiveError]: 12 },
};

describe('simulateMatch', () => {
  it('produces a legal, finished match through the real engine', () => {
    const { points, state } = simulateMatch(SETTINGS, PROFILE, createRandomSource(1));

    expect(state.isComplete).toBe(true);
    expect(deriveState(SETTINGS, points)).toEqual(state);
  });

  it('is repeatable for the same seed', () => {
    const first = simulateMatch(SETTINGS, PROFILE, createRandomSource(7));
    const second = simulateMatch(SETTINGS, PROFILE, createRandomSource(7));

    expect(first.points).toEqual(second.points);
  });

  it('creates the biased pattern: over a quarter of lost points are receive errors', () => {
    const random = createRandomSource(99);
    const pointLists: StatPoint[][] = Array.from({ length: 5 }, () => simulateMatch(SETTINGS, PROFILE, random).points);

    const { pointsWon, serveReceive } = aggregateStats(pointLists);
    const lostPoints = pointsWon.overall.total - pointsWon.overall.won;

    expect(serveReceive.receiveErrors / lostPoints).toBeGreaterThan(0.25);
  });
});
