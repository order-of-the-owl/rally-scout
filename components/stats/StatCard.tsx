import type { ReactElement } from 'react';

import type { Ratio } from '@/lib/domain/stats';

export function formatPercentage({ percentage }: Ratio): string {
  return percentage === null ? '–' : `${String(percentage)}%`;
}

export function formatRecord({ won, total }: Ratio): string {
  return `${String(won)}–${String(total - won)}`;
}

interface StatCardProps {
  label: string;
  value: string;
  detail?: string;
}

export function StatCard({ label, value, detail }: StatCardProps): ReactElement {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className="font-display text-4xl font-extrabold leading-none tabular-nums">{value}</span>
      {detail ? <span className="text-sm text-muted-foreground">{detail}</span> : null}
    </div>
  );
}
