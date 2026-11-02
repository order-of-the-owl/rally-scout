import type { ReactElement } from 'react';

import { cn } from '@/lib/utils';

interface ChoiceGroupProps {
  legend: string;
  name: string;
  labels: Readonly<Record<string, string>>;
  selected: string | undefined;
  errors: readonly string[] | undefined;
  className?: string;
}

export function ChoiceGroup({ legend, name, labels, selected, errors, className }: ChoiceGroupProps): ReactElement {
  const errorId = `${name}-error`;

  return (
    <fieldset aria-describedby={errors ? errorId : undefined} className="flex flex-col gap-2.5">
      <legend className="mb-2.5 font-semibold">{legend}</legend>
      <div className={cn('grid gap-2 sm:grid-cols-2', className)}>
        {Object.entries(labels).map(([value, label]) => (
          <label key={value} className="group relative cursor-pointer">
            <input
              type="radio"
              name={name}
              value={value}
              defaultChecked={selected === value}
              className="peer absolute inset-0 opacity-0"
            />
            <span className="flex min-h-12 items-center justify-center rounded-md border border-border bg-card-raised px-3 text-center font-medium transition-[background-color,border-color,color,transform] duration-150 group-hover:border-foreground-soft group-active:scale-[0.98] peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-foreground peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background">
              {label}
            </span>
          </label>
        ))}
      </div>
      {errors ? (
        <p id={errorId} className="text-sm font-medium text-primary">
          {errors[0]}
        </p>
      ) : null}
    </fieldset>
  );
}
