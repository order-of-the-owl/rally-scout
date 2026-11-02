import { z } from 'zod';

import { DISPLAY_NAME_MAX_LENGTH, OPPONENT_NOTES_MAX_LENGTH } from '@/lib/config/app';
import { Grip, Handedness, PlayStyle, RubberType } from '@/lib/domain/enums';
import type { FormState, SubmittedValues } from '@/lib/validation/form-state';

const UNKNOWN_FORM_VALUE = '';

function emptyToNull(value: unknown): unknown {
  return value === undefined || value === UNKNOWN_FORM_VALUE ? null : value;
}

export const opponentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Enter a name')
    .max(DISPLAY_NAME_MAX_LENGTH, `Use ${String(DISPLAY_NAME_MAX_LENGTH)} characters or fewer`),
  handedness: z.preprocess(emptyToNull, z.enum(Handedness, 'Choose one').nullable()),
  grip: z.preprocess(emptyToNull, z.enum(Grip, 'Choose one').nullable()),
  playStyle: z.preprocess(emptyToNull, z.enum(PlayStyle, 'Choose one').nullable()),
  forehandRubberType: z.preprocess(emptyToNull, z.enum(RubberType, 'Choose one').nullable()),
  backhandRubberType: z.preprocess(emptyToNull, z.enum(RubberType, 'Choose one').nullable()),
  notes: z
    .string()
    .trim()
    .max(OPPONENT_NOTES_MAX_LENGTH, `Use ${String(OPPONENT_NOTES_MAX_LENGTH)} characters or fewer`)
    .transform((notes) => (notes === '' ? null : notes)),
});

export type OpponentInput = z.infer<typeof opponentSchema>;
export type OpponentField = keyof OpponentInput;
export type SubmittedOpponentValues = SubmittedValues<OpponentField>;
export type OpponentFormState = FormState<OpponentField>;
