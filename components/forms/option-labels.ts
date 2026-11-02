import { EventType, Grip, Handedness, PlayStyle, PointEnding, RubberType } from '@/lib/domain/enums';

export const handednessLabels = {
  [Handedness.Right]: 'Right',
  [Handedness.Left]: 'Left',
} as const satisfies Record<Handedness, string>;

export const gripLabels = {
  [Grip.Shakehand]: 'Shakehand',
  [Grip.Penhold]: 'Penhold',
} as const satisfies Record<Grip, string>;

export const playStyleLabels = {
  [PlayStyle.OffensiveLooper]: 'Offensive looper',
  [PlayStyle.AllRound]: 'All-round',
  [PlayStyle.CloseToTableHitter]: 'Close-to-table hitter',
  [PlayStyle.Blocker]: 'Blocker',
  [PlayStyle.DefenderChopper]: 'Defender / chopper',
  [PlayStyle.PenholdAttacker]: 'Penhold attacker',
} as const satisfies Record<PlayStyle, string>;

export const rubberTypeLabels = {
  [RubberType.Inverted]: 'Inverted',
  [RubberType.ShortPips]: 'Short pips',
  [RubberType.LongPips]: 'Long pips',
  [RubberType.Anti]: 'Anti-spin',
} as const satisfies Record<RubberType, string>;

export const eventTypeLabels = {
  [EventType.Casual]: 'Casual',
  [EventType.League]: 'League',
  [EventType.Tournament]: 'Tournament',
} as const satisfies Record<EventType, string>;

export const pointEndingLabels = {
  [PointEnding.ServeAce]: 'Ace',
  [PointEnding.ServeError]: 'Serve error',
  [PointEnding.ReceiveError]: 'Receive error',
  [PointEnding.ThirdBallWinner]: '3rd ball winner',
  [PointEnding.ThirdBallError]: '3rd ball error',
  [PointEnding.ForehandWinner]: 'FH winner',
  [PointEnding.BackhandWinner]: 'BH winner',
  [PointEnding.ForehandUnforcedError]: 'FH error',
  [PointEnding.BackhandUnforcedError]: 'BH error',
  [PointEnding.ForcedError]: 'Forced error',
  [PointEnding.NetOrEdge]: 'Net / edge',
  [PointEnding.Other]: 'Other',
} as const satisfies Record<PointEnding, string>;
