import { describe, expect, expectTypeOf, it } from 'vitest';

import { Side } from '@/lib/domain/enums';
import {
  canAddPoint,
  deriveState,
  gameFirstServer,
  PointAfterMatchEndError,
  serverForPoint,
  type InProgressMatchState,
  type MatchSettings,
  type MatchState,
  type PointEvent,
} from '@/lib/domain/scoring';

const { Me, Opponent } = Side;
const BEST_OF_5: MatchSettings = { bestOf: 5, firstServer: Me };

function points(winner: Side, count: number): PointEvent[] {
  return Array.from({ length: count }, () => ({ winner }));
}

function rally(...runs: readonly (readonly [Side, number])[]): PointEvent[] {
  return runs.flatMap(([winner, count]) => points(winner, count));
}

const winGame = (winner: Side): PointEvent[] => points(winner, 11);

function inProgress(state: MatchState): InProgressMatchState {
  if (state.isComplete) {
    throw new Error('Expected the match to be in progress');
  }
  return state;
}

function scoreAfter(settings: MatchSettings, played: readonly PointEvent[]): InProgressMatchState {
  return inProgress(deriveState(settings, played));
}

describe('winning a game', () => {
  it('starts at 0-0 in game 1', () => {
    const state = scoreAfter(BEST_OF_5, []);

    expect(state.current).toEqual({ me: 0, opponent: 0 });
    expect(state.gameNumber).toBe(1);
    expect(state.games).toEqual([]);
    expect(state.isBetweenGames).toBe(false);
  });

  it('wins 11-0', () => {
    const state = scoreAfter(BEST_OF_5, winGame(Me));

    expect(state.games).toEqual([{ me: 11, opponent: 0, winner: Me }]);
    expect(state.current).toEqual({ me: 0, opponent: 0 });
    expect(state.gameNumber).toBe(2);
    expect(state.gamesWon).toEqual({ me: 1, opponent: 0 });
  });

  it('wins 11-9', () => {
    const state = scoreAfter(BEST_OF_5, rally([Opponent, 9], [Me, 11]));

    expect(state.games).toEqual([{ me: 11, opponent: 9, winner: Me }]);
  });

  it('does not win at 11-10', () => {
    const state = scoreAfter(BEST_OF_5, rally([Opponent, 10], [Me, 11]));

    expect(state.games).toEqual([]);
    expect(state.current).toEqual({ me: 11, opponent: 10 });
  });

  it('wins 12-10', () => {
    const state = scoreAfter(BEST_OF_5, rally([Opponent, 10], [Me, 12]));

    expect(state.games).toEqual([{ me: 12, opponent: 10, winner: Me }]);
  });

  it('plays a long deuce to 16-14', () => {
    const toDeuce = rally([Me, 10], [Opponent, 10]);
    const trading = Array.from({ length: 4 }, () => rally([Me, 1], [Opponent, 1])).flat();
    const state = scoreAfter(BEST_OF_5, [...toDeuce, ...trading, ...rally([Me, 2])]);

    expect(state.games).toEqual([{ me: 16, opponent: 14, winner: Me }]);
  });
});

describe('service', () => {
  it('changes every 2 points for the first 6 points', () => {
    const servers = [0, 1, 2, 3, 4, 5].map((played) => scoreAfter(BEST_OF_5, points(Me, played)).server);

    expect(servers).toEqual([Me, Me, Opponent, Opponent, Me, Me]);
  });

  it('counts serves left in the turn', () => {
    const servesLeft = [0, 1, 2, 3].map((played) => scoreAfter(BEST_OF_5, points(Me, played)).servesLeft);

    expect(servesLeft).toEqual([2, 1, 2, 1]);
  });

  it('alternates after every point from 10-10, with one serve each', () => {
    const toDeuce = rally([Me, 10], [Opponent, 10]);

    const states = [0, 1, 2, 3].map((extra) => {
      const trading = Array.from({ length: extra }, (_, index) => ({ winner: index % 2 === 0 ? Me : Opponent }));
      return scoreAfter(BEST_OF_5, [...toDeuce, ...trading]);
    });

    expect(states.map(({ server }) => server)).toEqual([Me, Opponent, Me, Opponent]);
    expect(states.every(({ servesLeft }) => servesLeft === 1)).toBe(true);
  });

  it('matches the formula for serverForPoint directly', () => {
    expect(serverForPoint(Opponent, 0, 0)).toBe(Opponent);
    expect(serverForPoint(Opponent, 1, 1)).toBe(Me);
    expect(serverForPoint(Me, 10, 10)).toBe(Me);
    expect(serverForPoint(Me, 11, 10)).toBe(Opponent);
    expect(serverForPoint(Me, 11, 11)).toBe(Me);
  });

  it('alternates the first server between games 1, 2 and 3', () => {
    expect([1, 2, 3].map((game) => gameFirstServer(Me, game))).toEqual([Me, Opponent, Me]);
    expect([1, 2, 3].map((game) => gameFirstServer(Opponent, game))).toEqual([Opponent, Me, Opponent]);
  });

  it('starts each game with that game’s first server', () => {
    const gameTwo = scoreAfter(BEST_OF_5, winGame(Me));
    const gameThree = scoreAfter(BEST_OF_5, [...winGame(Me), ...winGame(Opponent)]);

    expect(gameTwo.server).toBe(Opponent);
    expect(gameThree.server).toBe(Me);
  });
});

