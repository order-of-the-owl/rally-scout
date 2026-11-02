import {
  DEUCE_SCORE,
  RECENT_MATCHES_FOR_TREND,
  ScoutingThreshold,
  WINNING_MARGIN,
  WeaknessThreshold,
} from '@/lib/domain/constants';
import { PlayStyle, PointEnding, ReportConfidence, RubberType, Side } from '@/lib/domain/enums';
import { gameWinner, type BestOf, type Score } from '@/lib/domain/scoring';

export interface StatPoint {
  winner: Side;
  server: Side;
  gameNumber: number;
  ending: PointEnding | null;
  actor: Side | null;
}

export interface Ratio {
  won: number;
  total: number;
  percentage: number | null;
}

export interface EndingCount {
  ending: PointEnding;
  actor: Side | null;
  count: number;
}

export interface MomentumPoint {
  point: number;
  difference: number;
  gameNumber: number;
}

export interface MatchStats {
  pointsWon: { overall: Ratio; onMyServe: Ratio; onTheirServe: Ratio };
  winners: Score;
  errors: Score;
  endings: readonly EndingCount[];
  serveReceive: {
    aces: number;
    serveErrors: number;
    receiveErrors: number;
    thirdBallWinners: number;
    thirdBallErrors: number;
    thirdBallWinRate: Ratio;
  };
  wingUnforcedErrors: { forehand: number; backhand: number };
  deuceGames: Ratio;
  closeGames: Ratio;
  biggestLead: Score;
  biggestComeback: Score;
  longestStreak: Score;
  momentum: readonly MomentumPoint[];
  taggedPoints: number;
}

export interface AnalyzedMatch {
  winner: Side;
  bestOf: BestOf;
  playedAt: Date;
  points: readonly StatPoint[];
}

export interface HeadToHead {
  matches: Ratio;
  games: Ratio;
  decidingGames: Ratio;
  stats: MatchStats;
  pointsWonTrend: { recent: Ratio; allTime: Ratio };
}

const WINNER_ENDINGS: ReadonlySet<PointEnding> = new Set([
  PointEnding.ServeAce,
  PointEnding.ThirdBallWinner,
  PointEnding.ForehandWinner,
  PointEnding.BackhandWinner,
]);

const ERROR_ENDINGS: ReadonlySet<PointEnding> = new Set([
  PointEnding.ServeError,
  PointEnding.ReceiveError,
  PointEnding.ThirdBallError,
  PointEnding.ForehandUnforcedError,
  PointEnding.BackhandUnforcedError,
  PointEnding.ForcedError,
]);

function otherSide(side: Side): Side {
  return side === Side.Me ? Side.Opponent : Side.Me;
}

export function ratio(won: number, total: number): Ratio {
  return { won, total, percentage: total === 0 ? null : Math.round((won / total) * 100) };
}

function addRatios(first: Ratio, second: Ratio): Ratio {
  return ratio(first.won + second.won, first.total + second.total);
}

function countWhere(points: readonly StatPoint[], predicate: (point: StatPoint) => boolean): number {
  return points.reduce((count, point) => (predicate(point) ? count + 1 : count), 0);
}

function pointsWonRatio(points: readonly StatPoint[]): Ratio {
  return ratio(countWhere(points, ({ winner }) => winner === Side.Me), points.length);
}

function groupByGame(points: readonly StatPoint[]): StatPoint[][] {
  const games = new Map<number, StatPoint[]>();
  for (const point of points) {
    const game = games.get(point.gameNumber);
    if (game) {
      game.push(point);
    } else {
      games.set(point.gameNumber, [point]);
    }
  }
  return [...games.values()];
}

function finalScore(game: readonly StatPoint[]): Score {
  return {
    me: countWhere(game, ({ winner }) => winner === Side.Me),
    opponent: countWhere(game, ({ winner }) => winner === Side.Opponent),
  };
}

function countEndings(points: readonly StatPoint[]): EndingCount[] {
  const counts = new Map<string, EndingCount>();
  for (const { ending, actor } of points) {
    if (ending) {
      const key = `${ending}:${String(actor)}`;
      const existing = counts.get(key);
      counts.set(key, { ending, actor, count: (existing?.count ?? 0) + 1 });
    }
  }
  return [...counts.values()].sort((first, second) => second.count - first.count);
}

