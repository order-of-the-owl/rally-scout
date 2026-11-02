import { z } from 'zod';

import { DISPLAY_NAME_MAX_LENGTH, EQUIPMENT_NAME_MAX_LENGTH } from '@/lib/config/app';
import { Grip, Handedness, PlayStyle } from '@/lib/domain/enums';

const CHOOSE_ONE = 'Choose one';

const optionalEquipmentName = z
  .string()
  .trim()
  .max(EQUIPMENT_NAME_MAX_LENGTH, `Use ${String(EQUIPMENT_NAME_MAX_LENGTH)} characters or fewer`)
  .transform((name) => (name === '' ? null : name));

export const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, 'Enter your name')
    .max(DISPLAY_NAME_MAX_LENGTH, `Use ${String(DISPLAY_NAME_MAX_LENGTH)} characters or fewer`),
  handedness: z.enum(Handedness, CHOOSE_ONE),
  grip: z.enum(Grip, CHOOSE_ONE),
  playStyle: z.enum(PlayStyle, CHOOSE_ONE),
  blade: optionalEquipmentName,
  forehandRubber: optionalEquipmentName,
  backhandRubber: optionalEquipmentName,
});

export type Profile = z.infer<typeof profileSchema>;

type ProfileField = keyof Profile;
export type SubmittedProfileValues = Partial<Record<ProfileField, string>>;

export type ProfileFormState =
  | { status: 'idle' }
  | { status: 'invalid'; fieldErrors: Partial<Record<ProfileField, string[]>>; values: SubmittedProfileValues }
  | { status: 'failed'; values: SubmittedProfileValues }
  | { status: 'saved'; values: SubmittedProfileValues };
