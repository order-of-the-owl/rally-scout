import { and, asc, eq, ilike } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { opponents } from '@/lib/db/schema';
import type { OpponentId, UserId } from '@/lib/domain/ids';
import type { OpponentInput } from '@/lib/validation/opponent';

export type Opponent = typeof opponents.$inferSelect;

function escapeLikePattern(text: string): string {
  return text.replace(/[\\%_]/g, '\\$&');
}

export async function listOpponents(ownerId: UserId, search = ''): Promise<Opponent[]> {
  const query = search.trim();
  return getDb()
    .select()
    .from(opponents)
    .where(
      and(
        eq(opponents.ownerId, ownerId),
        query === '' ? undefined : ilike(opponents.name, `%${escapeLikePattern(query)}%`),
      ),
    )
    .orderBy(asc(opponents.name));
}

export async function getOpponent(ownerId: UserId, opponentId: OpponentId): Promise<Opponent | null> {
  const [opponent] = await getDb()
    .select()
    .from(opponents)
    .where(and(eq(opponents.id, opponentId), eq(opponents.ownerId, ownerId)));
  return opponent ?? null;
}

export async function createOpponent(ownerId: UserId, input: OpponentInput): Promise<Opponent> {
  const [opponent] = await getDb()
    .insert(opponents)
    .values({ ...input, ownerId })
    .returning();
  if (!opponent) {
    throw new Error('Opponent row missing after insert');
  }
  return opponent;
}

export async function updateOpponent(
  ownerId: UserId,
  opponentId: OpponentId,
  input: OpponentInput,
): Promise<Opponent | null> {
  const [opponent] = await getDb()
    .update(opponents)
    .set(input)
    .where(and(eq(opponents.id, opponentId), eq(opponents.ownerId, ownerId)))
    .returning();
  return opponent ?? null;
}
