import type { ReactElement } from 'react';

export function RallyLine(): ReactElement {
  return (
    <div aria-hidden="true" className="relative h-21 border-b-[3px] border-foreground [container-type:inline-size]">
      <div className="absolute bottom-0 left-1/2 h-6.5 w-[3px] bg-foreground" />
      <div className="absolute bottom-0 size-4 animate-ball-travel">
        <div className="absolute -bottom-0.5 h-[3px] w-4 animate-ball-shadow rounded-full bg-black" />
        <div className="size-4 animate-ball-bounce rounded-full bg-primary" />
      </div>
    </div>
  );
}