function trackScoreSwings(games: readonly (readonly StatPoint[])[]): {
  biggestLead: Score;
  biggestComeback: Score;
  longestStreak: Score;
} {
  const biggestLead: Score = { me: 0, opponent: 0 };
  const biggestComeback: Score = { me: 0, opponent: 0 };
  const longestStreak: Score = { me: 0, opponent: 0 };
  let streakSide: Side | null = null;
  let streakLength = 0;

  for (const game of games) {
    const biggestDeficit: Score = { me: 0, opponent: 0 };
    const score: Score = { me: 0, opponent: 0 };

    for (const { winner } of game) {
      score[winner] += 1;
      const loser = otherSide(winner);
      const lead = score[winner] - score[loser];
      biggestLead[winner] = Math.max(biggestLead[winner], lead);
      biggestDeficit[loser] = Math.max(biggestDeficit[loser], lead);

      streakLength = streakSide === winner ? streakLength + 1 : 1;
      streakSide = winner;
      longestStreak[winner] = Math.max(longestStreak[winner], streakLength);
    }

    const finishedBy = gameWinner(score);
    if (finishedBy) {
      biggestComeback[finishedBy] = Math.max(biggestComeback[finishedBy], biggestDeficit[finishedBy]);
    }
  }

  return { biggestLead, biggestComeback, longestStreak };
}

function buildMomentum(points: readonly StatPoint[]): MomentumPoint[] {
  let difference = 0;
  return points.map(({ winner, gameNumber }, index) => {
    difference += winner === Side.Me ? 1 : -1;
    return { point: index + 1, difference, gameNumber };
  });
}

export function computeMatchStats(points: readonly StatPoint[]): MatchStats {
  const myServe = points.filter(({ server }) => server === Side.Me);
  const theirServe = points.filter(({ server }) => server === Side.Opponent);
  const tagged = (ending: PointEnding, actor: Side): number =>
    countWhere(points, (point) => point.ending === ending && point.actor === actor);
  const taggedIn = (endings: ReadonlySet<PointEnding>, actor: Side): number =>
    countWhere(points, (point) => point.ending !== null && endings.has(point.ending) && point.actor === actor);

  const thirdBallWinners = tagged(PointEnding.ThirdBallWinner, Side.Me);
  const thirdBallErrors = tagged(PointEnding.ThirdBallError, Side.Me);

  const games = groupByGame(points);
  const finishedGames = games
    .map(finalScore)
    .flatMap((score) => {
      const winner = gameWinner(score);
      return winner ? [{ ...score, winner }] : [];
    });
  const deuceGames = finishedGames.filter(({ me, opponent }) => me >= DEUCE_SCORE && opponent >= DEUCE_SCORE);
  const closeGames = finishedGames.filter(({ me, opponent }) => Math.abs(me - opponent) === WINNING_MARGIN);

  return {
    pointsWon: {
      overall: pointsWonRatio(points),
      onMyServe: pointsWonRatio(myServe),
      onTheirServe: pointsWonRatio(theirServe),
    },
    winners: { me: taggedIn(WINNER_ENDINGS, Side.Me), opponent: taggedIn(WINNER_ENDINGS, Side.Opponent) },
    errors: { me: taggedIn(ERROR_ENDINGS, Side.Me), opponent: taggedIn(ERROR_ENDINGS, Side.Opponent) },
    endings: countEndings(points),
    serveReceive: {
      aces: tagged(PointEnding.ServeAce, Side.Me),
      serveErrors: tagged(PointEnding.ServeError, Side.Me),
      receiveErrors: tagged(PointEnding.ReceiveError, Side.Me),
      thirdBallWinners,
      thirdBallErrors,
      thirdBallWinRate: ratio(thirdBallWinners, thirdBallWinners + thirdBallErrors),
    },
    wingUnforcedErrors: {
      forehand: tagged(PointEnding.ForehandUnforcedError, Side.Me),
      backhand: tagged(PointEnding.BackhandUnforcedError, Side.Me),
    },
    deuceGames: ratio(deuceGames.filter(({ winner }) => winner === Side.Me).length, deuceGames.length),
    closeGames: ratio(closeGames.filter(({ winner }) => winner === Side.Me).length, closeGames.length),
    ...trackScoreSwings(games),
    momentum: buildMomentum(points),
    taggedPoints: countWhere(points, ({ ending }) => ending !== null),
  };
}

