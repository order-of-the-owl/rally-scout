import { eq, sql } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { users } from '@/lib/db/schema';
import type { UserId } from '@/lib/domain/ids';
import type { Profile } from '@/lib/validation/profile';

export type User = typeof users.$inferSelect;

function requireRow(row: User | undefined, userId: UserId): User {
  if (!row) {
    throw new Error(`User row missing after write: ${userId}`);
  }
  return row;
}

export async function getOrCreateUser(userId: UserId): Promise<User> {
  const db = getDb();
  await db.insert(users).values({ id: userId }).onConflictDoNothing();
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  return requireRow(user, userId);
}

export async function saveProfile(userId: UserId, profile: Profile): Promise<User> {
  const [user] = await getDb()
    .insert(users)
    .values({ id: userId, ...profile, onboardedAt: sql`now()` })
    .onConflictDoUpdate({
      target: users.id,
      set: { ...profile, onboardedAt: sql`coalesce(${users.onboardedAt}, now())` },
    })
    .returning();
  return requireRow(user, userId);
}
