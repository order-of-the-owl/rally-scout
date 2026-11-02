import { notFound } from 'next/navigation';
import type { ReactElement } from 'react';

import { OpponentForm } from '@/components/opponents/OpponentForm';
import { updateOpponentAction } from '@/lib/actions/opponents';
import { requireOnboardedUser } from '@/lib/auth';
import { getOpponent } from '@/lib/db/queries/opponents';
import { opponentIdSchema } from '@/lib/domain/ids';

interface EditOpponentPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditOpponentPage({ params }: EditOpponentPageProps): Promise<ReactElement> {
  const { id: userId } = await requireOnboardedUser();
  const parsedId = opponentIdSchema.safeParse((await params).id);
  if (!parsedId.success) {
    notFound();
  }

  const opponent = await getOpponent(userId, parsedId.data);
  if (!opponent) {
    notFound();
  }

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-8 py-6">
      <h1 className="font-display text-5xl font-black uppercase leading-none">Edit opponent</h1>
      <OpponentForm
        action={updateOpponentAction.bind(null, opponent.id)}
        submitLabel="Save changes"
        initialValues={{
          name: opponent.name,
          handedness: opponent.handedness ?? '',
          grip: opponent.grip ?? '',
          playStyle: opponent.playStyle ?? '',
          forehandRubberType: opponent.forehandRubberType ?? '',
          backhandRubberType: opponent.backhandRubberType ?? '',
          notes: opponent.notes ?? '',
        }}
      />
    </section>
  );
}