describe('ending a match', () => {
  it.each([
    [3, 2],
    [5, 3],
    [7, 4],
  ] as const)('best of %i ends after %i games won', (bestOf, gamesToWin) => {
    const settings: MatchSettings = { bestOf, firstServer: Me };
    const oneGameShort = Array.from({ length: gamesToWin - 1 }, () => winGame(Me)).flat();

    expect(deriveState(settings, oneGameShort).isComplete).toBe(false);

    const finished = deriveState(settings, [...oneGameShort, ...winGame(Me)]);
    expect(finished).toMatchObject({ isComplete: true, winner: Me, gamesWon: { me: gamesToWin, opponent: 0 } });
  });

  it('can be won by the opponent in the deciding game', () => {
    const played = [Me, Opponent, Me, Opponent, Opponent].flatMap((winner) => winGame(winner));

    expect(deriveState(BEST_OF_5, played)).toMatchObject({
      isComplete: true,
      winner: Opponent,
      gamesWon: { me: 2, opponent: 3 },
    });
  });

  it('rejects points after the end', () => {
    const finished = [Me, Me, Me].flatMap((winner) => winGame(winner));

    expect(canAddPoint(deriveState(BEST_OF_5, finished))).toBe(false);
    expect(() => deriveState(BEST_OF_5, [...finished, { winner: Me }])).toThrow(PointAfterMatchEndError);
  });

  it('allows points while in progress', () => {
    expect(canAddPoint(deriveState(BEST_OF_5, []))).toBe(true);
  });
});

describe('switching ends', () => {
  const toDecider = [Me, Opponent, Me, Opponent].flatMap((winner) => winGame(winner));

  it('flags the switch when the first player reaches 5 in the deciding game', () => {
    expect(scoreAfter(BEST_OF_5, [...toDecider, ...points(Me, 4)]).switchEndsNow).toBe(false);
    expect(scoreAfter(BEST_OF_5, [...toDecider, ...points(Me, 5)]).switchEndsNow).toBe(true);
    expect(scoreAfter(BEST_OF_5, [...toDecider, ...points(Opponent, 5)]).switchEndsNow).toBe(true);
  });

  it('flags it only once, even if the other player later reaches 5', () => {
    const atSwitch = [...toDecider, ...points(Me, 5)];

    expect(scoreAfter(BEST_OF_5, [...atSwitch, { winner: Opponent }]).switchEndsNow).toBe(false);
    expect(scoreAfter(BEST_OF_5, [...atSwitch, { winner: Me }]).switchEndsNow).toBe(false);
    expect(scoreAfter(BEST_OF_5, [...atSwitch, ...points(Opponent, 5)]).switchEndsNow).toBe(false);
  });

  it('does not flag it in other games', () => {
    expect(scoreAfter(BEST_OF_5, points(Me, 5)).switchEndsNow).toBe(false);
    expect(scoreAfter(BEST_OF_5, [...winGame(Me), ...points(Me, 5)]).switchEndsNow).toBe(false);
  });

  it('uses the right deciding game for each match length', () => {
    const bestOf3: MatchSettings = { bestOf: 3, firstServer: Me };
    const toThird = [Me, Opponent].flatMap((winner) => winGame(winner));

    expect(scoreAfter(bestOf3, [...toThird, ...points(Me, 5)]).switchEndsNow).toBe(true);
  });

  it('marks the break between games, not the start of the match', () => {
    expect(scoreAfter(BEST_OF_5, winGame(Me)).isBetweenGames).toBe(true);
    expect(scoreAfter(BEST_OF_5, [...winGame(Me), { winner: Me }]).isBetweenGames).toBe(false);
  });
});

