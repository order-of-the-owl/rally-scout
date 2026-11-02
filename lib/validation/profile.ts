import { z } from 'zod';

import { DISPLAY_NAME_MAX_LENGTH, EQUIPMENT_NAME_MAX_LENGTH } from '@/lib/config/app';
import { Grip, Handedness, PlayStyle } from '@/lib/domain/enums';

const optionalEquipmentName = z
  .string()
  .trim()
  .max(EQUIPMENT_NAME_MAX_LENGTH)
  .transform((name) => (name === '' ? null : name));

export const profileSchema = z.object({
  displayName: z.string().trim().min(1).max(DISPLAY_NAME_MAX_LENGTH),
  handedness: z.enum(Handedness),
  grip: z.enum(Grip),
  playStyle: z.enum(PlayStyle),
  blade: optionalEquipmentName,
  forehandRubber: optionalEquipmentName,
  backhandRubber: optionalEquipmentName,
});

export type Profile = z.infer<typeof profileSchema>;
