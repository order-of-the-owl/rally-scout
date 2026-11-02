import type { ReactElement } from 'react';

import { BackLink } from '@/components/app/BackLink';
import { OpponentForm } from '@/components/opponents/OpponentForm';
import { createOpponentAction } from '@/lib/actions/opponents';
import { requireOnboardedUser } from '@/lib/auth';
import { Route } from '@/lib/config/routes';

export default async function NewOpponentPage(): Promise<ReactElement> {
  await requireOnboardedUser();

  return (
    <section className="flex w-full max-w-2xl flex-col gap-8 py-6">
      <BackLink href={Route.Opponents} label="All opponents" />
      <h1 className="font-display text-5xl font-black uppercase leading-none">Add an opponent</h1>
      <OpponentForm action={createOpponentAction} submitLabel="Add opponent" />
    </section>
  );
}