describe('undo', () => {
  it('restores the previous game’s score and server across a game boundary', () => {
    const played = [...rally([Opponent, 9], [Me, 11]), ...points(Me, 2)];
    const beforeWinningPoint = played.slice(0, 19);

    const undone = scoreAfter(BEST_OF_5, beforeWinningPoint);

    expect(undone.games).toEqual([]);
    expect(undone.gameNumber).toBe(1);
    expect(undone.current).toEqual({ me: 10, opponent: 9 });
    expect(undone.server).toBe(serverForPoint(Me, 10, 9));
    expect(undone.gamePoint).toBe(Me);
  });

  it('reopens a finished match', () => {
    const finished = [Me, Me, Me].flatMap((winner) => winGame(winner));

    const undone = scoreAfter(BEST_OF_5, finished.slice(0, -1));

    expect(undone.isComplete).toBe(false);
    expect(undone.gamesWon).toEqual({ me: 2, opponent: 0 });
    expect(undone.current).toEqual({ me: 10, opponent: 0 });
    expect(undone.matchPoint).toBe(Me);
  });
});

describe('game point, match point and deuce flags', () => {
  it('flags game point at 10-8 and not earlier', () => {
    expect(scoreAfter(BEST_OF_5, rally([Me, 9], [Opponent, 8])).gamePoint).toBeNull();
    expect(scoreAfter(BEST_OF_5, rally([Me, 10], [Opponent, 8])).gamePoint).toBe(Me);
    expect(scoreAfter(BEST_OF_5, rally([Me, 8], [Opponent, 10])).gamePoint).toBe(Opponent);
  });

  it('has no game point at 10-10, then whoever leads at deuce has it', () => {
    const deuce = rally([Me, 10], [Opponent, 10]);
    const atDeuce = scoreAfter(BEST_OF_5, deuce);

    expect(atDeuce.isDeuce).toBe(true);
    expect(atDeuce.gamePoint).toBeNull();

    const advantage = scoreAfter(BEST_OF_5, [...deuce, { winner: Opponent }]);
    expect(advantage.isDeuce).toBe(true);
    expect(advantage.gamePoint).toBe(Opponent);
  });

  it('is not deuce at 10-9', () => {
    expect(scoreAfter(BEST_OF_5, rally([Me, 10], [Opponent, 9])).isDeuce).toBe(false);
  });

  it('flags match point only when the game would win the match', () => {
    const oneGameUp = winGame(Me);
    const twoGamesUp = [...winGame(Me), ...winGame(Me)];

    expect(scoreAfter(BEST_OF_5, [...oneGameUp, ...points(Me, 10)]).matchPoint).toBeNull();
    expect(scoreAfter(BEST_OF_5, [...twoGamesUp, ...points(Me, 10)]).matchPoint).toBe(Me);
  });

  it('gives a match point to the trailing player only when they can finish it', () => {
    const state = scoreAfter(BEST_OF_5, [...winGame(Me), ...winGame(Me), ...points(Opponent, 10)]);

    expect(state.gamePoint).toBe(Opponent);
    expect(state.matchPoint).toBeNull();
  });

  it('flags match point at deuce', () => {
    const twoGamesUp = [...winGame(Me), ...winGame(Me)];
    const advantage = [...twoGamesUp, ...rally([Me, 10], [Opponent, 10]), { winner: Me }];

    expect(scoreAfter(BEST_OF_5, advantage).matchPoint).toBe(Me);
    expect(scoreAfter(BEST_OF_5, [...twoGamesUp, ...rally([Me, 10], [Opponent, 10])]).matchPoint).toBeNull();
  });
});

describe('invariants across seeded random matches', () => {
  function seededRandom(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
  }

  it.each([1, 2, 3, 4, 5, 6, 7, 8])('seed %i always ends legally', (seed) => {
    const random = seededRandom(seed);
    const settings: MatchSettings = { bestOf: 7, firstServer: seed % 2 === 0 ? Me : Opponent };
    const played: PointEvent[] = [];
    let state = deriveState(settings, played);

    while (canAddPoint(state)) {
      played.push({ winner: random() < 0.5 ? Me : Opponent });
      state = deriveState(settings, played);
    }

    expect(state.winner).not.toBeNull();
    expect(Math.max(state.gamesWon.me, state.gamesWon.opponent)).toBe(4);
    expect(state.games.reduce((total, { me, opponent }) => total + me + opponent, 0)).toBe(played.length);
    for (const { me, opponent, winner } of state.games) {
      expect(Math.max(me, opponent)).toBeGreaterThanOrEqual(11);
      expect(Math.abs(me - opponent)).toBeGreaterThanOrEqual(2);
      expect(me > opponent ? Me : Opponent).toBe(winner);
    }
  });
});

describe('MatchState type', () => {
  it('only exposes a winner and hides live fields according to status', () => {
    const state = deriveState(BEST_OF_5, []);

    if (state.isComplete) {
      expectTypeOf(state.winner).toEqualTypeOf<Side>();
      // @ts-expect-error a finished match has no current game
      expect(state.current).toBeUndefined();
    } else {
      expectTypeOf(state.winner).toEqualTypeOf<null>();
      expectTypeOf(state.server).toEqualTypeOf<Side>();
    }
  });
});
