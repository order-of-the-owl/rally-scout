export type AiActionState =
  | { status: 'idle' }
  | { status: 'generated' }
  | { status: 'not_enough_data' }
  | { status: 'rate_limited' }
  | { status: 'failed' };
