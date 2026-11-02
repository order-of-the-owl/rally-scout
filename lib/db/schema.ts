import { index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { INITIAL_RATING } from '@/lib/domain/constants';
import { Grip, Handedness, PlayStyle, RubberType } from '@/lib/domain/enums';
import type { OpponentId, UserId } from '@/lib/domain/ids';

export const handednessEnum = pgEnum('handedness', Handedness);
export const gripEnum = pgEnum('grip', Grip);
export const playStyleEnum = pgEnum('play_style', PlayStyle);
export const rubberTypeEnum = pgEnum('rubber_type', RubberType);

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
