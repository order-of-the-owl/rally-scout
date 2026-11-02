'use client';

import type { ReactElement } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import type { MomentumPoint } from '@/lib/domain/stats';

const AXIS_TICK = { fill: 'var(--muted-foreground)', fontSize: 12 };

function formatDifference(difference: number): string {
  return difference > 0 ? `+${String(difference)}` : String(difference);
}

function MomentumTooltip({ point }: Readonly<{ point: MomentumPoint }>): ReactElement {
  return (
    <div className="rounded-md border border-border bg-card-raised px-3 py-2 text-sm shadow-lg">
      <p className="font-semibold tabular-nums">{formatDifference(point.difference)} points</p>
      <p className="text-muted-foreground">
        Point {point.point} · Game {point.gameNumber}
      </p>
    </div>
  );
}

export function MomentumChart({ momentum }: Readonly<{ momentum: readonly MomentumPoint[] }>): ReactElement {
  const gameStarts = momentum.filter(
    (point, index) => index > 0 && point.gameNumber !== momentum[index - 1]?.gameNumber,
  );

  return (
    <figure className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
      <figcaption className="flex flex-col">
        <span className="font-semibold">Momentum</span>
        <span className="text-sm text-muted-foreground">Running point difference. Above zero means you lead.</span>
      </figcaption>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={[...momentum]} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.6} />
            <XAxis dataKey="point" tick={AXIS_TICK} tickLine={false} axisLine={false} minTickGap={32} />
            <YAxis
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              tickFormatter={formatDifference}
            />
            <ReferenceLine y={0} stroke="var(--muted-foreground)" />
            {gameStarts.map(({ point }) => (
              <ReferenceLine key={point} x={point} stroke="var(--border)" strokeDasharray="3 3" />
            ))}
            <Tooltip
              content={({ active, label }) => {
                const point = momentum.find((candidate) => candidate.point === label);
                return active && point ? <MomentumTooltip point={point} /> : null;
              }}
              cursor={{ stroke: 'var(--muted-foreground)' }}
            />
            <Line
              type="linear"
              dataKey="difference"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: 'var(--primary)', stroke: 'var(--card)', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
