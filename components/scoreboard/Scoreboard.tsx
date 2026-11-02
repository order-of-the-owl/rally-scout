'use client';

import { Undo2, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, useTransition, type ReactElement } from 'react';

import { pointEndingLabels } from '@/components/forms/option-labels';
import { Button } from '@/components/ui/button';
import { abandonMatchAction, recordPointAction, revalidateAfterMatchEnd, tagPointAction, undoPointAction } from '@/lib/actions/matches';
import { POINT_TAP_DEBOUNCE_MS, TAG_SHEET_DISMISS_MS } from '@/lib/config/app';
import { matchRoute, Route } from '@/lib/config/routes';
import { Side } from '@/lib/domain/enums';
import type { MatchId } from '@/lib/domain/ids';
import { pointTagOptions, type PointTag } from '@/lib/domain/point-tags';
import { deriveState, type InProgressMatchState, type MatchSettings } from '@/lib/domain/scoring';
import { cn } from '@/lib/utils';
import type { LiveActionResult, LivePoint } from '@/lib/validation/match';

const SYNC_ERROR = 'That didn’t save. Check your connection, then try again.';

interface ScoreboardProps {
  matchId: MatchId;
  opponentName: string;
  settings: MatchSettings;
  initialPoints: readonly LivePoint[];
}

interface OpenTagSheet {
  seq: number;
  winner: Side;
  options: readonly PointTag[];
}

