import { check, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import { INITIAL_RATING } from '@/lib/domain/constants';
import {
  EventType,
  Grip,
  Handedness,
  MatchStatus,
  PlayStyle,
  PointEnding,
  RallyLengthBucket,
  RubberType,
  Side,
} from '@/lib/domain/enums';
import type { MatchId, OpponentId, PointId, UserId } from '@/lib/domain/ids';
import type { BestOf } from '@/lib/domain/scoring';

export const handednessEnum = pgEnum('handedness', Handedness);
export const gripEnum = pgEnum('grip', Grip);
export const playStyleEnum = pgEnum('play_style', PlayStyle);
export const rubberTypeEnum = pgEnum('rubber_type', RubberType);
export const sideEnum = pgEnum('side', Side);
export const matchStatusEnum = pgEnum('match_status', MatchStatus);
export const eventTypeEnum = pgEnum('event_type', EventType);
export const pointEndingEnum = pgEnum('point_ending', PointEnding);
export const rallyLengthBucketEnum = pgEnum('rally_length_bucket', RallyLengthBucket);

export const users = pgTable('users', {
  id: text('id').primaryKey().$type<UserId>(),
  displayName: text('display_name'),
  handedness: handednessEnum('handedness'),
  grip: gripEnum('grip'),
  playStyle: playStyleEnum('play_style'),
  blade: text('blade'),
  forehandRubber: text('fh_rubber'),
  backhandRubber: text('bh_rubber'),
  rating: integer('rating').notNull().default(INITIAL_RATING),
  onboardedAt: timestamp('onboarded_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const opponents = pgTable(
  'opponents',
  {
    id: uuid('id').primaryKey().defaultRandom().$type<OpponentId>(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id)
      .$type<UserId>(),
    name: text('name').notNull(),
    handedness: handednessEnum('handedness'),
    grip: gripEnum('grip'),
    playStyle: playStyleEnum('play_style'),
    forehandRubberType: rubberTypeEnum('fh_rubber_type'),
    backhandRubberType: rubberTypeEnum('bh_rubber_type'),
    traits: jsonb('traits').notNull().default({}),
    notes: text('notes'),
    rating: integer('rating').notNull().default(INITIAL_RATING),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('opponents_owner_id_idx').on(table.ownerId)],
);

export const matches = pgTable(
  'matches',
  {
    id: uuid('id').primaryKey().defaultRandom().$type<MatchId>(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id)
      .$type<UserId>(),
    opponentId: uuid('opponent_id')
      .notNull()
      .references(() => opponents.id)
      .$type<OpponentId>(),
    bestOf: integer('best_of').notNull().$type<BestOf>(),
    firstServer: sideEnum('first_server').notNull(),
    status: matchStatusEnum('status').notNull().default(MatchStatus.InProgress),
    winner: sideEnum('winner'),
    eventType: eventTypeEnum('event_type').notNull(),
    location: text('location'),
    playedAt: timestamp('played_at', { withTimezone: true }).notNull().defaultNow(),
    ratingBefore: integer('rating_before'),
    ratingAfter: integer('rating_after'),
    summary: jsonb('summary'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [
    index('matches_owner_opponent_played_at_idx').on(table.ownerId, table.opponentId, table.playedAt),
    check('matches_best_of_check', sql`${table.bestOf} in (3, 5, 7)`),
  ],
);

export const points = pgTable(
  'points',
  {
    id: uuid('id').primaryKey().defaultRandom().$type<PointId>(),
    matchId: uuid('match_id')
      .notNull()
      .references(() => matches.id, { onDelete: 'cascade' })
      .$type<MatchId>(),
    seq: integer('seq').notNull(),
    gameNumber: integer('game_number').notNull(),
    winner: sideEnum('winner').notNull(),
    server: sideEnum('server').notNull(),
    ending: pointEndingEnum('ending'),
    actor: sideEnum('actor'),
    rallyLengthBucket: rallyLengthBucketEnum('rally_length_bucket'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('points_match_id_seq_idx').on(table.matchId, table.seq)],
);
