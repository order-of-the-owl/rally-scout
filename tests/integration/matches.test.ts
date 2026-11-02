import { randomUUID } from 'node:crypto';

import { auth } from '@clerk/nextjs/server';
import { inArray } from 'drizzle-orm';
import { afterAll, describe, expect, it, vi } from 'vitest';

import { abandonMatchAction, createMatchAction, recordPointAction, tagPointAction } from '@/lib/actions/matches';
import { Route } from '@/lib/config/routes';
import { getDb } from '@/lib/db';
import {
  abandonMatch,
  createMatch,
  getInProgressMatch,
  getMatchWithPoints,
  listRecentCompletedMatches,
  recordPoint,
  tagPoint,
  undoLastPoint,
} from '@/lib/db/queries/matches';
import { createOpponent } from '@/lib/db/queries/opponents';
import { saveProfile } from '@/lib/db/queries/users';
import { matches, opponents, users } from '@/lib/db/schema';
import { EventType, Grip, Handedness, MatchStatus, PlayStyle, PointEnding, Side } from '@/lib/domain/enums';
import { userIdSchema, type MatchId, type OpponentId, type UserId } from '@/lib/domain/ids';
import type { NewMatchFormState } from '@/lib/validation/match';

const { Me, Opponent } = Side;

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
}));

const IDLE: NewMatchFormState = { status: 'idle' };
const createdUserIds: UserId[] = [];

async function createPlayer(): Promise<{ userId: UserId; opponentId: OpponentId }> {
  const userId = userIdSchema.parse(`test_${randomUUID()}`);
  createdUserIds.push(userId);
  await saveProfile(userId, {
    displayName: 'Sam',
    handedness: Handedness.Right,
    grip: Grip.Shakehand,
    playStyle: PlayStyle.AllRound,
    blade: null,
    forehandRubber: null,
    backhandRubber: null,
  });
  const { id: opponentId } = await createOpponent(userId, {
    name: 'Alex',
    handedness: null,
    grip: null,
    playStyle: null,
    forehandRubberType: null,
    backhandRubberType: null,
    notes: null,
  });
  return { userId, opponentId };
}

function signInAs(userId: UserId): void {
  // Cast because the real session type has many fields these tests never read.
  vi.mocked(auth).mockResolvedValue({ userId, redirectToSignIn: vi.fn() } as never);
}

async function startMatch(userId: UserId, opponentId: OpponentId, bestOf: 3 | 5 | 7 = 3): Promise<MatchId> {
  const match = await createMatch(userId, { opponentId, bestOf, firstServer: Me, eventType: EventType.Casual });
  if (!match) {
    throw new Error('Expected the match to be created');
  }
  return match.id;
}

async function playPoints(userId: UserId, matchId: MatchId, winner: Side, count: number, fromSeq = 1): Promise<void> {
  for (let offset = 0; offset < count; offset += 1) {
    const result = await recordPoint(userId, matchId, winner, fromSeq + offset);
    expect(result.status).toBe('changed');
  }
}

afterAll(async () => {
  await getDb().delete(matches).where(inArray(matches.ownerId, createdUserIds));
  await getDb().delete(opponents).where(inArray(opponents.ownerId, createdUserIds));
  await getDb().delete(users).where(inArray(users.id, createdUserIds));
});

