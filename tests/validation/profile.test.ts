import { describe, expect, it } from 'vitest';

import { DISPLAY_NAME_MAX_LENGTH, EQUIPMENT_NAME_MAX_LENGTH } from '@/lib/config/app';
import { Grip, Handedness, PlayStyle } from '@/lib/domain/enums';
import { profileSchema } from '@/lib/validation/profile';

const validInput = {
  displayName: 'Sam',
  handedness: Handedness.Right,
  grip: Grip.Shakehand,
  playStyle: PlayStyle.AllRound,
  blade: '',
  forehandRubber: '',
  backhandRubber: '',
};

describe('profileSchema', () => {
  it('trims text and turns empty equipment into null', () => {
    const profile = profileSchema.parse({ ...validInput, displayName: '  Sam  ', blade: '  Viscaria ' });

    expect(profile.displayName).toBe('Sam');
    expect(profile.blade).toBe('Viscaria');
    expect(profile.forehandRubber).toBeNull();
  });

  it.each([
    ['blank name', { displayName: '   ' }, 'Enter your name'],
    ['long name', { displayName: 'x'.repeat(DISPLAY_NAME_MAX_LENGTH + 1) }, 'characters or fewer'],
    ['unknown handedness', { handedness: 'both' }, 'Choose one'],
    ['unknown grip', { grip: 'seemiller' }, 'Choose one'],
    ['unknown style', { playStyle: 'wizard' }, 'Choose one'],
    ['long equipment name', { blade: 'x'.repeat(EQUIPMENT_NAME_MAX_LENGTH + 1) }, 'characters or fewer'],
  ])('rejects %s with a readable message', (_label, override, message) => {
    const result = profileSchema.safeParse({ ...validInput, ...override });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain(message);
  });
});
