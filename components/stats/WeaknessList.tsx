import type { ReactElement } from 'react';

import type { Weakness } from '@/lib/domain/stats';

export function WeaknessList({ weaknesses }: Readonly<{ weaknesses: readonly Weakness[] }>): ReactElement {
  return (
    <ol className="flex flex-col border-t border-border">
      {weaknesses.map(({ key, label, evidence, isLowConfidence }) => (
        <li key={key} className="flex flex-col gap-0.5 border-b border-border py-3.5">
          <span className="flex flex-wrap items-center gap-2 font-semibold">
            {label}
            {isLowConfidence ? (
              <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">
                Small sample
              </span>
            ) : null}
          </span>
          <span className="text-pretty text-foreground-soft">{evidence}</span>
        </li>
      ))}
    </ol>
  );
}