describe('recording points', () => {
  it('stores the server and game number the engine derived', async () => {
    const { userId, opponentId } = await createPlayer();
    const matchId = await startMatch(userId, opponentId);

    await playPoints(userId, matchId, Me, 3);

    const stored = await getMatchWithPoints(userId, matchId);
    expect(stored?.points.map(({ seq, server, gameNumber }) => ({ seq, server, gameNumber }))).toEqual([
      { seq: 1, server: Me, gameNumber: 1 },
      { seq: 2, server: Me, gameNumber: 1 },
      { seq: 3, server: Opponent, gameNumber: 1 },
    ]);
  });

  it('ignores a stale double tap instead of counting it twice', async () => {
    const { userId, opponentId } = await createPlayer();
    const matchId = await startMatch(userId, opponentId);
    await playPoints(userId, matchId, Me, 1);

    const repeat = await recordPoint(userId, matchId, Me, 1);

    expect(repeat.status).toBe('stale');
    expect((await getMatchWithPoints(userId, matchId))?.points).toHaveLength(1);
  });

  it('keeps sequence numbers unique under concurrent submits', async () => {
    const { userId, opponentId } = await createPlayer();
    const matchId = await startMatch(userId, opponentId);

    const results = await Promise.all([
      recordPoint(userId, matchId, Me, 1),
      recordPoint(userId, matchId, Opponent, 1),
      recordPoint(userId, matchId, Me, 1),
    ]);

    expect(results.filter(({ status }) => status === 'changed')).toHaveLength(1);
    expect((await getMatchWithPoints(userId, matchId))?.points).toHaveLength(1);
  });

  it('completes a best-of-3 and rejects any further points', async () => {
    const { userId, opponentId } = await createPlayer();
    const matchId = await startMatch(userId, opponentId);

    await playPoints(userId, matchId, Me, 22);

    const stored = await getMatchWithPoints(userId, matchId);
    expect(stored?.match).toMatchObject({ status: MatchStatus.Completed, winner: Me });
    expect(stored?.match.completedAt).toBeInstanceOf(Date);
    expect((await recordPoint(userId, matchId, Me, 23)).status).toBe('closed');
    expect((await listRecentCompletedMatches(userId, 5)).map(({ id }) => id)).toEqual([matchId]);
  });
});

describe('undo', () => {
  it('removes only the last point, across a game boundary', async () => {
    const { userId, opponentId } = await createPlayer();
    const matchId = await startMatch(userId, opponentId, 5);
    await playPoints(userId, matchId, Me, 12);

    const undoNextGamePoint = await undoLastPoint(userId, matchId, 12);
    const undoGameWinner = await undoLastPoint(userId, matchId, 11);

    expect(undoNextGamePoint.status).toBe('changed');
    expect(undoGameWinner.status).toBe('changed');
    expect((await getMatchWithPoints(userId, matchId))?.points).toHaveLength(10);
  });

  it('reopens a completed match', async () => {
    const { userId, opponentId } = await createPlayer();
    const matchId = await startMatch(userId, opponentId);
    await playPoints(userId, matchId, Me, 22);

    expect((await undoLastPoint(userId, matchId, 22)).status).toBe('changed');

    const stored = await getMatchWithPoints(userId, matchId);
    expect(stored?.match).toMatchObject({ status: MatchStatus.InProgress, winner: null, completedAt: null });
    expect((await getInProgressMatch(userId))?.id).toBe(matchId);
  });

  it('rejects a stale undo and an undo with no points', async () => {
    const { userId, opponentId } = await createPlayer();
    const matchId = await startMatch(userId, opponentId);

    expect((await undoLastPoint(userId, matchId, 1)).status).toBe('stale');
    await playPoints(userId, matchId, Me, 2);
    expect((await undoLastPoint(userId, matchId, 1)).status).toBe('stale');
    expect((await getMatchWithPoints(userId, matchId))?.points).toHaveLength(2);
  });
});

describe('tagging and resuming', () => {
  it('tags a point after it was recorded', async () => {
    const { userId, opponentId } = await createPlayer();
    const matchId = await startMatch(userId, opponentId);
    await playPoints(userId, matchId, Me, 1);

    await tagPoint(userId, matchId, 1, { ending: PointEnding.ServeAce, actor: Me });

    expect((await getMatchWithPoints(userId, matchId))?.points[0]).toMatchObject({
      ending: PointEnding.ServeAce,
      actor: Me,
    });
  });

  it('resumes from the stored points and stops offering an abandoned match', async () => {
    const { userId, opponentId } = await createPlayer();
    const matchId = await startMatch(userId, opponentId);
    await playPoints(userId, matchId, Me, 2);

    expect((await getInProgressMatch(userId))?.id).toBe(matchId);
    expect(await abandonMatch(userId, matchId)).toBe(true);
    expect(await getInProgressMatch(userId)).toBeNull();
    expect((await recordPoint(userId, matchId, Me, 3)).status).toBe('closed');
    expect((await undoLastPoint(userId, matchId, 2)).status).toBe('closed');
  });
});

