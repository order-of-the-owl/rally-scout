import type { ReactElement } from 'react';

export default function Loading(): ReactElement {
  return (
    <div role="status" aria-label="Loading" className="flex animate-pulse flex-col gap-6 py-6 motion-reduce:animate-none">
      <div className="h-12 w-64 max-w-full rounded-md bg-card-raised" />
      <div className="h-32 rounded-xl bg-card" />
      <div className="h-20 rounded-xl bg-card" />
    </div>
  );
}
