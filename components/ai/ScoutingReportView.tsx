import type { ReactElement } from 'react';

import type { ScoutingReport } from '@/lib/ai/schemas';
import { ReportConfidence } from '@/lib/domain/enums';

const confidenceLabels = {
  [ReportConfidence.Low]: 'Low confidence',
  [ReportConfidence.Medium]: 'Medium confidence',
  [ReportConfidence.High]: 'High confidence',
} as const satisfies Record<ReportConfidence, string>;

interface ScoutingReportViewProps {
  report: ScoutingReport;
  matchCount: number;
}

export function ScoutingReportView({ report, matchCount }: ScoutingReportViewProps): ReactElement {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-muted-foreground">
          {confidenceLabels[report.confidence]} · Based on {matchCount} {matchCount === 1 ? 'match' : 'matches'}
        </p>
        <h3 className="text-pretty font-display text-2xl font-extrabold uppercase leading-tight">{report.headline}</h3>
      </div>

      <div className="flex flex-col gap-3">
        <h4 className="font-semibold">Game plan</h4>
        <ol className="flex flex-col gap-3">
          {report.gamePlan.map(({ tactic, why }, index) => (
            <li key={tactic} className="flex gap-3">
              <span aria-hidden="true" className="font-display text-2xl font-extrabold leading-none text-primary">
                {index + 1}
              </span>
              <span className="flex flex-col">
                <span className="text-pretty font-medium">{tactic}</span>
                <span className="text-pretty text-sm text-foreground-soft">{why}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex flex-col gap-3">
        <h4 className="font-semibold">Key patterns</h4>
        <ul className="flex flex-col border-t border-border">
          {report.keyPatterns.map(({ title, evidence, impact }) => (
            <li key={title} className="flex flex-col gap-0.5 border-b border-border py-3">
              <span className="font-medium">{title}</span>
              <span className="text-pretty text-foreground-soft">{evidence}</span>
              <span className="text-pretty text-sm text-muted-foreground">{impact}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <h4 className="font-semibold">Serve and receive</h4>
          <p className="text-pretty text-foreground-soft">{report.serveReceivePlan}</p>
        </div>
        <div className="flex flex-col gap-1">
          <h4 className="font-semibold">Mindset</h4>
          <p className="text-pretty text-foreground-soft">{report.mentalNote}</p>
        </div>
      </div>
    </div>
  );
}
