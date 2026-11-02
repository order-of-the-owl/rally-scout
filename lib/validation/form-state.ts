export type SubmittedValues<Field extends string> = Partial<Record<Field, string>>;

export type FormState<Field extends string> =
  | { status: 'idle' }
  | { status: 'invalid'; fieldErrors: Partial<Record<Field, string[]>>; values: SubmittedValues<Field> }
  | { status: 'failed'; values: SubmittedValues<Field> }
  | { status: 'saved'; values: SubmittedValues<Field> };

export function readSubmittedValues<Field extends string>(
  formData: FormData,
  fields: readonly Field[],
): SubmittedValues<Field> {
  const values: SubmittedValues<Field> = {};
  for (const field of fields) {
    const value = formData.get(field);
    if (typeof value === 'string') {
      values[field] = value;
    }
  }
  return values;
}
