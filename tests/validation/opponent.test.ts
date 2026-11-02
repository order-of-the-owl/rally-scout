import { describe, expect, it } from 'vitest';

import { DISPLAY_NAME_MAX_LENGTH, OPPONENT_NOTES_MAX_LENGTH } from '@/lib/config/app';
import { PlayStyle, RubberType } from '@/lib/domain/enums';
import { opponentSchema } from '@/lib/validation/opponent';

describe('opponentSchema', () => {
  it('needs only a name, leaving everything else unknown', () => {
    expect(opponentSchema.parse({ name: '  Alex ', notes: '' })).toEqual({
      name: 'Alex',
      handedness: null,
      grip: null,
      playStyle: null,
      forehandRubberType: null,
      backhandRubberType: null,
      notes: null,
    });
  });

  it('treats a "Not sure" choice as unknown and keeps real choices', () => {
    const opponent = opponentSchema.parse({
      name: 'Alex',
      handedness: '',
      playStyle: PlayStyle.Blocker,
      backhandRubberType: RubberType.LongPips,
      notes: ' Heavy serve ',
    });

    expect(opponent).toMatchObject({
      handedness: null,
      playStyle: PlayStyle.Blocker,
      backhandRubberType: RubberType.LongPips,
      notes: 'Heavy serve',
    });
  });

  it.each([
    ['blank name', { name: ' ', notes: '' }],
    ['long name', { name: 'x'.repeat(DISPLAY_NAME_MAX_LENGTH + 1), notes: '' }],
    ['long notes', { name: 'Alex', notes: 'x'.repeat(OPPONENT_NOTES_MAX_LENGTH + 1) }],
    ['unknown style', { name: 'Alex', notes: '', playStyle: 'wizard' }],
    ['unknown rubber', { name: 'Alex', notes: '', forehandRubberType: 'glue' }],
  ])('rejects %s', (_label, input) => {
    expect(opponentSchema.safeParse(input).success).toBe(false);
  });
});
