'use client';

import { useActionState, type ReactElement } from 'react';

import { ChoiceGroup } from '@/components/forms/ChoiceGroup';
import { gripLabels, handednessLabels, playStyleLabels } from '@/components/forms/option-labels';
import { TextField } from '@/components/forms/TextField';
import { Button } from '@/components/ui/button';
import type { ProfileFormState, SubmittedProfileValues } from '@/lib/validation/profile';

const INITIAL_STATE: ProfileFormState = { status: 'idle' };

interface ProfileFormProps {
  action: (previousState: ProfileFormState, formData: FormData) => Promise<ProfileFormState>;
  initialValues?: SubmittedProfileValues;
  submitLabel: string;
}

const equipmentFields = [
  { name: 'blade', label: 'Blade', placeholder: 'e.g. Butterfly Viscaria' },
  { name: 'forehandRubber', label: 'Forehand rubber', placeholder: 'e.g. Tenergy 05' },
  { name: 'backhandRubber', label: 'Backhand rubber', placeholder: 'e.g. Rakza 7' },
] as const;

export function ProfileForm({ action, initialValues = {}, submitLabel }: ProfileFormProps): ReactElement {
  const [state, formAction, isPending] = useActionState(action, INITIAL_STATE);
  const values = state.status === 'idle' ? initialValues : state.values;
  const fieldErrors = state.status === 'invalid' ? state.fieldErrors : {};

  return (
    <form action={formAction} noValidate className="flex flex-col gap-8">
      <TextField
        name="displayName"
        label="Your name"
        autoComplete="name"
        defaultValue={values.displayName}
        errors={fieldErrors.displayName}
      />
      <ChoiceGroup
        legend="Playing hand"
        name="handedness"
        labels={handednessLabels}
        selected={values.handedness}
        errors={fieldErrors.handedness}
        className="grid-cols-2"
      />
      <ChoiceGroup
        legend="Grip"
        name="grip"
        labels={gripLabels}
        selected={values.grip}
        errors={fieldErrors.grip}
        className="grid-cols-2"
      />
      <ChoiceGroup
        legend="Playing style"
        name="playStyle"
        labels={playStyleLabels}
        selected={values.playStyle}
        errors={fieldErrors.playStyle}
      />

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-3 font-semibold">
          Equipment <span className="font-normal text-muted-foreground">(optional)</span>
        </legend>
        {equipmentFields.map(({ name, label, placeholder }) => (
          <TextField
            key={name}
            name={name}
            label={label}
            placeholder={placeholder}
            defaultValue={values[name]}
            errors={fieldErrors[name]}
            isLabelSubtle
          />
        ))}
      </fieldset>

      <div className="flex flex-col gap-3">
        {state.status === 'failed' ? (
          <p role="alert" className="font-medium text-primary">
            Your profile couldn&apos;t be saved. Please try again.
          </p>
        ) : null}
        {state.status === 'saved' ? (
          <p role="status" className="font-medium text-foreground-soft">
            Profile saved.
          </p>
        ) : null}
        <Button type="submit" size="large" disabled={isPending} className="w-full sm:w-auto sm:self-start">
          {isPending ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
