import { randomUUID } from 'node:crypto';

import { auth } from '@clerk/nextjs/server';
import { eq, inArray } from 'drizzle-orm';
import { afterAll, describe, expect, it, vi } from 'vitest';

import { createOpponentAction, updateOpponentAction } from '@/lib/actions/opponents';
import { Route } from '@/lib/config/routes';
import { getDb } from '@/lib/db';
import { createOpponent, getOpponent, listOpponents, updateOpponent } from '@/lib/db/queries/opponents';
import { saveProfile } from '@/lib/db/queries/users';
import { opponents, users } from '@/lib/db/schema';
import { Grip, Handedness, PlayStyle } from '@/lib/domain/enums';
import { userIdSchema, type UserId } from '@/lib/domain/ids';
import type { OpponentFormState, OpponentInput } from '@/lib/validation/opponent';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
}));

const IDLE: OpponentFormState = { status: 'idle' };
const createdUserIds: UserId[] = [];

const input: OpponentInput = {
  name: 'Alex',
  handedness: null,
  grip: null,
  playStyle: PlayStyle.Blocker,
  forehandRubberType: null,
  backhandRubberType: null,
  notes: null,
};

async function createOnboardedUser(): Promise<UserId> {
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
  return userId;
}

function signInAs(userId: UserId): void {
  // Cast because the real session type has many fields these tests never read.
  vi.mocked(auth).mockResolvedValue({ userId, redirectToSignIn: vi.fn() } as never);
}

function buildForm(fields: Readonly<Record<string, string>>): FormData {
  const formData = new FormData();
  for (const [name, value] of Object.entries({ notes: '', ...fields })) {
    formData.set(name, value);
  }
  return formData;
}

afterAll(async () => {
  await getDb().delete(opponents).where(inArray(opponents.ownerId, createdUserIds));
  await getDb().delete(users).where(inArray(users.id, createdUserIds));
});

describe('opponent queries', () => {
  it('creates an opponent with default rating and sorts by name', async () => {
    const userId = await createOnboardedUser();
    const created = await createOpponent(userId, { ...input, name: 'Zed' });
    await createOpponent(userId, { ...input, name: 'Alex' });

    expect(created.rating).toBe(1200);
    expect((await listOpponents(userId)).map(({ name }) => name)).toEqual(['Alex', 'Zed']);
  });

  it('searches by name, treating wildcards as plain text', async () => {
    const userId = await createOnboardedUser();
    await createOpponent(userId, { ...input, name: 'Alex Chen' });
    await createOpponent(userId, { ...input, name: '100% Pat' });

    expect((await listOpponents(userId, 'chen')).map(({ name }) => name)).toEqual(['Alex Chen']);
    expect((await listOpponents(userId, '%')).map(({ name }) => name)).toEqual(['100% Pat']);
    expect(await listOpponents(userId, '_')).toEqual([]);
  });
});

describe('data isolation between users', () => {
  it('never lists or returns another user’s opponent', async () => {
    const owner = await createOnboardedUser();
    const stranger = await createOnboardedUser();
    const opponent = await createOpponent(owner, input);

    expect(await listOpponents(stranger)).toEqual([]);
    expect(await listOpponents(stranger, input.name)).toEqual([]);
    expect(await getOpponent(stranger, opponent.id)).toBeNull();
    expect(await getOpponent(owner, opponent.id)).toEqual(opponent);
  });

  it('never updates another user’s opponent', async () => {
    const owner = await createOnboardedUser();
    const stranger = await createOnboardedUser();
    const opponent = await createOpponent(owner, input);

    expect(await updateOpponent(stranger, opponent.id, { ...input, name: 'Hacked' })).toBeNull();
    expect((await getOpponent(owner, opponent.id))?.name).toBe('Alex');
  });

  it('rejects an update action aimed at another user’s opponent', async () => {
    const owner = await createOnboardedUser();
    const stranger = await createOnboardedUser();
    const opponent = await createOpponent(owner, input);
    signInAs(stranger);

    const state = await updateOpponentAction(opponent.id, IDLE, buildForm({ name: 'Hacked' }));

    expect(state.status).toBe('failed');
    expect((await getOpponent(owner, opponent.id))?.name).toBe('Alex');
  });

  it('ignores an owner id submitted in the create form', async () => {
    const victim = await createOnboardedUser();
    const attacker = await createOnboardedUser();
    signInAs(attacker);

    await expect(createOpponentAction(IDLE, buildForm({ name: 'Planted', ownerId: victim }))).rejects.toThrow(
      `redirect:${Route.Opponents}/`,
    );

    expect(await listOpponents(victim)).toEqual([]);
    expect((await listOpponents(attacker)).map(({ name }) => name)).toEqual(['Planted']);
  });
});

describe('opponent actions', () => {
  it('returns field errors and keeps values without saving', async () => {
    const userId = await createOnboardedUser();
    signInAs(userId);

    const state = await createOpponentAction(IDLE, buildForm({ name: ' ', grip: 'seemiller' }));

    expect(state).toMatchObject({
      status: 'invalid',
      fieldErrors: { name: ['Enter a name'], grip: ['Choose one'] },
      values: { grip: 'seemiller' },
    });
    expect(await getDb().select().from(opponents).where(eq(opponents.ownerId, userId))).toEqual([]);
  });

  it('updates an owned opponent and returns to its page', async () => {
    const userId = await createOnboardedUser();
    const opponent = await createOpponent(userId, input);
    signInAs(userId);

    await expect(updateOpponentAction(opponent.id, IDLE, buildForm({ name: 'Alex C' }))).rejects.toThrow(
      `redirect:${Route.Opponents}/${opponent.id}`,
    );

    expect(await getOpponent(userId, opponent.id)).toMatchObject({ name: 'Alex C', playStyle: null });
  });

  it('sends a user who has not onboarded to onboarding', async () => {
    const userId = userIdSchema.parse(`test_${randomUUID()}`);
    createdUserIds.push(userId);
    signInAs(userId);

    await expect(createOpponentAction(IDLE, buildForm({ name: 'Alex' }))).rejects.toThrow(
      `redirect:${Route.Onboarding}`,
    );
  });
});