function mergeScores(first: Score, second: Score, combine: (a: number, b: number) => number): Score {
  return { me: combine(first.me, second.me), opponent: combine(first.opponent, second.opponent) };
}

const add = (first: number, second: number): number => first + second;

function mergeStats(first: MatchStats, second: MatchStats): MatchStats {
  return {
    pointsWon: {
      overall: addRatios(first.pointsWon.overall, second.pointsWon.overall),
      onMyServe: addRatios(first.pointsWon.onMyServe, second.pointsWon.onMyServe),
      onTheirServe: addRatios(first.pointsWon.onTheirServe, second.pointsWon.onTheirServe),
    },
    winners: mergeScores(first.winners, second.winners, add),
    errors: mergeScores(first.errors, second.errors, add),
    endings: [],
    serveReceive: {
      aces: first.serveReceive.aces + second.serveReceive.aces,
      serveErrors: first.serveReceive.serveErrors + second.serveReceive.serveErrors,
      receiveErrors: first.serveReceive.receiveErrors + second.serveReceive.receiveErrors,
      thirdBallWinners: first.serveReceive.thirdBallWinners + second.serveReceive.thirdBallWinners,
      thirdBallErrors: first.serveReceive.thirdBallErrors + second.serveReceive.thirdBallErrors,
      thirdBallWinRate: addRatios(first.serveReceive.thirdBallWinRate, second.serveReceive.thirdBallWinRate),
    },
    wingUnforcedErrors: {
      forehand: first.wingUnforcedErrors.forehand + second.wingUnforcedErrors.forehand,
      backhand: first.wingUnforcedErrors.backhand + second.wingUnforcedErrors.backhand,
    },
    deuceGames: addRatios(first.deuceGames, second.deuceGames),
    closeGames: addRatios(first.closeGames, second.closeGames),
    biggestLead: mergeScores(first.biggestLead, second.biggestLead, Math.max),
    biggestComeback: mergeScores(first.biggestComeback, second.biggestComeback, Math.max),
    longestStreak: mergeScores(first.longestStreak, second.longestStreak, Math.max),
    momentum: [],
    taggedPoints: first.taggedPoints + second.taggedPoints,
  };
}

export function aggregateStats(pointLists: readonly (readonly StatPoint[])[]): MatchStats {
  return {
    ...pointLists.map(computeMatchStats).reduce(mergeStats, computeMatchStats([])),
    endings: countEndings(pointLists.flat()),
  };
}

function gameWinners(points: readonly StatPoint[]): Side[] {
  return groupByGame(points).flatMap((game) => {
    const winner = gameWinner(finalScore(game));
    return winner ? [winner] : [];
  });
}

export function computeHeadToHead(matches: readonly AnalyzedMatch[]): HeadToHead {
  const newestFirst = [...matches].sort((first, second) => second.playedAt.getTime() - first.playedAt.getTime());
  const allGames = matches.map(({ points }) => gameWinners(points));
  const allPoints = matches.flatMap(({ points }) => points);
  const deciders = matches.flatMap(({ points, bestOf }) => {
    const winners = gameWinners(points);
    return winners.length === bestOf ? winners.slice(-1) : [];
  });

  return {
    matches: ratio(matches.filter(({ winner }) => winner === Side.Me).length, matches.length),
    games: ratio(allGames.flat().filter((winner) => winner === Side.Me).length, allGames.flat().length),
    decidingGames: ratio(deciders.filter((winner) => winner === Side.Me).length, deciders.length),
    stats: aggregateStats(matches.map(({ points }) => points)),
    pointsWonTrend: {
      recent: pointsWonRatio(newestFirst.slice(0, RECENT_MATCHES_FOR_TREND).flatMap(({ points }) => points)),
      allTime: pointsWonRatio(allPoints),
    },
  };
}

