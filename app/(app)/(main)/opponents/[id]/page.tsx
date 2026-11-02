import { Pencil } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactElement } from 'react';

import { gripLabels, handednessLabels, playStyleLabels, rubberTypeLabels } from '@/components/forms/option-labels';
import { Button } from '@/components/ui/button';
import { requireOnboardedUser } from '@/lib/auth';
import { editOpponentRoute } from '@/lib/config/routes';
import { getOpponent } from '@/lib/db/queries/opponents';
import { opponentIdSchema } from '@/lib/domain/ids';

const NOT_SET = 'Not sure';

interface OpponentPageProps {
  params: Promise<{ id: string }>;
}

export default async function OpponentPage({ params }: OpponentPageProps): Promise<ReactElement> {
  const { id: userId } = await requireOnboardedUser();
  const parsedId = opponentIdSchema.safeParse((await params).id);
  if (!parsedId.success) {
    notFound();
  }

  const opponent = await getOpponent(userId, parsedId.data);
  if (!opponent) {
    notFound();
  }

  const details = [
    { label: 'Playing hand', value: opponent.handedness ? handednessLabels[opponent.handedness] : NOT_SET },
    { label: 'Grip', value: opponent.grip ? gripLabels[opponent.grip] : NOT_SET },
    { label: 'Playing style', value: opponent.playStyle ? playStyleLabels[opponent.playStyle] : NOT_SET },
    {
      label: 'Forehand rubber',
      value: opponent.forehandRubberType ? rubberTypeLabels[opponent.forehandRubberType] : NOT_SET,
    },
    {
      label: 'Backhand rubber',
      value: opponent.backhandRubberType ? rubberTypeLabels[opponent.backhandRubberType] : NOT_SET,
    },
  ];

  return (
    <section className="flex flex-col gap-8 py-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="break-words font-display text-5xl font-black uppercase leading-none">{opponent.name}</h1>
          <p className="text-foreground-soft">
            Rating <span className="font-semibold tabular-nums text-foreground">{opponent.rating}</span>
          </p>
        </div>
        <Button asChild variant="ghost" className="shrink-0">
          <Link href={editOpponentRoute(opponent.id)}>
            <Pencil aria-hidden="true" className="size-4" />
            Edit
          </Link>
        </Button>
      </div>

      <dl className="grid gap-x-8 border-t border-border sm:grid-cols-2">
        {details.map(({ label, value }) => (
          <div key={label} className="flex justify-between gap-4 border-b border-border py-3.5">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="text-right font-medium">{value}</dd>
          </div>
        ))}
      </dl>

      {opponent.notes ? (
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold">Notes</h2>
          <p className="whitespace-pre-wrap text-pretty text-foreground-soft">{opponent.notes}</p>
        </div>
      ) : null}
    </section>
  );
}
