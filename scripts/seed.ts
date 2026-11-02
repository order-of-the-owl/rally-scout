import { existsSync } from 'node:fs';
import { parseArgs } from 'node:util';

import { and, eq, inArray, sql } from 'drizzle-orm';

import { getDatabaseUrl } from '@/lib/config/env';
import { getDb } from '@/lib/db';
import { getOrCreateUser } from '@/lib/db/queries/users';
import { matches, opponents, points } from '@/lib/db/schema';
import { EventType, MatchStatus, PlayStyle, PointEnding, RubberType, Side } from '@/lib/domain/enums';
import { userIdSchema, type UserId } from '@/lib/domain/ids';
import type { BestOf } from '@/lib/domain/scoring';
import { logger } from '@/lib/logger';
import { createRandomSource, simulateMatch, type SimulationProfile } from './simulate-match';

const LOCAL_ENV_FILE = '.env.local';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);
const RANDOM_SEED = 20261102;
const SEED_MARKER = { seeded: true } as const;
const DAY_MS = 86_400_000;
const SEED_WINDOW_DAYS = 90;
const TAG_RATE = 0.85;

interface DemoOpponent {
  name: string;
  playStyle: PlayStyle;
  forehandRubberType: RubberType;
  backhandRubberType: RubberType;
  notes: string;
  matchCount: number;
  profile: SimulationProfile;
}

const demoOpponents: readonly DemoOpponent[] = [
  {
    name: 'Dana Whitfield',
    playStyle: PlayStyle.Blocker,
    forehandRubberType: RubberType.Inverted,
    backhandRubberType: RubberType.LongPips,
    notes: 'Long pips on the backhand. Blocks everything back low, so pushes float on you.',
    matchCount: 3,
    profile: {
      winRateOnMyServe: 0.5,
      winRateOnTheirServe: 0.42,
      tagRate: TAG_RATE,
      endingWeights: { [PointEnding.BackhandUnforcedError]: 5, [PointEnding.ThirdBallError]: 3 },
    },
  },
  {
    name: 'Priya Natarajan',
    playStyle: PlayStyle.DefenderChopper,
    forehandRubberType: RubberType.Inverted,
    backhandRubberType: RubberType.ShortPips,
    notes: 'Chops from well back. Patient, and punishes rushed loops.',
    matchCount: 3,
    profile: {
      winRateOnMyServe: 0.54,
      winRateOnTheirServe: 0.46,
      tagRate: TAG_RATE,
      endingWeights: { [PointEnding.ForehandUnforcedError]: 3, [PointEnding.BackhandUnforcedError]: 4 },
    },
  },
  {
    name: 'Marek Kowal',
    playStyle: PlayStyle.OffensiveLooper,
    forehandRubberType: RubberType.Inverted,
    backhandRubberType: RubberType.Inverted,
    notes: 'Heavy pendulum serve to the forehand, then a big third-ball loop.',
    matchCount: 5,
    profile: {
      winRateOnMyServe: 0.56,
      winRateOnTheirServe: 0.38,
      tagRate: TAG_RATE,
      endingWeights: { [PointEnding.ReceiveError]: 24, [PointEnding.ThirdBallWinner]: 3 },
    },
  },
  {
    name: 'Sasha Ito',
    playStyle: PlayStyle.CloseToTableHitter,
    forehandRubberType: RubberType.Inverted,
    backhandRubberType: RubberType.ShortPips,
    notes: 'Stands right at the table and takes everything early. Fast, but struggles with spin.',
    matchCount: 3,
    profile: {
      winRateOnMyServe: 0.66,
      winRateOnTheirServe: 0.56,
      tagRate: TAG_RATE,
      endingWeights: { [PointEnding.ForehandWinner]: 3, [PointEnding.ThirdBallWinner]: 3 },
    },
  },
];

const BEST_OF_ROTATION: readonly BestOf[] = [5, 3, 5, 5, 7];

async function deleteSeededData(userId: UserId): Promise<void> {
  const db = getDb();
  const seeded = await db
    .select({ id: opponents.id })
    .from(opponents)
    .where(and(eq(opponents.ownerId, userId), sql`${opponents.traits} @> ${JSON.stringify(SEED_MARKER)}::jsonb`));
  const seededIds = seeded.map(({ id }) => id);
  if (seededIds.length === 0) {
    return;
  }
  await db.delete(matches).where(and(eq(matches.ownerId, userId), inArray(matches.opponentId, seededIds)));
  await db.delete(opponents).where(inArray(opponents.id, seededIds));
}

async function seed(userId: UserId): Promise<void> {
  const db = getDb();
  await getOrCreateUser(userId);
  await deleteSeededData(userId);

  const random = createRandomSource(RANDOM_SEED);
  const totalMatches = demoOpponents.reduce((total, { matchCount }) => total + matchCount, 0);
  const now = Date.now();
  let matchIndex = 0;

  for (const { profile, matchCount, ...details } of demoOpponents) {
    const [opponent] = await db
      .insert(opponents)
      .values({ ...details, ownerId: userId, traits: SEED_MARKER })
      .returning({ id: opponents.id });
    if (!opponent) {
      throw new Error('Opponent row missing after insert');
    }

    for (let round = 0; round < matchCount; round += 1) {
      const bestOf = BEST_OF_ROTATION[matchIndex % BEST_OF_ROTATION.length] ?? 5;
      const firstServer = random() < 0.5 ? Side.Me : Side.Opponent;
      const { points: simulated, state } = simulateMatch({ bestOf, firstServer }, profile, random);
      if (!state.isComplete) {
        throw new Error('Simulated match did not finish');
      }

      const playedAt = new Date(now - ((totalMatches - matchIndex) / totalMatches) * SEED_WINDOW_DAYS * DAY_MS);
      const [match] = await db
        .insert(matches)
        .values({
          ownerId: userId,
          opponentId: opponent.id,
          bestOf,
          firstServer,
          status: MatchStatus.Completed,
          winner: state.winner,
          eventType: matchIndex % 2 === 0 ? EventType.League : EventType.Casual,
          playedAt,
          completedAt: playedAt,
          createdAt: playedAt,
        })
        .returning({ id: matches.id });
      if (!match) {
        throw new Error('Match row missing after insert');
      }

      await db
        .insert(points)
        .values(simulated.map((point, index) => ({ ...point, matchId: match.id, seq: index + 1 })));
      matchIndex += 1;
    }
  }

  logger.info('seed.completed', { userId, opponents: demoOpponents.length, matches: totalMatches });
}

async function main(): Promise<void> {
  if (existsSync(LOCAL_ENV_FILE)) {
    process.loadEnvFile(LOCAL_ENV_FILE);
  }

  const { values } = parseArgs({
    options: { user: { type: 'string' }, 'allow-remote': { type: 'boolean', default: false } },
  });
  if (!values.user) {
    throw new Error('Pass the Clerk user id: pnpm db:seed --user <clerkId>');
  }
  if (!LOCAL_HOSTS.has(new URL(getDatabaseUrl()).hostname) && !values['allow-remote']) {
    throw new Error('DATABASE_URL is not local. Pass --allow-remote to seed a deployed database.');
  }

  await seed(userIdSchema.parse(values.user));
}

main().then(
  () => {
    process.exit(0);
  },
  (error: unknown) => {
    logger.error('seed.failed', { error });
    process.exit(1);
  },
);