export interface MomentumSwing {
  beneficiary: Side;
  fromPoint: number;
  toPoint: number;
  swing: number;
  gameNumber: number;
}

export function findBiggestSwing(momentum: readonly MomentumPoint[]): MomentumSwing | null {
  let biggest: MomentumSwing | null = null;
  let low = { point: 0, difference: 0 };
  let high = { point: 0, difference: 0 };

  for (const { point, difference, gameNumber } of momentum) {
    const rise = difference - low.difference;
    const fall = high.difference - difference;
    if (rise > (biggest?.swing ?? 0)) {
      biggest = { beneficiary: Side.Me, fromPoint: low.point, toPoint: point, swing: rise, gameNumber };
    }
    if (fall > (biggest?.swing ?? 0)) {
      biggest = { beneficiary: Side.Opponent, fromPoint: high.point, toPoint: point, swing: fall, gameNumber };
    }
    if (difference < low.difference) {
      low = { point, difference };
    }
    if (difference > high.difference) {
      high = { point, difference };
    }
  }
  return biggest;
}

export function hasEnoughDataForScouting(completedMatches: number, totalPoints: number): boolean {
  return completedMatches >= ScoutingThreshold.MinCompletedMatches && totalPoints >= ScoutingThreshold.MinPoints;
}

export function scoutingConfidence(completedMatches: number): ReportConfidence {
  if (completedMatches < ScoutingThreshold.MediumConfidenceMatches) {
    return ReportConfidence.Low;
  }
  return completedMatches > ScoutingThreshold.HighConfidenceAboveMatches
    ? ReportConfidence.High
    : ReportConfidence.Medium;
}

export const WeaknessKey = {
  ReceiveErrors: 'receive_errors',
  ServeHoldLow: 'serve_hold_low',
  ThirdBall: 'third_ball',
  BackhandErrors: 'bh_errors',
  ForehandErrors: 'fh_errors',
  DeuceRecord: 'deuce_record',
  VsLongPips: 'vs_long_pips',
  VsChopper: 'vs_chopper',
} as const;
export type WeaknessKey = (typeof WeaknessKey)[keyof typeof WeaknessKey];

export interface Weakness {
  key: WeaknessKey;
  label: string;
  evidence: string;
  severity: number;
  isLowConfidence: boolean;
}

export interface OpponentProfile {
  playStyle: PlayStyle | null;
  forehandRubberType: RubberType | null;
  backhandRubberType: RubberType | null;
}

export interface MatchForWeaknesses {
  opponent: OpponentProfile;
  points: readonly StatPoint[];
}

function opponentTypeWeakness(
  matches: readonly MatchForWeaknesses[],
  overallPercentage: number,
  isOpponentType: (opponent: OpponentProfile) => boolean,
  details: { key: WeaknessKey; label: string; opponentDescription: string },
): Weakness | null {
  const points = matches.filter(({ opponent }) => isOpponentType(opponent)).flatMap((match) => match.points);
  const { percentage, total } = pointsWonRatio(points);
  if (percentage === null) {
    return null;
  }

  const gap = overallPercentage - percentage;
  if (gap < WeaknessThreshold.OpponentTypeGapPercentagePoints) {
    return null;
  }

  return {
    key: details.key,
    label: details.label,
    evidence: `You win ${String(percentage)}% of points against ${details.opponentDescription}, ${String(gap)} points below your ${String(overallPercentage)}% average`,
    severity: gap / WeaknessThreshold.OpponentTypeGapPercentagePoints,
    isLowConfidence: total < WeaknessThreshold.MinSamplePoints,
  };
}

