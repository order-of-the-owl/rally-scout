import type { ReactElement } from 'react';

import { GenerateButton } from '@/components/ai/GenerateButton';
import { ScoutingReportView } from '@/components/ai/ScoutingReportView';
import { generateScoutingReportAction } from '@/lib/actions/ai';
import { scoutingReportSchema } from '@/lib/ai/schemas';
import type { StoredScoutingReport } from '@/lib/db/queries/ai';
import type { OpponentId } from '@/lib/domain/ids';

interface ScoutingSectionProps {
  opponentId: OpponentId;
  reports: readonly StoredScoutingReport[];
  hasEnoughData: boolean;
}

export function ScoutingSection({ opponentId, reports, hasEnoughData }: ScoutingSectionProps): ReactElement {
  const readableReports = reports.flatMap(({ id, report, matchCount, createdAt }) => {
    const parsed = scoutingReportSchema.safeParse(report);
    return parsed.success ? [{ id, report: parsed.data, matchCount, createdAt }] : [];
  });
  const [latest, ...history] = readableReports;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:p-6">
      <h2 className="text-xl font-semibold">Scouting report</h2>
      {latest ? <ScoutingReportView report={latest.report} matchCount={latest.matchCount} /> : null}

      {hasEnoughData ? (
        <GenerateButton
          action={generateScoutingReportAction.bind(null, opponentId)}
          label={latest ? 'Generate a new report' : 'Generate scouting report'}
          pendingLabel="Building your game plan…"
          variant={latest ? 'ghost' : 'primary'}
        />
      ) : (
        <p className="text-pretty text-foreground-soft">Play at least one full match against this opponent first.</p>
      )}

      {history.length > 0 ? (
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <h3 className="font-semibold">Earlier reports</h3>
          {history.map(({ id, report, matchCount, createdAt }) => (
            <details key={id} className="group rounded-md border border-border">
              <summary className="flex min-h-12 cursor-pointer items-center px-3 font-medium text-foreground-soft">
                {createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </summary>
              <div className="border-t border-border p-3">
                <ScoutingReportView report={report} matchCount={matchCount} />
              </div>
            </details>
          ))}
        </div>
      ) : null}
    </div>
  );
}
