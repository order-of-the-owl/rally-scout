import { ChevronRight, Plus, Search } from 'lucide-react';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { z } from 'zod';

import { playStyleLabels } from '@/components/forms/option-labels';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { requireOnboardedUser } from '@/lib/auth';
import { opponentRoute, Route } from '@/lib/config/routes';
import { listOpponents } from '@/lib/db/queries/opponents';

const searchParamsSchema = z.object({ q: z.string().catch('') });

interface OpponentsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function OpponentsPage({ searchParams }: OpponentsPageProps): Promise<ReactElement> {
  const { id: userId } = await requireOnboardedUser();
  const { q: search } = searchParamsSchema.parse(await searchParams);
  const opponents = await listOpponents(userId, search);
  const isSearching = search.trim() !== '';

  return (
    <section className="flex flex-col gap-6 py-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-5xl font-black uppercase leading-none">Opponents</h1>
        <Button asChild>
          <Link href={Route.NewOpponent}>
            <Plus aria-hidden="true" className="size-5" />
            Add
          </Link>
        </Button>
      </div>

      {opponents.length > 0 || isSearching ? (
        <form role="search" className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            name="q"
            defaultValue={search}
            placeholder="Search by name"
            aria-label="Search opponents by name"
            className="pl-11"
          />
        </form>
      ) : null}

      {opponents.length > 0 ? (
        <ul className="flex flex-col border-t border-border">
          {opponents.map(({ id, name, playStyle, rating }) => (
            <li key={id} className="border-b border-border">
              <Link
                href={opponentRoute(id)}
                className="group flex min-h-18 items-center justify-between gap-4 py-3 transition-colors hover:text-primary"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-lg font-semibold">{name}</span>
                  {playStyle ? <span className="text-sm text-muted-foreground">{playStyleLabels[playStyle]}</span> : null}
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-display text-2xl font-extrabold tabular-nums">{rating}</span>
                  <ChevronRight
                    aria-hidden="true"
                    className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : isSearching ? (
        <p className="py-8 text-foreground-soft">No opponents match &ldquo;{search.trim()}&rdquo;.</p>
      ) : (
        <div className="flex flex-col items-start gap-4 rounded-xl border border-border bg-card p-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold">Add the first player you want to beat</h2>
            <p className="text-pretty text-foreground-soft">
              Start with someone you play regularly. You only need a name, and you can fill in the rest later.
            </p>
          </div>
          <Button asChild size="large">
            <Link href={Route.NewOpponent}>Add an opponent</Link>
          </Button>
        </div>
      )}
    </section>
  );
}
