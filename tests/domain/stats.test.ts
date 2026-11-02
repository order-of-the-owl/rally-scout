import { describe, expect, it } from 'vitest';

import { PlayStyle, PointEnding, ReportConfidence, RubberType, Side } from '@/lib/domain/enums';
import {
  aggregateStats,
  computeHeadToHead,
  computeMatchStats,
  detectWeaknesses,
  findBiggestSwing,
  hasEnoughDataForScouting,
  ratio,
  scoutingConfidence,
  WeaknessKey,
  type AnalyzedMatch,
  type MatchForWeaknesses,
  type OpponentProfile,
  type StatPoint,
} from '@/lib/domain/stats';

const { Me, Opponent } = Side;

function point(winner: Side, overrides: Partial<StatPoint> = {}): StatPoint {
  return { winner, server: Me, gameNumber: 1, ending: null, actor: null, ...overrides };
}

function repeat(count: number, build: () => StatPoint): StatPoint[] {
  return Array.from({ length: count }, build);
}

function game(gameNumber: number, ...runs: readonly (readonly [Side, number])[]): StatPoint[] {
  return runs.flatMap(([winner, count]) => repeat(count, () => point(winner, { gameNumber })));
}

const anyOpponent: OpponentProfile = { playStyle: null, forehandRubberType: null, backhandRubberType: null };

function forWeaknesses(points: readonly StatPoint[], opponent = anyOpponent): MatchForWeaknesses[] {
  return [{ opponent, points }];
}

function keysOf(matches: readonly MatchForWeaknesses[]): string[] {
  return detectWeaknesses(matches).map(({ key }) => key);
}

describe('ratio', () => {
  it('rounds percentages and has none for an empty total', () => {
    expect(ratio(1, 3)).toEqual({ won: 1, total: 3, percentage: 33 });
    expect(ratio(0, 0)).toEqual({ won: 0, total: 0, percentage: null });
  });
});

describe('computeMatchStats', () => {
  it('counts points overall and by server', () => {
    const { pointsWon } = computeMatchStats([
      point(Me, { server: Me }),
      point(Opponent, { server: Me }),
      point(Me, { server: Opponent }),
      point(Me, { server: Opponent }),
    ]);

    expect(pointsWon.overall).toEqual({ won: 3, total: 4, percentage: 75 });
    expect(pointsWon.onMyServe.percentage).toBe(50);
    expect(pointsWon.onTheirServe.percentage).toBe(100);
  });

  it('splits winners and errors by who hit the shot', () => {
    const stats = computeMatchStats([
      point(Me, { ending: PointEnding.ServeAce, actor: Me }),
      point(Opponent, { ending: PointEnding.ForehandWinner, actor: Opponent }),
      point(Opponent, { ending: PointEnding.ReceiveError, actor: Me }),
      point(Me, { ending: PointEnding.BackhandUnforcedError, actor: Opponent }),
      point(Me, { ending: PointEnding.NetOrEdge, actor: Me }),
      point(Me),
    ]);

    expect(stats.winners).toEqual({ me: 1, opponent: 1 });
    expect(stats.errors).toEqual({ me: 1, opponent: 1 });
    expect(stats.serveReceive).toMatchObject({ aces: 1, receiveErrors: 1 });
    expect(stats.taggedPoints).toBe(5);
    expect(stats.endings).toContainEqual({ ending: PointEnding.ReceiveError, actor: Me, count: 1 });
  });

  it('calculates the third-ball win rate', () => {
    const { serveReceive } = computeMatchStats([
      point(Me, { ending: PointEnding.ThirdBallWinner, actor: Me }),
      point(Opponent, { ending: PointEnding.ThirdBallError, actor: Me }),
      point(Opponent, { ending: PointEnding.ThirdBallError, actor: Me }),
    ]);

    expect(serveReceive.thirdBallWinRate).toEqual({ won: 1, total: 3, percentage: 33 });
  });

  it('counts deuce and close games only when they finish', () => {
    const stats = computeMatchStats([
      ...game(1, [Me, 10], [Opponent, 10], [Me, 2]),
      ...game(2, [Opponent, 10], [Me, 9], [Opponent, 1]),
      ...game(3, [Me, 11]),
      ...game(4, [Me, 10], [Opponent, 10]),
    ]);

    expect(stats.deuceGames).toEqual({ won: 1, total: 1, percentage: 100 });
    expect(stats.closeGames).toEqual({ won: 1, total: 2, percentage: 50 });
  });

  it('tracks lead, comeback and streak for each player', () => {
    const stats = computeMatchStats(game(1, [Opponent, 6], [Me, 11]));

    expect(stats.biggestLead).toEqual({ me: 5, opponent: 6 });
    expect(stats.biggestComeback).toEqual({ me: 6, opponent: 0 });
    expect(stats.longestStreak).toEqual({ me: 11, opponent: 6 });
  });

  it('does not count a comeback in an unfinished game', () => {
    expect(computeMatchStats(game(1, [Opponent, 6], [Me, 8])).biggestComeback).toEqual({ me: 0, opponent: 0 });
  });

  it('builds a running momentum series across games', () => {
    const { momentum } = computeMatchStats([...game(1, [Me, 2]), ...game(2, [Opponent, 1])]);

    expect(momentum).toEqual([
      { point: 1, difference: 1, gameNumber: 1 },
      { point: 2, difference: 2, gameNumber: 1 },
      { point: 3, difference: 1, gameNumber: 2 },
    ]);
  });

  it('handles an empty match', () => {
    const stats = computeMatchStats([]);

    expect(stats.pointsWon.overall.percentage).toBeNull();
    expect(stats.momentum).toEqual([]);
  });
});