export function Scoreboard({ matchId, opponentName, settings, initialPoints }: ScoreboardProps): ReactElement {
  const [points, setPoints] = useState<readonly LivePoint[]>(initialPoints);
  const [tagSheet, setTagSheet] = useState<OpenTagSheet | null>(null);
  const [dismissedPromptAt, setDismissedPromptAt] = useState<number | null>(null);
  const [isConfirmingEnd, setIsConfirmingEnd] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const lastTapAt = useRef(0);

  const state = useMemo(() => deriveState(settings, points), [settings, points]);

  useEffect(() => {
    if (!tagSheet) {
      return undefined;
    }
    const timer = setTimeout(() => {
      setTagSheet(null);
    }, TAG_SHEET_DISMISS_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [tagSheet]);

  useEffect(() => {
    if (!('wakeLock' in navigator)) {
      return undefined;
    }
    let wakeLock: WakeLockSentinel | undefined;
    navigator.wakeLock.request('screen').then(
      (sentinel) => {
        wakeLock = sentinel;
      },
      () => undefined,
    );
    return () => {
      void wakeLock?.release();
    };
  }, []);

  function isDebounced(): boolean {
    const now = Date.now();
    if (now - lastTapAt.current < POINT_TAP_DEBOUNCE_MS) {
      return true;
    }
    lastTapAt.current = now;
    return false;
  }

  function applyResult(result: LiveActionResult, restorePoints: readonly LivePoint[]): void {
    if (result.status === 'ok') {
      setSyncError(null);
      return;
    }
    setSyncError(SYNC_ERROR);
    setTagSheet(null);
    setPoints(result.status === 'rejected' ? result.points : restorePoints);
  }

  function runLiveAction(action: () => Promise<LiveActionResult>, restorePoints: readonly LivePoint[]): void {
    startTransition(async () => {
      try {
        applyResult(await action(), restorePoints);
      } catch {
        applyResult({ status: 'failed' }, restorePoints);
      }
    });
  }

  function awardPoint(winner: Side): void {
    if (state.isComplete || isDebounced()) {
      return;
    }

    const seq = points.length + 1;
    const nextPoints = [...points, { seq, winner }];
    setPoints(nextPoints);
    setTagSheet({ seq, winner, options: pointTagOptions(winner, state.server) });

    runLiveAction(async () => {
      const result = await recordPointAction({ matchId, winner, expectedSeq: seq });
      if (result.status === 'ok' && deriveState(settings, nextPoints).isComplete) {
        await revalidateAfterMatchEnd();
      }
      return result;
    }, points);
  }

  function undo(): void {
    const lastPoint = points.at(-1);
    if (!lastPoint || isDebounced()) {
      return;
    }

    setPoints(points.slice(0, -1));
    setTagSheet(null);
    setDismissedPromptAt(null);
    runLiveAction(() => undoPointAction({ matchId, expectedSeq: lastPoint.seq }), points);
  }

  function tagLastPoint(sheet: OpenTagSheet, tag: PointTag): void {
    setTagSheet(null);
    startTransition(async () => {
      try {
        const result = await tagPointAction({ matchId, seq: sheet.seq, ...tag });
        setSyncError(result.status === 'ok' ? null : SYNC_ERROR);
      } catch {
        setSyncError(SYNC_ERROR);
      }
    });
  }

  const live = state.isComplete ? null : state;
  const lastGame = state.games.at(-1);
  const showPrompt = !tagSheet && !isConfirmingEnd && dismissedPromptAt !== points.length;

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-background pb-[env(safe-area-inset-bottom)]">
      <header className="flex items-center justify-between gap-2 px-2 py-1">
        <Button
          variant="ghost"
          aria-label="Leave match"
          onClick={() => {
            setIsConfirmingEnd(true);
          }}
        >
          <X aria-hidden="true" className="size-5" />
        </Button>
        <p className="text-center text-sm font-medium text-muted-foreground" aria-live="polite">
          {live ? `Game ${String(live.gameNumber)} · Games ${String(state.gamesWon.me)}–${String(state.gamesWon.opponent)}` : 'Match over'}
        </p>
        <Button variant="ghost" onClick={undo} disabled={points.length === 0}>
          <Undo2 aria-hidden="true" className="size-5" />
          Undo
        </Button>
      </header>

      {syncError ? (
        <p role="alert" className="bg-primary px-4 py-2 text-center text-sm font-semibold text-primary-foreground">
          {syncError}
        </p>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-rows-2 gap-1.5 p-1.5 landscape:grid-cols-2 landscape:grid-rows-1">
        <ScoreZone name={opponentName} side={Side.Opponent} state={live} gamesWon={state.gamesWon.opponent} onAward={awardPoint} />
        <ScoreZone name="You" side={Side.Me} state={live} gamesWon={state.gamesWon.me} onAward={awardPoint} />
      </div>

      {tagSheet ? (
        <BottomSheet label="How did the point end?">
          <div className="grid grid-cols-3 gap-2">
            {tagSheet.options.map((option) => (
              <button
                key={option.ending}
                type="button"
                onClick={() => {
                  tagLastPoint(tagSheet, option);
                }}
                className="min-h-12 rounded-md border border-border bg-card-raised px-1 text-sm font-medium transition-transform active:scale-95"
              >
                {pointEndingLabels[option.ending]}
              </button>
            ))}
          </div>
          <Button
            variant="ghost"
            onClick={() => {
              setTagSheet(null);
            }}
          >
            Skip
          </Button>
        </BottomSheet>
      ) : null}

      {showPrompt && state.isComplete ? (
        <BottomSheet label="Match over">
          <h2 className="font-display text-4xl font-black uppercase leading-none">
            {state.winner === Side.Me ? 'You won' : `${opponentName} won`}
          </h2>
          <p className="text-foreground-soft">
            {state.games.map(({ me, opponent }) => `${String(me)}–${String(opponent)}`).join(', ')}
          </p>
          <Button asChild size="large" className="w-full">
            <Link href={matchRoute(matchId)}>See the match summary</Link>
          </Button>
          <Button variant="ghost" onClick={undo}>
            Undo the last point
          </Button>
        </BottomSheet>
      ) : null}

      {showPrompt && live?.isBetweenGames && lastGame ? (
        <BottomSheet label="Game over">
          <h2 className="font-display text-4xl font-black uppercase leading-none">
            {lastGame.winner === Side.Me ? 'You' : opponentName} took game {String(state.games.length)}
          </h2>
          <p className="text-foreground-soft">
            {String(lastGame.me)}–{String(lastGame.opponent)}. Switch ends. {live.server === Side.Me ? 'You serve' : `${opponentName} serves`} first.
          </p>
          <Button
            size="large"
            className="w-full"
            onClick={() => {
              setDismissedPromptAt(points.length);
            }}
          >
            Start game {String(live.gameNumber)}
          </Button>
        </BottomSheet>
      ) : null}

      {showPrompt && live?.switchEndsNow ? (
        <BottomSheet label="Switch ends">
          <h2 className="font-display text-4xl font-black uppercase leading-none">Switch ends</h2>
          <p className="text-foreground-soft">First to 5 in the deciding game.</p>
          <Button
            size="large"
            className="w-full"
            onClick={() => {
              setDismissedPromptAt(points.length);
            }}
          >
            Continue
          </Button>
        </BottomSheet>
      ) : null}

      {isConfirmingEnd ? (
        <BottomSheet label="Leave this match?">
          <h2 className="font-display text-4xl font-black uppercase leading-none">Leave this match?</h2>
          <p className="text-foreground-soft">Your score is saved, so you can resume it from the dashboard.</p>
          <Button
            size="large"
            className="w-full"
            onClick={() => {
              setIsConfirmingEnd(false);
            }}
          >
            Keep playing
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href={Route.Dashboard}>Leave for now</Link>
          </Button>
          <form action={abandonMatchAction.bind(null, matchId)} className="contents">
            <Button type="submit" variant="ghost" className="w-full">
              End without finishing
            </Button>
          </form>
        </BottomSheet>
      ) : null}
    </div>
  );
}

interface ScoreZoneProps {
  name: string;
  side: Side;
  state: InProgressMatchState | null;
  gamesWon: number;
  onAward: (winner: Side) => void;
}

function ScoreZone({ name, side, state, gamesWon, onAward }: ScoreZoneProps): ReactElement {
  const score = state?.current[side] ?? 0;
  const isServing = state?.server === side;
  const badge = state?.matchPoint === side ? 'Match point' : state?.gamePoint === side ? 'Game point' : null;

  return (
    <button
      type="button"
      disabled={!state}
      onClick={() => {
        onAward(side);
      }}
      aria-label={`Point to ${name}. Score ${String(score)}.`}
      className={cn(
        'relative flex min-h-0 touch-manipulation select-none flex-col items-center justify-center overflow-hidden rounded-xl bg-card outline-none transition-[background-color,transform] duration-100 active:scale-[0.99] active:bg-card-raised focus-visible:ring-2 focus-visible:ring-foreground disabled:opacity-60',
        isServing && 'border-2 border-primary',
      )}
    >
      <span className="flex items-center gap-2 px-3 text-center text-lg font-semibold lg:text-3xl">
        <span className="truncate">{name}</span>
        {isServing ? (
          <span className="flex items-center gap-1 text-sm font-medium text-primary lg:text-xl">
            <span aria-hidden="true" className="size-3 rounded-full bg-primary lg:size-4" />
            {state.servesLeft === 2 ? '2 serves' : '1 serve'}
          </span>
        ) : null}
      </span>
      <span
        key={score}
        className="animate-score-pop font-display text-[clamp(6rem,24dvh,16rem)] font-extrabold leading-none tabular-nums landscape:text-[clamp(7rem,48dvh,30rem)]"
      >
        {score}
      </span>
      <span className="flex min-h-7 items-center gap-2 text-sm font-medium text-muted-foreground lg:text-xl">
        Games {gamesWon}
        {badge ? (
          <span className="rounded-full bg-primary px-3 py-0.5 font-semibold text-primary-foreground">{badge}</span>
        ) : null}
        {state?.isDeuce && !badge ? <span className="rounded-full border border-border px-3 py-0.5">Deuce</span> : null}
      </span>
    </button>
  );
}

function BottomSheet({ label, children }: Readonly<{ label: string; children: React.ReactNode }>): ReactElement {
  return (
    <div
      role="dialog"
      aria-label={label}
      className="absolute inset-x-0 bottom-0 z-30 flex animate-sheet-up flex-col gap-3 rounded-t-2xl border-t border-border bg-card p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-20px_40px_-20px_rgb(0_0_0/0.7)]"
    >
      {children}
    </div>
  );
}
