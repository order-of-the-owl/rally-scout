'use client';

import { useEffect, useRef, useState, useTransition, type ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import type { AiActionState } from '@/lib/validation/ai';

const MESSAGES = {
  not_enough_data: 'Play at least one full match against this opponent first.',
  rate_limited: 'You’ve reached the hourly AI limit. Try again later.',
  failed: 'That didn’t work. Please try again.',
} as const;

interface GenerateButtonProps {
  action: () => Promise<AiActionState>;
  label: string;
  retryLabel?: string;
  pendingLabel: string;
  shouldGenerateOnMount?: boolean;
  variant?: 'primary' | 'ghost';
}

export function GenerateButton({
  action,
  label,
  retryLabel = 'Try again',
  pendingLabel,
  shouldGenerateOnMount = false,
  variant = 'primary',
}: GenerateButtonProps): ReactElement {
  const [state, setState] = useState<AiActionState>({ status: 'idle' });
  const [isPending, startTransition] = useTransition();
  const hasAutoStarted = useRef(false);

  function generate(): void {
    startTransition(async () => {
      try {
        setState(await action());
      } catch {
        setState({ status: 'failed' });
      }
    });
  }

  useEffect(() => {
    if (shouldGenerateOnMount && !hasAutoStarted.current) {
      hasAutoStarted.current = true;
      generate();
    }
    // Runs once: the action prop is a new bound function on every server render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const message = state.status === 'idle' || state.status === 'generated' ? null : MESSAGES[state.status];

  return (
    <div className="flex flex-col items-start gap-2">
      {message ? (
        <p role="alert" className="font-medium text-primary">
          {message}
        </p>
      ) : null}
      <Button size={variant === 'primary' ? 'large' : 'default'} variant={variant} disabled={isPending} onClick={generate}>
        {isPending ? pendingLabel : state.status === 'failed' ? retryLabel : label}
      </Button>
    </div>
  );
}
