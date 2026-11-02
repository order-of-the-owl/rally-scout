'use client';

import { useActionState, useState, type ReactElement } from 'react';

import { ChoiceGroup } from '@/components/forms/ChoiceGroup';
import { eventTypeLabels } from '@/components/forms/option-labels';
import { Button } from '@/components/ui/button';
import { createMatchAction } from '@/lib/actions/matches';
import { BEST_OF_OPTIONS } from '@/lib/domain/constants';
import { EventType, Side } from '@/lib/domain/enums';
import type { NewMatchFormState } from '@/lib/validation/match';

const INITIAL_STATE: NewMatchFormState = { status: 'idle' };
const BEST_OF_DEFAULT = '5';
const bestOfLabels = Object.fromEntries(BEST_OF_OPTIONS.map((games) => [String(games), `Best of ${String(games)}`]));

interface NewMatchFormProps {
  opponents: readonly { id: string; name: string }[];
  preselectedOpponentId: string | undefined;
}

export function NewMatchForm({ opponents, preselectedOpponentId }: NewMatchFormProps): ReactElement {
  const [state, formAction, isPending] = useActionState(createMatchAction, INITIAL_STATE);
  const [firstServer, setFirstServer] = useState<Side | undefined>();
  const [tossCount, setTossCount] = useState(0);
  const values = state.status === 'idle' ? {} : state.values;
  const fieldErrors = state.status === 'invalid' ? state.fieldErrors : {};
  const opponentLabels = Object.fromEntries(opponents.map(({ id, name }) => [id, name]));
  const selectedServer = firstServer ?? values.firstServer;

  function tossCoin(): void {
    setFirstServer(Math.random() < 0.5 ? Side.Me : Side.Opponent);
    setTossCount((count) => count + 1);
  }

  return (
    <form action={formAction} noValidate className="flex flex-col gap-8">
      <ChoiceGroup
        legend="Opponent"
        name="opponentId"
        labels={opponentLabels}
        selected={values.opponentId ?? preselectedOpponentId}
        errors={fieldErrors.opponentId}
      />
      <ChoiceGroup
        legend="Match length"
        name="bestOf"
        labels={bestOfLabels}
        selected={values.bestOf ?? BEST_OF_DEFAULT}
        errors={fieldErrors.bestOf}
        className="grid-cols-3 sm:grid-cols-3"
      />

      <div className="flex flex-col gap-3">
        <ChoiceGroup
          key={tossCount}
          legend="Who serves first?"
          name="firstServer"
          labels={{ [Side.Me]: 'Me', [Side.Opponent]: 'Opponent' }}
          selected={selectedServer}
          errors={fieldErrors.firstServer}
          className="grid-cols-2"
        />
        <Button type="button" variant="ghost" onClick={tossCoin} className="-ml-4 self-start">
          Toss a coin
        </Button>
      </div>

      <ChoiceGroup
        legend="Event"
        name="eventType"
        labels={eventTypeLabels}
        selected={values.eventType ?? EventType.Casual}
        errors={fieldErrors.eventType}
        className="grid-cols-3 sm:grid-cols-3"
      />

      <div className="flex flex-col gap-3">
        {state.status === 'failed' ? (
          <p role="alert" className="font-medium text-primary">
            The match couldn&apos;t be started. Please try again.
          </p>
        ) : null}
        <Button type="submit" size="large" disabled={isPending} className="w-full sm:w-auto sm:self-start">
          {isPending ? 'Starting…' : 'Start match'}
        </Button>
      </div>
    </form>
  );
}
