export const Side = { Me: 'me', Opponent: 'opponent' } as const;
export type Side = (typeof Side)[keyof typeof Side];

export const Handedness = { Right: 'right', Left: 'left' } as const;
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

export const MatchStatus = {
  InProgress: 'in_progress',
  Completed: 'completed',
  Abandoned: 'abandoned',
} as const;
export type MatchStatus = (typeof MatchStatus)[keyof typeof MatchStatus];

export const EventType = {
  Casual: 'casual',
  League: 'league',
  Tournament: 'tournament',
} as const;
export type EventType = (typeof EventType)[keyof typeof EventType];

export const PointEnding = {
  ServeAce: 'serve_ace',
  ServeError: 'serve_error',
  ReceiveError: 'receive_error',
  ThirdBallWinner: 'third_ball_winner',
  ThirdBallError: 'third_ball_error',
  ForehandWinner: 'fh_winner',
  BackhandWinner: 'bh_winner',
  ForehandUnforcedError: 'fh_unforced_error',
  BackhandUnforcedError: 'bh_unforced_error',
  ForcedError: 'forced_error',
  NetOrEdge: 'net_or_edge',
  Other: 'other',
} as const;
export type PointEnding = (typeof PointEnding)[keyof typeof PointEnding];

export const RallyLengthBucket = { Short: 'short', Medium: 'medium', Long: 'long' } as const;
export type RallyLengthBucket = (typeof RallyLengthBucket)[keyof typeof RallyLengthBucket];
