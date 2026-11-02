import type { ComponentProps, ReactElement } from 'react';

import { cn } from '@/lib/utils';

export function Input({ className, ...props }: ComponentProps<'input'>): ReactElement {
  return (
    <input
      className={cn(
        'min-h-12 w-full rounded-md border border-border bg-card-raised px-3.5 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary aria-invalid:border-primary',
        className,
      )}
      {...props}
    />
  );
}