describe('aggregateStats', () => {
  it('keeps games from different matches separate even with the same game number', () => {
    const stats = aggregateStats([game(1, [Me, 11]), game(1, [Opponent, 11])]);

    expect(stats.pointsWon.overall).toEqual({ won: 11, total: 22, percentage: 50 });
    expect(stats.longestStreak).toEqual({ me: 11, opponent: 11 });
  });

  it('adds deuce records and combines ending counts across matches', () => {
    const deuceWin = game(1, [Me, 10], [Opponent, 10], [Me, 2]);
    const ace = point(Me, { ending: PointEnding.ServeAce, actor: Me });

    const stats = aggregateStats([[...deuceWin, ace], [...deuceWin, ace]]);

    expect(stats.deuceGames).toEqual({ won: 2, total: 2, percentage: 100 });
    expect(stats.endings).toEqual([{ ending: PointEnding.ServeAce, actor: Me, count: 2 }]);
    expect(stats.serveReceive.aces).toBe(2);
  });
});

describe('computeHeadToHead', () => {
  function match(winner: Side, daysAgo: number, points: StatPoint[], bestOf: 3 | 5 | 7 = 3): AnalyzedMatch {
    return { winner, bestOf, playedAt: new Date(2026, 10, 30 - daysAgo), points };
  }

  it('reports match, game and deciding-game records', () => {
    const headToHead = computeHeadToHead([
      match(Me, 1, [...game(1, [Me, 11]), ...game(2, [Me, 11])]),
      match(Opponent, 2, [...game(1, [Me, 11]), ...game(2, [Opponent, 11]), ...game(3, [Opponent, 11])]),
    ]);

    expect(headToHead.matches).toEqual({ won: 1, total: 2, percentage: 50 });
    expect(headToHead.games).toEqual({ won: 3, total: 5, percentage: 60 });
    expect(headToHead.decidingGames).toEqual({ won: 0, total: 1, percentage: 0 });
  });

  it('compares the last 5 matches with all time', () => {
    const recentWins = Array.from({ length: 5 }, (_, index) => match(Me, index, game(1, [Me, 11])));
    const oldLoss = match(Opponent, 30, game(1, [Opponent, 11]));

    const { pointsWonTrend } = computeHeadToHead([oldLoss, ...recentWins]);

    expect(pointsWonTrend.recent.percentage).toBe(100);
    expect(pointsWonTrend.allTime.percentage).toBe(83);
  });

  it('handles no matches', () => {
    expect(computeHeadToHead([]).matches.percentage).toBeNull();
  });
});

