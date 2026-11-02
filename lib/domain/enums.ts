export const Side = { Me: 'me', Opponent: 'opponent' } as const;
export type Side = (typeof Side)[keyof typeof Side];

export const Handedness ={ Right: 'right', Left: 'left' } as const;
export type Handedness = (typeof Handedness)[keyof typeof Handedness];

export const Grip = { Shakehand: 'shakehand', Penhold: 'penhold' } as const;
export type Grip = (typeof Grip)[keyof typeof Grip];

export const PlayStyle = {
  OffensiveLooper: 'offensive_looper',
  AllRound: 'all_round',
  CloseToTableHitter: 'close_to_table_hitter',
  Blocker: 'blocker',
  DefenderChopper: 'defender_chopper',
  PenholdAttacker: 'penhold_attacker',
} as const;
export type PlayStyle = (typeof PlayStyle)[keyof typeof PlayStyle];

export const RubberType = {
  Inverted: 'inverted',
  ShortPips: 'short_pips',
  LongPips: 'long_pips',
  Anti: 'anti',
} as const;
export type RubberType = (typeof RubberType)[keyof typeof RubberType];
