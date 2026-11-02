import { describe, expect, it } from 'vitest';

import { gripEnum, handednessEnum, playStyleEnum, rubberTypeEnum } from '@/lib/db/schema';
import { Grip, Handedness, PlayStyle, RubberType } from '@/lib/domain/enums';

describe('database enums', () => {
  it.each([
    ['handedness', handednessEnum.enumValues, Handedness],
    ['grip', gripEnum.enumValues, Grip],
    ['play_style', playStyleEnum.enumValues, PlayStyle],
    ['rubber_type', rubberTypeEnum.enumValues, RubberType],
  ])('%s matches its domain enum', (_name, databaseValues, domainEnum) => {
    expect([...databaseValues]).toEqual(Object.values(domainEnum));
  });
});
