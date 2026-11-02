import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import type { ReactElement } from 'react';

export function BackLink({ href, label }: Readonly<{ href: string; label: string }>): ReactElement {
  return (
    <Link
      href={href}
      className="-my-3 -ml-1 flex min-h-11 items-center gap-1 self-start font-medium text-foreground-soft transition-colors hover:text-primary"
    >
      <ChevronLeft aria-hidden="true" className="size-4 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}
