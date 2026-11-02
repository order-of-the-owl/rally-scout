'use client';

import { useActionState, type ReactElement } from 'react';

import { ChoiceGroup } from '@/components/forms/ChoiceGroup';
import { gripLabels, handednessLabels, playStyleLabels, rubberTypeLabels } from '@/components/forms/option-labels';
import { TextField } from '@/components/forms/TextField';
import { Button } from '@/components/ui/button';
import type { OpponentFormState, SubmittedOpponentValues } from '@/lib/validation/opponent';

const INITIAL_STATE: OpponentFormState = { status: 'idle' };
const UNKNOWN_LABEL = { '': 'Not sure' } as const;

interface OpponentFormProps {
  action: (previousState: OpponentFormState, formData: FormData) => Promise<OpponentFormState>;
  initialValues?: SubmittedOpponentValues;
  submitLabel: string;
}

export function OpponentForm({ action, initialValues = {}, submitLabel }: OpponentFormProps): ReactElement {
  const [state, formAction, isPending] = useActionState(action, INITIAL_STATE);
  const values = state.status === 'idle' ? initialValues : state.values;
  const fieldErrors = state.status === 'invalid' ? state.fieldErrors : {};

  return (
    <form action={formAction} noValidate className="flex flex-col gap-8">
      <TextField name="name" label="Name" defaultValue={values.name} errors={fieldErrors.name} />
      <ChoiceGroup
        legend="Playing hand"
        name="handedness"
        labels={{ ...UNKNOWN_LABEL, ...handednessLabels }}
        selected={values.handedness ?? ''}
        errors={fieldErrors.handedness}
        className="grid-cols-3 sm:grid-cols-3"
      />
      <ChoiceGroup
        legend="Grip"
        name="grip"
        labels={{ ...UNKNOWN_LABEL, ...gripLabels }}
        selected={values.grip ?? ''}
        errors={fieldErrors.grip}
        className="grid-cols-3 sm:grid-cols-3"
      />
      <ChoiceGroup
        legend="Playing style"
        name="playStyle"
        labels={{ ...UNKNOWN_LABEL, ...playStyleLabels }}
        selected={values.playStyle ?? ''}
        errors={fieldErrors.playStyle}
      />
      <ChoiceGroup
        legend="Forehand rubber"
        name="forehandRubberType"
        labels={{ ...UNKNOWN_LABEL, ...rubberTypeLabels }}
        selected={values.forehandRubberType ?? ''}
        errors={fieldErrors.forehandRubberType}
        className="grid-cols-2 sm:grid-cols-3"
      />
      <ChoiceGroup
        legend="Backhand rubber"
        name="backhandRubberType"
        labels={{ ...UNKNOWN_LABEL, ...rubberTypeLabels }}
        selected={values.backhandRubberType ?? ''}
        errors={fieldErrors.backhandRubberType}
        className="grid-cols-2 sm:grid-cols-3"
      />
      <TextField
        name="notes"
        label="Notes"
        placeholder="Serves, habits, anything worth remembering"
        defaultValue={values.notes}
        errors={fieldErrors.notes}
        isMultiline
      />

      <div className="flex flex-col gap-3">
        {state.status === 'failed' ? (
          <p role="alert" className="font-medium text-primary">
            This opponent couldn&apos;t be saved. Please try again.
          </p>
        ) : null}
        <Button type="submit" size="large" disabled={isPending} className="w-full sm:w-auto sm:self-start">
          {isPending ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
