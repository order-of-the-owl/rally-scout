import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps, ReactElement } from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-semibold outline-none transition-[transform,box-shadow,color] duration-200 ease-out focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-foreground hover:-translate-y-0.5 hover:shadow-[0_10px_28px_-10px_var(--primary)]',
        ghost: 'font-medium text-foreground hover:text-primary',
      },
      size: {
        default: 'min-h-11 px-4 text-base',
        large: 'min-h-14 px-8 text-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
);

type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps): ReactElement {
  const Component = asChild ? Slot : 'button';

  return <Component className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
