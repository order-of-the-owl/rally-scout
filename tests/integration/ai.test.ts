import { randomUUID } from 'node:crypto';

import { auth } from '@clerk/nextjs/server';
import { inArray } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { generateMatchSummaryAction, generateScoutingReportAction } from '@/lib/actions/ai';
import { callStructured } from '@/lib/ai/client';
import { AiProviderError, AiRateLimitError, AiValidationError } from '@/lib/ai/errors';
import { getDb } from '@/lib/db';
import { countAiCallsSince, listScoutingReports } from '@/lib/db/queries/ai';
import { createMatch, getMatchWithPoints, recordPoint, undoLastPoint } from '@/lib/db/queries/matches';
import { createOpponent } from '@/lib/db/queries/opponents';
import { saveProfile } from '@/lib/db/queries/users';
import { aiCalls, matches, opponents, scoutingReports, users } from '@/lib/db/schema';
import { AiFeature, EventType, Grip, Handedness, MatchStatus, PlayStyle, Side } from '@/lib/domain/enums';
import { userIdSchema, type MatchId, type OpponentId, type UserId } from '@/lib/domain/ids';

const createCompletion = vi.hoisted(() => vi.fn());

vi.mock('openai', () => ({
  default: class {
    chat = { completions: { create: createCompletion } };
  },
}));
vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
}));

const NAME_IN_DATABASE = 'Unique Opponent Name';
const POINTS_IN_THREE_STRAIGHT_GAMES = 33;
const createdUserIds: UserId[] = [];
const outputSchema = z.object({ answer: z.string() });

const goodReport = {
  headline: 'Fix your receive',
  keyPatterns: [{ title: 'Receive', evidence: '40% of lost points', impact: 'Costly' }],
  gamePlan: [{ tactic: 'Push long', why: 'Stops the loop' }],
  serveReceivePlan: 'Stand closer',
  mentalNote: 'Stay calm',
  confidence: 'high',
};
const goodSummary = { headline: 'Solid win', turningPoint: 'Game 2', whatWorked: ['Serve'], whatToFix: ['Receive'] };

function toolResponse(name: string, output: unknown): unknown {
  return {
    usage: { total_tokens: 100 },
    choices: [
      {
        message: {
          tool_calls: [{ type: 'function', function: { name, arguments: JSON.stringify(output) } }],
        },
      },
    ],
  };
}

async function createPlayer(): Promise<{ userId: UserId; opponentId: OpponentId }> {
  const userId = userIdSchema.parse(`test_${randomUUID()}`);
  createdUserIds.push(userId);
  await saveProfile(userId, {
    displayName: 'Unique Player Name',
    handedness: Handedness.Right,
    grip: Grip.Shakehand,
    playStyle: PlayStyle.AllRound,
    blade: null,
    forehandRubber: null,
    backhandRubber: null,
  });
  const { id: opponentId } = await createOpponent(userId, {
    name: NAME_IN_DATABASE,
    handedness: null,
    grip: null,
    playStyle: null,
    forehandRubberType: null,
    backhandRubberType: null,
    notes: null,
  });
  // Cast because the real session type has many fields these tests never read.
  vi.mocked(auth).mockResolvedValue({ userId, redirectToSignIn: vi.fn() } as never);
  return { userId, opponentId };
}

async function playCompletedMatch(userId: UserId, opponentId: OpponentId): Promise<MatchId> {
  const match = await createMatch(userId, { opponentId, bestOf: 5, firstServer: Side.Me, eventType: EventType.Casual });
  if (!match) {
    throw new Error('Expected a match');
  }
  for (let seq = 1; seq <= POINTS_IN_THREE_STRAIGHT_GAMES; seq += 1) {
    await recordPoint(userId, match.id, Side.Me, seq);
  }
  return match.id;
}

function callOptions(userId: UserId) {
  return {
    userId,
    feature: AiFeature.MatchSummary,
    model: 'test-model',
    system: 'system',
    input: { value: 1 },
    schema: outputSchema,
    toolName: 'submit',
  };
}

beforeEach(() => {
  createCompletion.mockReset();
});

