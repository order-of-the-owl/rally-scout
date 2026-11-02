import { Show } from '@clerk/nextjs';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { ReactElement } from 'react';

import { Logo } from '@/components/app/Logo';
import { RallyLine } from '@/components/marketing/RallyLine';
import { ScoreboardPreview } from '@/components/marketing/ScoreboardPreview';
import { Button } from '@/components/ui/button';
import { Route } from '@/lib/config/routes';

const samplePatterns = [
  {
    stat: '38%',
    insight: 'of your lost points are receive errors. Stand closer and push the short pendulum serve long to the backhand.',
  },
  {
    stat: '1–4',
    insight: 'in deuce games against this opponent. At 10⁠–⁠10, use your safest serve and take the third ball early.',
  },
] as const;

export default function LandingPage(): ReactElement {
  return (
    <div className="overflow-hidden">
      <div className="mx-auto max-w-310 px-4 sm:px-6 lg:px-10">
        <header className="flex items-center justify-between gap-4 py-6">
          <Logo href={Route.Home} />
          <Show when="signed-out">
            <Button asChild variant="ghost" className="-mr-4">
              <Link href={Route.SignIn}>Sign in</Link>
            </Button>
          </Show>
          <Show when="signed-in">
            <Button asChild variant="ghost" className="-mr-4">
              <Link href={Route.Dashboard}>Go to dashboard</Link>
            </Button>
          </Show>
        </header>

        <main>
          <section className="grid items-center gap-10 pb-14 pt-6 lg:grid-cols-2 lg:gap-18 lg:pt-14">
            <div className="flex flex-col items-start gap-6">
              <p className="animate-rise font-medium text-muted-foreground">For club and league table tennis players</p>
              <h1 className="animate-rise text-balance font-display text-[clamp(3.5rem,7.6vw,6.5rem)] font-black uppercase leading-[0.92] [animation-delay:80ms]">
                Stop losing to the same opponents for the same reasons.
              </h1>
              <p className="max-w-[30em] animate-rise text-pretty text-lg text-foreground-soft [animation-delay:160ms]">
                Log your matches point by point. Rally Scout finds the patterns and turns them into a game plan before
                the rematch.
              </p>
              <Button asChild size="large" className="group animate-rise [animation-delay:240ms]">
                <Link href={Route.SignUp}>
                  Start scouting
                  <ArrowRight aria-hidden="true" className="size-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>

            <ScoreboardPreview />
          </section>

          <RallyLine />

          <section className="grid gap-10 py-20 lg:grid-cols-3 lg:py-24">
            <div className="flex flex-col gap-3">
              <h2 className="text-balance font-display text-[clamp(2.375rem,4.4vw,3.5rem)] font-extrabold uppercase leading-none">
                Code counts. AI coaches.
              </h2>
              <p className="text-pretty text-foreground-soft">
                Every number comes from your own points. The AI explains them, and never invents one.
              </p>
            </div>

            <div className="flex flex-col border-t border-border lg:col-span-2">
              <p className="py-3.5 text-sm font-medium text-muted-foreground">Sample scouting report</p>
              {samplePatterns.map(({ stat, insight }) => (
                <div key={stat} className="flex flex-wrap items-center gap-x-8 gap-y-2 border-t border-border py-5">
                  <span className="min-w-24 font-display text-[3.375rem] font-extrabold leading-none text-primary">
                    {stat}
                  </span>
                  <span className="flex-[1_1_17.5rem] text-pretty">{insight}</span>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