describe('detectWeaknesses', () => {
  const receiveError = (): StatPoint => point(Opponent, { server: Opponent, ending: PointEnding.ReceiveError, actor: Me });
  const lostUntagged = (): StatPoint => point(Opponent, { server: Opponent });
  const wonOnServe = (): StatPoint => point(Me, { server: Me });
  const wonReceiving = (): StatPoint => point(Me, { server: Opponent });

  it('flags receive errors at 25% of lost points and not below', () => {
    const atThreshold = [...repeat(10, receiveError), ...repeat(30, lostUntagged), ...repeat(40, wonOnServe)];
    const below = [...repeat(9, receiveError), ...repeat(31, lostUntagged), ...repeat(40, wonOnServe)];

    const [weakness] = detectWeaknesses(forWeaknesses(atThreshold));
    expect(weakness?.key).toBe(WeaknessKey.ReceiveErrors);
    expect(weakness?.evidence).toBe('25% of your lost points are receive errors');
    expect(keysOf(forWeaknesses(below))).not.toContain(WeaknessKey.ReceiveErrors);
  });

  it('flags a low serve hold', () => {
    const lostOnServe = (): StatPoint => point(Opponent, { server: Me });

    expect(keysOf(forWeaknesses([...repeat(11, wonOnServe), ...repeat(20, lostOnServe)]))).toContain(
      WeaknessKey.ServeHoldLow,
    );
    expect(keysOf(forWeaknesses([...repeat(20, wonOnServe), ...repeat(20, lostOnServe)]))).not.toContain(
      WeaknessKey.ServeHoldLow,
    );
  });

  it('flags third-ball errors exceeding winners', () => {
    const thirdError = (): StatPoint => point(Opponent, { ending: PointEnding.ThirdBallError, actor: Me });
    const thirdWinner = (): StatPoint => point(Me, { ending: PointEnding.ThirdBallWinner, actor: Me });

    expect(keysOf(forWeaknesses([...repeat(3, thirdError), ...repeat(2, thirdWinner)]))).toContain(WeaknessKey.ThirdBall);
    expect(keysOf(forWeaknesses([...repeat(2, thirdError), ...repeat(2, thirdWinner)]))).not.toContain(
      WeaknessKey.ThirdBall,
    );
  });

  it('flags the wing with twice the unforced errors', () => {
    const backhandError = (): StatPoint =>
      point(Opponent, { ending: PointEnding.BackhandUnforcedError, actor: Me });
    const forehandError = (): StatPoint =>
      point(Opponent, { ending: PointEnding.ForehandUnforcedError, actor: Me });

    const backhandHeavy = keysOf(forWeaknesses([...repeat(6, backhandError), ...repeat(3, forehandError)]));
    const forehandHeavy = keysOf(forWeaknesses([...repeat(3, backhandError), ...repeat(6, forehandError)]));
    const balanced = keysOf(forWeaknesses([...repeat(6, backhandError), ...repeat(4, forehandError)]));

    expect(backhandHeavy).toContain(WeaknessKey.BackhandErrors);
    expect(forehandHeavy).toContain(WeaknessKey.ForehandErrors);
    expect(balanced).not.toContain(WeaknessKey.BackhandErrors);
  });

  it('needs a minimum number of wing errors', () => {
    const backhandError = (): StatPoint =>
      point(Opponent, { ending: PointEnding.BackhandUnforcedError, actor: Me });

    expect(keysOf(forWeaknesses(repeat(4, backhandError)))).not.toContain(WeaknessKey.BackhandErrors);
  });

  it('flags a poor deuce record once enough deuce games exist', () => {
    const deuceLoss = (): StatPoint[] => game(1, [Opponent, 10], [Me, 10], [Opponent, 2]);
    const deuceWin = (): StatPoint[] => game(1, [Me, 10], [Opponent, 10], [Me, 2]);
    const asMatches = (lists: StatPoint[][]): MatchForWeaknesses[] =>
      lists.map((points) => ({ opponent: anyOpponent, points }));

    const poorRecord = asMatches([deuceLoss(), deuceLoss(), deuceLoss(), deuceWin()]);
    const tooFew = asMatches([deuceLoss(), deuceLoss()]);

    const weakness = detectWeaknesses(poorRecord).find(({ key }) => key === WeaknessKey.DeuceRecord);
    expect(weakness?.evidence).toBe('You are 1–3 in deuce games');
    expect(keysOf(tooFew)).not.toContain(WeaknessKey.DeuceRecord);
  });

  it('flags opponent types 10 points below your average', () => {
    const longPips: OpponentProfile = { ...anyOpponent, backhandRubberType: RubberType.LongPips };
    const chopper: OpponentProfile = { ...anyOpponent, playStyle: PlayStyle.DefenderChopper };
    const lost = (): StatPoint => point(Opponent);
    const won = (): StatPoint => point(Me);

    const matches: MatchForWeaknesses[] = [
      { opponent: anyOpponent, points: repeat(40, won) },
      { opponent: longPips, points: [...repeat(5, won), ...repeat(15, lost)] },
      { opponent: chopper, points: [...repeat(5, won), ...repeat(15, lost)] },
    ];

    const keys = keysOf(matches);
    expect(keys).toContain(WeaknessKey.VsLongPips);
    expect(keys).toContain(WeaknessKey.VsChopper);
    expect(keysOf(forWeaknesses(repeat(10, won), longPips))).not.toContain(WeaknessKey.VsLongPips);
  });

  it('marks small samples as low confidence and ranks them last', () => {
    const smallSample = forWeaknesses([...repeat(3, receiveError), ...repeat(2, wonReceiving)]);
    const largeSample: MatchForWeaknesses[] = [
      {
        opponent: anyOpponent,
        points: [...repeat(35, receiveError), ...repeat(15, lostUntagged), ...repeat(10, wonOnServe)],
      },
      {
        opponent: anyOpponent,
        points: [...repeat(12, () => point(Opponent, { server: Me })), ...repeat(10, wonOnServe)],
      },
    ];

    expect(detectWeaknesses(smallSample)[0]?.isLowConfidence).toBe(true);

    const ranked = detectWeaknesses(largeSample);
    const firstLowConfidence = ranked.findIndex(({ isLowConfidence }) => isLowConfidence);
    const lastConfident = ranked.map(({ isLowConfidence }) => isLowConfidence).lastIndexOf(false);
    expect(firstLowConfidence === -1 || firstLowConfidence > lastConfident).toBe(true);
    expect(ranked[0]?.isLowConfidence).toBe(false);
  });

  it('returns nothing without data', () => {
    expect(detectWeaknesses([])).toEqual([]);
  });
});

