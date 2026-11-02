import type { ReactElement } from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface TextFieldProps {
  name: string;
  label: string;
  defaultValue: string | undefined;
  errors: readonly string[] | undefined;
  placeholder?: string;
  autoComplete?: string;
  isMultiline?: boolean;
  isLabelSubtle?: boolean;
}

export function TextField({
  name,
  label,
  defaultValue = '',
  errors,
  placeholder,
  autoComplete,
  isMultiline = false,
  isLabelSubtle = false,
}: TextFieldProps): ReactElement {
  const errorId = `${name}-error`;
  const sharedProps = {
    id: name,
    name,
    defaultValue,
    ...(placeholder === undefined ? {} : { placeholder }),
    ...(autoComplete === undefined ? {} : { autoComplete }),
    ...(errors ? { 'aria-invalid': true, 'aria-describedby': errorId } : {}),
  };

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={name} className={cn('font-semibold', isLabelSubtle && 'text-sm font-medium text-foreground-soft')}>
        {label}
      </label>
      {isMultiline ? (
        <textarea
          {...sharedProps}
          rows={4}
          className="w-full rounded-md border border-border bg-card-raised px-3.5 py-3 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary aria-invalid:border-primary"
        />
      ) : (
        <Input {...sharedProps} />
      )}
      {errors ? (
        <p id={errorId} className="text-sm font-medium text-primary">
          {errors[0]}
        </p>
      ) : null}
    </div>
  );
}
