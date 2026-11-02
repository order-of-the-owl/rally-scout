import { randomUUID } from 'node:crypto';

import { inArray } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';

import { getDb } from '@/lib/db';
import { getOrCreateUser, saveProfile } from '@/lib/db/queries/users';
import { users } from '@/lib/db/schema';
import { INITIAL_RATING } from '@/lib/domain/constants';
import { Grip, Handedness, PlayStyle } from '@/lib/domain/enums';
import { userIdSchema, type UserId } from '@/lib/domain/ids';
import type { Profile } from '@/lib/validation/profile';

const createdUserIds: UserId[] = [];

function newUserId(): UserId {
  const userId = userIdSchema.parse(`test_${randomUUID()}`);
  createdUserIds.push(userId);
  return userId;
}

const profile: Profile = {
  displayName: 'Sam',
  handedness: Handedness.Left,
  grip: Grip.Penhold,
  playStyle: PlayStyle.Blocker,
  blade: 'Viscaria',
  forehandRubber: null,
  backhandRubber: null,
};

afterAll(async () => {
  await getDb().delete(users).where(inArray(users.id, createdUserIds));
});

describe('getOrCreateUser', () => {
  it('creates a user who has not onboarded yet', async () => {
    const user = await getOrCreateUser(newUserId());

    expect(user.onboardedAt).toBeNull();
    expect(user.rating).toBe(INITIAL_RATING);
  });

  it('returns the existing row without changing it', async () => {
    const userId = newUserId();
    const saved = await saveProfile(userId, profile);

    expect(await getOrCreateUser(userId)).toEqual(saved);
  });
});

describe('saveProfile', () => {
  it('saves the profile and marks the user onboarded', async () => {
    const userId = newUserId();
    await getOrCreateUser(userId);

    const user = await saveProfile(userId, profile);

    expect(user).toMatchObject(profile);
    expect(user.onboardedAt).toBeInstanceOf(Date);
  });

  it('keeps the original onboarding time when editing later', async () => {
    const userId = newUserId();
    const first = await saveProfile(userId, profile);

    const edited = await saveProfile(userId, { ...profile, displayName: 'Sam L' });

    expect(edited.displayName).toBe('Sam L');
    expect(edited.onboardedAt).toEqual(first.onboardedAt);
  });

  it('only changes the given user', async () => {
    const otherUserId = newUserId();
    const other = await getOrCreateUser(otherUserId);

    await saveProfile(newUserId(), profile);

    expect(await getOrCreateUser(otherUserId)).toEqual(other);
  });
});
