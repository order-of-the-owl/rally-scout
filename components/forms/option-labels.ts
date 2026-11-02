import { Grip, Handedness, PlayStyle, RubberType } from '@/lib/domain/enums';

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
