import Link from 'next/link';
import type { ReactElement } from 'react';

export function Logo({ href }: Readonly<{ href: string }>): ReactElement {
  return (
    <Link
      href={href}
      className="flex min-h-11 items-center gap-2.5 font-display text-[1.625rem] font-extrabold tracking-wide"
    >
      <span aria-hidden="true" className="size-3.5 rounded-full bg-primary" />
      RALLY SCOUT
    </Link>
  );
}
