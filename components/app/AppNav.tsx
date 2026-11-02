'use client';

import { LayoutDashboard, UserRound } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactElement } from 'react';

import { Route } from '@/lib/config/routes';
import { cn } from '@/lib/utils';

const navItems = [
  { href: Route.Dashboard, label: 'Dashboard', Icon: LayoutDashboard },
  { href: Route.Profile, label: 'Profile', Icon: UserRound },
] as const;

export function AppNav(): ReactElement {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:static md:border-b md:border-t-0 md:bg-transparent md:pb-0"
    >
      <ul className="flex md:gap-6">
        {navItems.map(({ href, label, Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <li key={href} className="flex-1 md:flex-none">
              <Link
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground md:min-h-12 md:flex-row md:gap-2 md:border-b-2 md:border-transparent md:text-sm',
                  isActive && 'text-primary hover:text-primary md:border-primary',
                )}
              >
                <Icon aria-hidden="true" className="size-5 md:size-4" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