describe('findBiggestSwing', () => {
  function momentumOf(...runs: readonly (readonly [Side, number])[]) {
    return computeMatchStats(game(1, ...runs)).momentum;
  }

  it('finds a comeback in my favour', () => {
    expect(findBiggestSwing(momentumOf([Opponent, 6], [Me, 9]))).toMatchObject({
      beneficiary: Me,
      fromPoint: 6,
      toPoint: 15,
      swing: 9,
    });
  });

  it('finds a collapse in their favour', () => {
    expect(findBiggestSwing(momentumOf([Me, 4], [Opponent, 7]))).toMatchObject({
      beneficiary: Opponent,
      fromPoint: 4,
      toPoint: 11,
      swing: 7,
    });
  });

  it('has none for an empty match', () => {
    expect(findBiggestSwing([])).toBeNull();
  });
});

describe('scouting thresholds', () => {
  it('needs one completed match and 30 points', () => {
    expect(hasEnoughDataForScouting(0, 40)).toBe(false);
    expect(hasEnoughDataForScouting(1, 29)).toBe(false);
    expect(hasEnoughDataForScouting(1, 30)).toBe(true);
  });

  it.each([
    [1, ReportConfidence.Low],
    [2, ReportConfidence.Low],
    [3, ReportConfidence.Medium],
    [5, ReportConfidence.Medium],
    [6, ReportConfidence.High],
  ])('%i matches gives %s confidence', (matches, confidence) => {
    expect(scoutingConfidence(matches)).toBe(confidence);
  });
});
