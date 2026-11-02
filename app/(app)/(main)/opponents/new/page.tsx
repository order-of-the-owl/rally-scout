import type { ReactElement } from 'react';

import { OpponentForm } from '@/components/opponents/OpponentForm';
import { createOpponentAction } from '@/lib/actions/opponents';
import { requireOnboardedUser } from '@/lib/auth';

export default async function NewOpponentPage(): Promise<ReactElement> {
  await requireOnboardedUser();

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-8 py-6">
      <h1 className="font-display text-5xl font-black uppercase leading-none">Add an opponent</h1>
      <OpponentForm action={createOpponentAction} submitLabel="Add opponent" />
    </section>
  );
}
