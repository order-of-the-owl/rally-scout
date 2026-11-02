import {
  type BEST_OF_OPTIONS,
  DECIDING_GAME_END_SWITCH_SCORE,
  DEUCE_SCORE,
  POINTS_TO_WIN_GAME,
  SERVES_PER_TURN,
  WINNING_MARGIN,
} from '@/lib/domain/constants';
import { Side } from '@/lib/domain/enums';

export type BestOf = (typeof BEST_OF_OPTIONS)[number];

export interface MatchSettings {
  bestOf: BestOf;
  firstServer: Side;
}

export interface PointEvent {
  winner: Side;
}

export interface Score {
  me: number;
  opponent: number;
}

export interface CompletedGame extends Score {
  winner: Side;
}

interface MatchProgress {
  games: readonly CompletedGame[];
  gamesWon: Score;
}

export interface InProgressMatchState extends MatchProgress {
  isComplete: false;
  winner: null;
  current: Score;
  gameNumber: number;
  server: Side;
  servesLeft: 1 | 2;
  isDeuce: boolean;
  gamePoint: Side | null;
  matchPoint: Side | null;
  switchEndsNow: boolean;
  isBetweenGames: boolean;
}

export interface CompletedMatchState extends MatchProgress {
  isComplete: true;
  winner: Side;
}

export type MatchState = InProgressMatchState | CompletedMatchState;

export class PointAfterMatchEndError extends Error {
  constructor() {
    super('Cannot add a point after the match has ended');
    this.name = 'PointAfterMatchEndError';
  }
}

function otherSide(side: Side): Side {
  return side === Side.Me ? Side.Opponent : Side.Me;
}

function gamesNeededToWin(bestOf: BestOf): number {
  return Math.ceil(bestOf / 2);
}

function wouldWinGame(leaderScore: number, trailerScore: number): boolean {
  return leaderScore >= POINTS_TO_WIN_GAME && leaderScore - trailerScore >= WINNING_MARGIN;
}

function gameWinner({ me, opponent }: Score): Side | null {
  if (wouldWinGame(me, opponent)) {
    return Side.Me;
  }
  return wouldWinGame(opponent, me) ? Side.Opponent : null;
}

function findGamePoint({ me, opponent }: Score): Side | null {
  if (wouldWinGame(me + 1, opponent)) {
    return Side.Me;
  }
  return wouldWinGame(opponent + 1, me) ? Side.Opponent : null;
}

export function gameFirstServer(matchFirstServer: Side, gameNumber: number): Side {
  return gameNumber % 2 === 1 ? matchFirstServer : otherSide(matchFirstServer);
}

export function serverForPoint(firstServerOfGame: Side, me: number, opponent: number): Side {
  const pointsPlayed = me + opponent;
  const deucePointsPlayed = DEUCE_SCORE * 2;
  const firstServerIsServing =
    pointsPlayed < deucePointsPlayed
      ? Math.floor(pointsPlayed / SERVES_PER_TURN) % 2 === 0
      : pointsPlayed % 2 === 0;
  return firstServerIsServing ? firstServerOfGame : otherSide(firstServerOfGame);
}

function servesLeftInTurn(pointsPlayed: number): 1 | 2 {
  return pointsPlayed >= DEUCE_SCORE * 2 || pointsPlayed % SERVES_PER_TURN === 1 ? 1 : 2;
}

function justReachedEndSwitchScore(lastWinner: Side | undefined, current: Score): boolean {
  if (!lastWinner) {
    return false;
  }
  const winnerScore = current[lastWinner];
  const otherScore = current[otherSide(lastWinner)];
  return winnerScore === DECIDING_GAME_END_SWITCH_SCORE && otherScore < DECIDING_GAME_END_SWITCH_SCORE;
}

export function deriveState(settings: MatchSettings, points: readonly PointEvent[]): MatchState {
  const gamesNeeded = gamesNeededToWin(settings.bestOf);
  const games: CompletedGame[] = [];
  const gamesWon: Score = { me: 0, opponent: 0 };
  let current: Score = { me: 0, opponent: 0 };
  let matchWinner: Side | null = null;
  let lastWinnerInGame: Side | undefined;

  for (const { winner } of points) {
    if (matchWinner) {
      throw new PointAfterMatchEndError();
    }

    current = { ...current, [winner]: current[winner] + 1 };
    lastWinnerInGame = winner;

    const finishedBy = gameWinner(current);
    if (finishedBy) {
      games.push({ ...current, winner: finishedBy });
      gamesWon[finishedBy] += 1;
      current = { me: 0, opponent: 0 };
      lastWinnerInGame = undefined;
      if (gamesWon[finishedBy] === gamesNeeded) {
        matchWinner = finishedBy;
      }
    }
  }

  if (matchWinner) {
    return { isComplete: true, winner: matchWinner, games, gamesWon };
  }

  const gameNumber = games.length + 1;
  const gamePoint = findGamePoint(current);
  const pointsPlayed = current.me + current.opponent;

  return {
    isComplete: false,
    winner: null,
    games,
    gamesWon,
    current,
    gameNumber,
    server: serverForPoint(gameFirstServer(settings.firstServer, gameNumber), current.me, current.opponent),
    servesLeft: servesLeftInTurn(pointsPlayed),
    isDeuce: current.me >= DEUCE_SCORE && current.opponent >= DEUCE_SCORE,
    gamePoint,
    matchPoint: gamePoint && gamesWon[gamePoint] + 1 === gamesNeeded ? gamePoint : null,
    switchEndsNow: gameNumber === settings.bestOf && justReachedEndSwitchScore(lastWinnerInGame, current),
    isBetweenGames: pointsPlayed === 0 && games.length > 0,
  };
}

export function canAddPoint(state: MatchState): boolean {
  return !state.isComplete;
}