describe('data isolation between users', () => {
  it('blocks every operation on another user’s match', async () => {
    const owner = await createPlayer();
    const stranger = await createPlayer();
    const matchId = await startMatch(owner.userId, owner.opponentId);
    await playPoints(owner.userId, matchId, Me, 1);

    expect(await getMatchWithPoints(stranger.userId, matchId)).toBeNull();
    expect((await recordPoint(stranger.userId, matchId, Opponent, 2)).status).toBe('not_found');
    expect((await undoLastPoint(stranger.userId, matchId, 1)).status).toBe('not_found');
    expect(await tagPoint(stranger.userId, matchId, 1, { ending: PointEnding.Other, actor: null })).toBe(false);
    expect(await abandonMatch(stranger.userId, matchId)).toBe(false);
    expect(await getInProgressMatch(stranger.userId)).toBeNull();

    const stored = await getMatchWithPoints(owner.userId, matchId);
    expect(stored?.points).toHaveLength(1);
    expect(stored?.points[0]?.ending).toBeNull();
    expect(stored?.match.status).toBe(MatchStatus.InProgress);
  });

  it('refuses to start a match against another user’s opponent', async () => {
    const owner = await createPlayer();
    const stranger = await createPlayer();

    const match = await createMatch(stranger.userId, {
      opponentId: owner.opponentId,
      bestOf: 3,
      firstServer: Me,
      eventType: EventType.Casual,
    });

    expect(match).toBeNull();
  });
});

describe('match actions', () => {
  function buildNewMatchForm(fields: Readonly<Record<string, string>>): FormData {
    const formData = new FormData();
    for (const [name, value] of Object.entries(fields)) {
      formData.set(name, value);
    }
    return formData;
  }

  it('starts a match and goes to the live scoreboard', async () => {
    const { userId, opponentId } = await createPlayer();
    signInAs(userId);

    await expect(
      createMatchAction(
        IDLE,
        buildNewMatchForm({ opponentId, bestOf: '5', firstServer: Opponent, eventType: EventType.League }),
      ),
    ).rejects.toThrow(/^redirect:\/matches\/.+\/live$/);

    expect(await getInProgressMatch(userId)).toMatchObject({ bestOf: 5, firstServer: Opponent });
  });

  it('returns readable errors for an incomplete form', async () => {
    const { userId } = await createPlayer();
    signInAs(userId);

    const state = await createMatchAction(IDLE, buildNewMatchForm({ bestOf: '4' }));

    expect(state).toMatchObject({
      status: 'invalid',
      fieldErrors: {
        opponentId: ['Choose an opponent'],
        bestOf: ['Choose a match length'],
        firstServer: ['Choose who serves first'],
      },
    });
  });

  it('rejects malformed action input without touching the match', async () => {
    const { userId, opponentId } = await createPlayer();
    const matchId = await startMatch(userId, opponentId);
    signInAs(userId);

    expect(await recordPointAction({ matchId, winner: 'referee', expectedSeq: 1 })).toEqual({ status: 'failed' });
    expect(await recordPointAction({ matchId: 'nope', winner: Me, expectedSeq: 1 })).toEqual({ status: 'failed' });
    expect(await recordPointAction({ matchId, winner: Me, expectedSeq: 0 })).toEqual({ status: 'failed' });
    expect(await tagPointAction({ matchId, seq: 1, ending: 'magic', actor: null })).toEqual({ status: 'failed' });
    expect((await getMatchWithPoints(userId, matchId))?.points).toEqual([]);
  });

  it('returns the true points when a tap arrives out of order', async () => {
    const { userId, opponentId } = await createPlayer();
    const matchId = await startMatch(userId, opponentId);
    signInAs(userId);
    await playPoints(userId, matchId, Me, 2);

    expect(await recordPointAction({ matchId, winner: Opponent, expectedSeq: 2 })).toEqual({
      status: 'rejected',
      points: [
        { seq: 1, winner: Me },
        { seq: 2, winner: Me },
      ],
    });
  });

  it('abandons a match and returns to the dashboard', async () => {
    const { userId, opponentId } = await createPlayer();
    const matchId = await startMatch(userId, opponentId);
    signInAs(userId);

    await expect(abandonMatchAction(matchId)).rejects.toThrow(`redirect:${Route.Dashboard}`);

    expect((await getMatchWithPoints(userId, matchId))?.match.status).toBe(MatchStatus.Abandoned);
  });
});
