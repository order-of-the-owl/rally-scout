import { randomUUID } from 'node:crypto';

import { auth } from '@clerk/nextjs/server';
import { eq, inArray } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { completeOnboardingAction, updateProfileAction } from '@/lib/actions/profile';
import { requireOnboardedUser } from '@/lib/auth';
import { Route } from '@/lib/config/routes';
import { getDb } from '@/lib/db';
import { getOrCreateUser } from '@/lib/db/queries/users';
import { users } from '@/lib/db/schema';
import { Grip, Handedness, PlayStyle } from '@/lib/domain/enums';
import { userIdSchema, type UserId } from '@/lib/domain/ids';
import type { ProfileFormState } from '@/lib/validation/profile';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
}));

const IDLE: ProfileFormState = { status: 'idle' };
const createdUserIds: UserId[] = [];

function signInAsNewUser(): UserId {
  const userId = userIdSchema.parse(`test_${randomUUID()}`);
  createdUserIds.push(userId);
  // Cast because the real session type has many fields these tests never read.
  vi.mocked(auth).mockResolvedValue({ userId, redirectToSignIn: vi.fn() } as never);
  return userId;
}

function buildForm(overrides: Readonly<Record<string, string>> = {}): FormData {
  const formData = new FormData();
  const fields = {
    displayName: 'Sam',
    handedness: Handedness.Right,
    grip: Grip.Shakehand,
    playStyle: PlayStyle.AllRound,
    blade: '',
    forehandRubber: '',
    backhandRubber: '',
    ...overrides,
  };
  for (const [name, value] of Object.entries(fields)) {
    formData.set(name, value);
  }
  return formData;
}

beforeEach(() => {
  vi.mocked(redirect).mockClear();
});

afterAll(async () => {
  await getDb().delete(users).where(inArray(users.id, createdUserIds));
});

describe('completeOnboardingAction', () => {
  it('saves a valid profile and redirects to the dashboard', async () => {
    const userId = signInAsNewUser();

    await expect(completeOnboardingAction(IDLE, buildForm())).rejects.toThrow(`redirect:${Route.Dashboard}`);

    const [user] = await getDb().select().from(users).where(eq(users.id, userId));
    expect(user?.displayName).toBe('Sam');
    expect(user?.onboardedAt).toBeInstanceOf(Date);
  });

  it('returns field errors and the submitted values without saving', async () => {
    const userId = signInAsNewUser();

    const state = await completeOnboardingAction(IDLE, buildForm({ displayName: '  ', grip: 'seemiller' }));

    expect(state).toMatchObject({
      status: 'invalid',
      fieldErrors: { displayName: ['Enter your name'], grip: ['Choose one'] },
      values: { grip: 'seemiller', handedness: Handedness.Right },
    });
    expect(await getDb().select().from(users).where(eq(users.id, userId))).toEqual([]);
  });

  it('asks for a choice when a radio group is left empty', async () => {
    signInAsNewUser();
    const formData = buildForm();
    formData.delete('playStyle');

    const state = await completeOnboardingAction(IDLE, formData);

    expect(state).toMatchObject({ status: 'invalid', fieldErrors: { playStyle: ['Choose one'] } });
  });

  it('ignores a user id submitted in the form', async () => {
    const userId = signInAsNewUser();
    const victimId = userIdSchema.parse(`test_${randomUUID()}`);
    createdUserIds.push(victimId);

    await expect(completeOnboardingAction(IDLE, buildForm({ id: victimId }))).rejects.toThrow('redirect:');

    expect(await getDb().select().from(users).where(eq(users.id, victimId))).toEqual([]);
    expect(await getDb().select().from(users).where(eq(users.id, userId))).toHaveLength(1);
  });
});

describe('updateProfileAction', () => {
  it('saves changes and stays on the page', async () => {
    const userId = signInAsNewUser();
    await expect(completeOnboardingAction(IDLE, buildForm())).rejects.toThrow('redirect:');

    const state = await updateProfileAction(IDLE, buildForm({ displayName: 'Sam L', blade: 'Viscaria' }));

    expect(state).toMatchObject({ status: 'saved', values: { displayName: 'Sam L' } });
    expect(redirect).toHaveBeenCalledTimes(1);
    const [user] = await getDb().select().from(users).where(eq(users.id, userId));
    expect(user).toMatchObject({ displayName: 'Sam L', blade: 'Viscaria' });
  });

  it('returns errors without changing the saved profile', async () => {
    const userId = signInAsNewUser();
    await expect(completeOnboardingAction(IDLE, buildForm())).rejects.toThrow('redirect:');

    const state = await updateProfileAction(IDLE, buildForm({ displayName: ' ' }));

    expect(state.status).toBe('invalid');
    const [user] = await getDb().select().from(users).where(eq(users.id, userId));
    expect(user?.displayName).toBe('Sam');
  });
});

describe('requireOnboardedUser', () => {
  it('sends a user who has not onboarded to onboarding', async () => {
    signInAsNewUser();

    await expect(requireOnboardedUser()).rejects.toThrow(`redirect:${Route.Onboarding}`);
  });

  it('lets an onboarded user through', async () => {
    const userId = signInAsNewUser();
    await expect(completeOnboardingAction(IDLE, buildForm())).rejects.toThrow('redirect:');

    expect(await requireOnboardedUser()).toEqual(await getOrCreateUser(userId));
  });
});
