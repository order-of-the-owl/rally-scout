import type { ReactElement } from 'react';

const scoreClassName = 'font-display font-extrabold leading-none tabular-nums text-[clamp(6rem,13vw,10.5rem)]';

export function ScoreboardPreview(): ReactElement {
  return (
    <div
      role="img"
      aria-label="Sample live scoreboard in game 3, games tied at one each. You lead 10 to 7, are serving and have game point."
      className="flex animate-rise flex-col gap-4 rounded-2xl border border-border bg-card p-4 [animation-delay:300ms] sm:p-6"
    >
      <div className="flex justify-between gap-3 text-sm font-medium text-muted-foreground">
        <span>Sample match · Game 3</span>
        <span>Games 1–1</span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="flex flex-col items-center gap-1.5 rounded-xl bg-card-raised p-4 sm:p-5">
          <span className="flex items-center gap-2 font-semibold">
            You
            <span className="size-3 animate-serve-pulse rounded-full bg-primary" />
          </span>
          <div className={`h-[1em] overflow-hidden ${scoreClassName}`}>
            <div className="flex animate-score-roll flex-col items-center motion-reduce:translate-y-[-50%]">
              <span>9</span>
              <span className="text-primary">10</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-1.5 rounded-xl bg-card-raised p-4 sm:p-5">
          <span className="font-semibold">Opponent</span>
          <div className={scoreClassName}>7</div>
        </div>
      </div>

      <div className="flex min-h-8 items-center justify-between gap-3">
        <span className="text-sm font-medium text-muted-foreground">You to serve</span>
        <span className="animate-badge-reveal rounded-full bg-primary px-3.5 py-1 text-sm font-semibold text-primary-foreground">
          Game point
        </span>
      </div>
    </div>
  );
}
