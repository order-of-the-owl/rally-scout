import { describe, expect, expectTypeOf, it } from 'vitest';

import { opponentIdSchema, userIdSchema, type OpponentId, type UserId } from '@/lib/domain/ids';

describe('branded ids', () => {
  it('parses valid ids and rejects invalid ones', () => {
    expect(userIdSchema.parse('user_123')).toBe('user_123');
    expect(() => userIdSchema.parse('')).toThrow();
    expect(opponentIdSchema.parse('6f1c1f64-3f4a-4a0e-9c55-1b2d3e4f5a6b')).toBe('6f1c1f64-3f4a-4a0e-9c55-1b2d3e4f5a6b');
    expect(() => opponentIdSchema.parse('not-a-uuid')).toThrow();
  });

  it('cannot be swapped or created from plain strings', () => {
    expectTypeOf<UserId>().not.toEqualTypeOf<OpponentId>();

    // @ts-expect-error a plain string is not a UserId
    const fromPlainString: UserId = 'user_123';
    // @ts-expect-error a UserId is not an OpponentId
    const swapped: OpponentId = fromPlainString;

    expect(swapped).toBe('user_123');
  });
});
