'use client';

import { useActionState, type ReactElement } from 'react';

import { ChoiceGroup } from '@/components/profile/ChoiceGroup';
import { gripLabels, handednessLabels, playStyleLabels } from '@/components/profile/profile-options';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { saveProfileAction } from '@/lib/actions/profile';
import type { ProfileFormState } from '@/lib/validation/profile';

const INITIAL_STATE: ProfileFormState = { status: 'idle' };

const equipmentFields = [
  { name: 'blade', label: 'Blade', placeholder: 'e.g. Butterfly Viscaria' },
  { name: 'forehandRubber', label: 'Forehand rubber', placeholder: 'e.g. Tenergy 05' },
  { name: 'backhandRubber', label: 'Backhand rubber', placeholder: 'e.g. Rakza 7' },
] as const;

export function ProfileForm(): ReactElement {
  const [state, formAction, isPending] = useActionState(saveProfileAction, INITIAL_STATE);
  const values = state.status === 'idle' ? {} : state.values;
  const fieldErrors = state.status === 'invalid' ? state.fieldErrors : {};

  return (
    <form action={formAction} noValidate className="flex flex-col gap-8">
      <div className="flex flex-col gap-2.5">
        <label htmlFor="displayName" className="font-semibold">
          Your name
        </label>
        <Input
          id="displayName"
          name="displayName"
          autoComplete="name"
          defaultValue={values.displayName ?? ''}
          aria-invalid={fieldErrors.displayName ? true : undefined}
          aria-describedby={fieldErrors.displayName ? 'displayName-error' : undefined}
        />
        {fieldErrors.displayName ? (
          <p id="displayName-error" className="text-sm font-medium text-primary">
            {fieldErrors.displayName[0]}
          </p>
        ) : null}
      </div>

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
          <div key={name} className="flex flex-col gap-1.5">
            <label htmlFor={name} className="text-sm font-medium text-foreground-soft">
              {label}
            </label>
            <Input
              id={name}
              name={name}
              placeholder={placeholder}
              defaultValue={values[name] ?? ''}
              aria-invalid={fieldErrors[name] ? true : undefined}
              aria-describedby={fieldErrors[name] ? `${name}-error` : undefined}
            />
            {fieldErrors[name] ? (
              <p id={`${name}-error`} className="text-sm font-medium text-primary">
                {fieldErrors[name][0]}
              </p>
            ) : null}
          </div>
        ))}
      </fieldset>

      <div className="flex flex-col gap-3">
        {state.status === 'failed' ? (
          <p role="alert" className="font-medium text-primary">
            Your profile couldn&apos;t be saved. Please try again.
          </p>
        ) : null}
        <Button type="submit" size="large" disabled={isPending} className="w-full sm:w-auto sm:self-start">
          {isPending ? 'Saving…' : 'Save and continue'}
        </Button>
      </div>
    </form>
  );
}