afterAll(async () => {
  await getDb().delete(aiCalls).where(inArray(aiCalls.ownerId, createdUserIds));
  await getDb().delete(scoutingReports).where(inArray(scoutingReports.ownerId, createdUserIds));
  await getDb().delete(matches).where(inArray(matches.ownerId, createdUserIds));
  await getDb().delete(opponents).where(inArray(opponents.ownerId, createdUserIds));
  await getDb().delete(users).where(inArray(users.id, createdUserIds));
});

describe('callStructured', () => {
  it('forces the tool, validates the output and records usage', async () => {
    const { userId } = await createPlayer();
    createCompletion.mockResolvedValue(toolResponse('submit', { answer: 'ok' }));

    await expect(callStructured(callOptions(userId))).resolves.toEqual({ data: { answer: 'ok' }, model: 'test-model' });

    const [request] = createCompletion.mock.calls[0] as [Record<string, unknown>];
    expect(request.tool_choice).toEqual({ type: 'function', function: { name: 'submit' } });
    expect(JSON.stringify(request.tools)).toContain('"answer"');
    expect(JSON.stringify(request.tools)).not.toContain('$schema');
    expect(await countAiCallsSince(userId, new Date(Date.now() - 60_000))).toBe(1);
  });

  it('retries once after invalid output, then succeeds', async () => {
    const { userId } = await createPlayer();
    createCompletion
      .mockResolvedValueOnce(toolResponse('submit', { wrong: true }))
      .mockResolvedValueOnce(toolResponse('submit', { answer: 'second try' }));

    await expect(callStructured(callOptions(userId))).resolves.toMatchObject({ data: { answer: 'second try' } });
    expect(createCompletion).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['invalid output', () => toolResponse('submit', { wrong: true })],
    ['a different tool', () => toolResponse('other', { answer: 'x' })],
    ['plain text', () => ({ choices: [{ message: { content: 'Sorry' } }] })],
    [
      'broken JSON',
      () => ({
        choices: [{ message: { tool_calls: [{ type: 'function', function: { name: 'submit', arguments: '{oops' } }] } }],
      }),
    ],
  ])('throws a typed error after two attempts of %s', async (_label, respond) => {
    const { userId } = await createPlayer();
    createCompletion.mockImplementation(async () => Promise.resolve(respond()));

    await expect(callStructured(callOptions(userId))).rejects.toBeInstanceOf(AiValidationError);
    expect(createCompletion).toHaveBeenCalledTimes(2);
  });

  it('falls back to the second model when the first is overloaded', async () => {
    const { userId } = await createPlayer();
    createCompletion
      .mockRejectedValueOnce(Object.assign(new Error('busy'), { status: 503 }))
      .mockResolvedValueOnce(toolResponse('submit', { answer: 'from fallback' }));

    const result = await callStructured({ ...callOptions(userId), fallbackModel: 'backup-model' });

    expect(result).toEqual({ data: { answer: 'from fallback' }, model: 'backup-model' });
    const models = createCompletion.mock.calls.map(([request]) => (request as { model: string }).model);
    expect(models).toEqual(['test-model', 'backup-model']);
  });

  it('does not fall back on a non-overload error such as a bad key', async () => {
    const { userId } = await createPlayer();
    createCompletion.mockRejectedValue(Object.assign(new Error('denied'), { status: 401 }));

    await expect(callStructured({ ...callOptions(userId), fallbackModel: 'backup-model' })).rejects.toBeInstanceOf(
      AiProviderError,
    );
    expect(createCompletion).toHaveBeenCalledTimes(1);
  });

  it('reports a provider error when the fallback is overloaded too', async () => {
    const { userId } = await createPlayer();
    createCompletion.mockRejectedValue(Object.assign(new Error('busy'), { status: 503 }));

    await expect(callStructured({ ...callOptions(userId), fallbackModel: 'backup-model' })).rejects.toBeInstanceOf(
      AiProviderError,
    );
    expect(createCompletion).toHaveBeenCalledTimes(2);
  });

  it('stops at the hourly limit without calling the provider', async () => {
    const { userId } = await createPlayer();
    createCompletion.mockResolvedValue(toolResponse('submit', { answer: 'ok' }));
    for (let call = 0; call < 5; call += 1) {
      await callStructured(callOptions(userId));
    }
    createCompletion.mockClear();

    await expect(callStructured(callOptions(userId))).rejects.toBeInstanceOf(AiRateLimitError);
    expect(createCompletion).not.toHaveBeenCalled();
  });
});

