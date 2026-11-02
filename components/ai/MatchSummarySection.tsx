import type { ReactElement } from 'react';

import { GenerateButton } from '@/components/ai/GenerateButton';
import { generateMatchSummaryAction } from '@/lib/actions/ai';
import { matchSummarySchema } from '@/lib/ai/schemas';
import type { MatchId } from '@/lib/domain/ids';

interface MatchSummarySectionProps {
  matchId: MatchId;
  storedSummary: unknown;
  shouldGenerateOnMount: boolean;
}

export function MatchSummarySection({
  matchId,
  storedSummary,
  shouldGenerateOnMount,
}: MatchSummarySectionProps): ReactElement {
  const parsed = matchSummarySchema.safeParse(storedSummary);
  const summary = parsed.success ? parsed.data : null;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:p-6">
      <h2 className="text-xl font-semibold">Coach&apos;s summary</h2>

      {summary ? (
        <>
          <p className="text-pretty font-display text-2xl font-extrabold uppercase leading-tight">{summary.headline}</p>
          <div className="flex flex-col gap-1">
            <h3 className="font-semibold">Turning point</h3>
            <p className="text-pretty text-foreground-soft">{summary.turningPoint}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <h3 className="font-semibold">What worked</h3>
              <ul className="flex list-disc flex-col gap-1 pl-5 text-foreground-soft marker:text-primary">
                {summary.whatWorked.map((item) => (
                  <li key={item} className="text-pretty">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="font-semibold">What to fix</h3>
              <ul className="flex list-disc flex-col gap-1 pl-5 text-foreground-soft marker:text-primary">
                {summary.whatToFix.map((item) => (
                  <li key={item} className="text-pretty">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      ) : null}

      <GenerateButton
        action={generateMatchSummaryAction.bind(null, matchId)}
        label={summary ? 'Regenerate' : 'Generate summary'}
        pendingLabel="Reviewing your match…"
        shouldGenerateOnMount={!summary && shouldGenerateOnMount}
        variant={summary ? 'ghost' : 'primary'}
      />
    </div>
  );
}