export function detectWeaknesses(matches: readonly MatchForWeaknesses[]): Weakness[] {
  const stats = aggregateStats(matches.map(({ points }) => points));
  const { overall, onMyServe } = stats.pointsWon;
  const { receiveErrors, thirdBallWinners, thirdBallErrors } = stats.serveReceive;
  const { forehand, backhand } = stats.wingUnforcedErrors;
  const lostPoints = overall.total - overall.won;
  const hasFewTaggedPoints = stats.taggedPoints < WeaknessThreshold.MinSamplePoints;
  const weaknesses: Weakness[] = [];

  if (lostPoints > 0) {
    const share = receiveErrors / lostPoints;
    if (share >= WeaknessThreshold.ReceiveErrorShareOfLostPoints) {
      weaknesses.push({
        key: WeaknessKey.ReceiveErrors,
        label: 'Receive errors',
        evidence: `${String(Math.round(share * 100))}% of your lost points are receive errors`,
        severity: share / WeaknessThreshold.ReceiveErrorShareOfLostPoints,
        isLowConfidence: hasFewTaggedPoints,
      });
    }
  }

  if (onMyServe.percentage !== null && onMyServe.won / onMyServe.total < WeaknessThreshold.ServeHoldRate) {
    weaknesses.push({
      key: WeaknessKey.ServeHoldLow,
      label: 'Holding your serve',
      evidence: `You win only ${String(onMyServe.percentage)}% of points on your own serve`,
      severity: WeaknessThreshold.ServeHoldRate / Math.max(onMyServe.won / onMyServe.total, 0.01),
      isLowConfidence: onMyServe.total < WeaknessThreshold.MinSamplePoints,
    });
  }

  if (thirdBallErrors > thirdBallWinners) {
    weaknesses.push({
      key: WeaknessKey.ThirdBall,
      label: 'Third-ball attack',
      evidence: `You make ${String(thirdBallErrors)} third-ball errors against ${String(thirdBallWinners)} winners`,
      severity: thirdBallErrors / Math.max(thirdBallWinners, 1),
      isLowConfidence: hasFewTaggedPoints,
    });
  }

  const wingWeakness = (
    key: WeaknessKey,
    label: string,
    wing: string,
    errors: number,
    otherWingErrors: number,
  ): void => {
    if (errors >= WeaknessThreshold.MinWingErrors && errors >= otherWingErrors * WeaknessThreshold.WingErrorRatio) {
      weaknesses.push({
        key,
        label,
        evidence: `${String(errors)} unforced errors on your ${wing}, against ${String(otherWingErrors)} on the other wing`,
        severity: errors / Math.max(otherWingErrors, 1) / WeaknessThreshold.WingErrorRatio,
        isLowConfidence: hasFewTaggedPoints,
      });
    }
  };
  wingWeakness(WeaknessKey.BackhandErrors, 'Backhand errors', 'backhand', backhand, forehand);
  wingWeakness(WeaknessKey.ForehandErrors, 'Forehand errors', 'forehand', forehand, backhand);

  const { deuceGames } = stats;
  if (
    deuceGames.total >= WeaknessThreshold.MinDeuceGames &&
    deuceGames.won / deuceGames.total < WeaknessThreshold.DeuceWinRate
  ) {
    weaknesses.push({
      key: WeaknessKey.DeuceRecord,
      label: 'Closing out deuce games',
      evidence: `You are ${String(deuceGames.won)}–${String(deuceGames.total - deuceGames.won)} in deuce games`,
      severity: WeaknessThreshold.DeuceWinRate / Math.max(deuceGames.won / deuceGames.total, 0.1),
      isLowConfidence: deuceGames.total < WeaknessThreshold.MinDeuceGames * 2,
    });
  }

  if (overall.percentage !== null) {
    const typeWeaknesses = [
      opponentTypeWeakness(
        matches,
        overall.percentage,
        ({ forehandRubberType, backhandRubberType }) =>
          forehandRubberType === RubberType.LongPips || backhandRubberType === RubberType.LongPips,
        { key: WeaknessKey.VsLongPips, label: 'Playing long pips', opponentDescription: 'long-pips players' },
      ),
      opponentTypeWeakness(matches, overall.percentage, ({ playStyle }) => playStyle === PlayStyle.DefenderChopper, {
        key: WeaknessKey.VsChopper,
        label: 'Playing choppers',
        opponentDescription: 'choppers',
      }),
    ];
    weaknesses.push(...typeWeaknesses.filter((weakness) => weakness !== null));
  }

  return weaknesses.sort(
    (first, second) =>
      Number(first.isLowConfidence) - Number(second.isLowConfidence) || second.severity - first.severity,
  );
}