describe('scouting report action', () => {
  it('refuses without enough data and makes no AI call', async () => {
    const { opponentId } = await createPlayer();

    expect(await generateScoutingReportAction(opponentId)).toEqual({ status: 'not_enough_data' });
    expect(createCompletion).not.toHaveBeenCalled();
  });

  it('saves the report with code-computed confidence and no names sent to the provider', async () => {
    const { userId, opponentId } = await createPlayer();
    await playCompletedMatch(userId, opponentId);
    createCompletion.mockResolvedValue(toolResponse('submit_scouting_report', goodReport));

    expect(await generateScoutingReportAction(opponentId)).toEqual({ status: 'generated' });

    const [stored] = await listScoutingReports(userId, opponentId);
    expect(stored?.matchCount).toBe(1);
    expect(stored?.report).toMatchObject({ headline: 'Fix your receive', confidence: 'low' });
    const sent = JSON.stringify(createCompletion.mock.calls[0]);
    expect(sent).not.toContain(NAME_IN_DATABASE);
    expect(sent).not.toContain('Unique Player Name');
  });

  it('fails gracefully on bad AI output and saves nothing', async () => {
    const { userId, opponentId } = await createPlayer();
    await playCompletedMatch(userId, opponentId);
    createCompletion.mockResolvedValue(toolResponse('submit_scouting_report', { headline: 'nope' }));

    expect(await generateScoutingReportAction(opponentId)).toEqual({ status: 'failed' });
    expect(await listScoutingReports(userId, opponentId)).toEqual([]);
  });

  it('fails gracefully when the provider errors', async () => {
    const { userId, opponentId } = await createPlayer();
    await playCompletedMatch(userId, opponentId);
    createCompletion.mockRejectedValue(new Error('503'));

    expect(await generateScoutingReportAction(opponentId)).toEqual({ status: 'failed' });
  });

  it('cannot generate a report on another user’s opponent', async () => {
    const owner = await createPlayer();
    await playCompletedMatch(owner.userId, owner.opponentId);
    await createPlayer();

    expect(await generateScoutingReportAction(owner.opponentId)).toEqual({ status: 'failed' });
    expect(createCompletion).not.toHaveBeenCalled();
    expect(await listScoutingReports(owner.userId, owner.opponentId)).toEqual([]);
  });

  it('rejects a malformed id', async () => {
    await createPlayer();

    expect(await generateScoutingReportAction('nope')).toEqual({ status: 'failed' });
  });
});

describe('match summary action', () => {
  it('saves the summary, and undoing the final point clears it', async () => {
    const { userId, opponentId } = await createPlayer();
    const matchId = await playCompletedMatch(userId, opponentId);
    createCompletion.mockResolvedValue(toolResponse('submit_match_summary', goodSummary));

    expect(await generateMatchSummaryAction(matchId)).toEqual({ status: 'generated' });
    expect((await getMatchWithPoints(userId, matchId))?.match.summary).toMatchObject({ headline: 'Solid win' });

    await undoLastPoint(userId, matchId, POINTS_IN_THREE_STRAIGHT_GAMES);

    const reopened = await getMatchWithPoints(userId, matchId);
    expect(reopened?.match.status).toBe(MatchStatus.InProgress);
    expect(reopened?.match.summary).toBeNull();
  });

  it('refuses a match still in progress', async () => {
    const { userId, opponentId } = await createPlayer();
    const match = await createMatch(userId, {
      opponentId,
      bestOf: 3,
      firstServer: Side.Me,
      eventType: EventType.Casual,
    });

    expect(await generateMatchSummaryAction(match?.id ?? '')).toEqual({ status: 'not_enough_data' });
    expect(createCompletion).not.toHaveBeenCalled();
  });

  it('cannot summarize another user’s match', async () => {
    const owner = await createPlayer();
    const matchId = await playCompletedMatch(owner.userId, owner.opponentId);
    await createPlayer();

    expect(await generateMatchSummaryAction(matchId)).toEqual({ status: 'failed' });
    expect(createCompletion).not.toHaveBeenCalled();
  });
});
