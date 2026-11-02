export const INITIAL_RATING = 1200;

export const BEST_OF_OPTIONS = [3, 5, 7] as const;

export const POINTS_TO_WIN_GAME = 11;
export const WINNING_MARGIN = 2;
export const DEUCE_SCORE = POINTS_TO_WIN_GAME - 1;
export const SERVES_PER_TURN = 2;
export const DECIDING_GAME_END_SWITCH_SCORE = 5;

export const RECENT_MATCHES_FOR_TREND = 5;

export const ScoutingThreshold = {
  MinCompletedMatches: 1,
  MinPoints: 30,
  MediumConfidenceMatches: 3,
  HighConfidenceAboveMatches: 5,
} as const;

export const WeaknessThreshold = {
  MinSamplePoints: 30,
  ReceiveErrorShareOfLostPoints: 0.25,
  ServeHoldRate: 0.5,
  WingErrorRatio: 2,
  MinWingErrors: 5,
  DeuceWinRate: 0.4,
  MinDeuceGames: 3,
  OpponentTypeGapPercentagePoints: 10,
} as const;
