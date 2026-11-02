import { describe, expect, it } from 'vitest';

import { PointEnding, Side } from '@/lib/domain/enums';
import { pointTagOptions } from '@/lib/domain/point-tags';

const { Me, Opponent } = Side;

function actorFor(winner: Side, server: Side, ending: PointEnding): Side | null | undefined {
  return pointTagOptions(winner, server).find((option) => option.ending === ending)?.actor;
}

describe('pointTagOptions', () => {
  it('offers ace and receive error only when the winner served', () => {
    const endings = pointTagOptions(Me, Me).map(({ ending }) => ending);

    expect(endings).toContain(PointEnding.ServeAce);
    expect(endings).toContain(PointEnding.ReceiveError);
    expect(endings).not.toContain(PointEnding.ServeError);
    expect(endings).not.toContain(PointEnding.ThirdBallError);
  });

  it('offers serve error and third-ball error only when the loser served', () => {
    const endings = pointTagOptions(Me, Opponent).map(({ ending }) => ending);

    expect(endings).toContain(PointEnding.ServeError);
    expect(endings).toContain(PointEnding.ThirdBallError);
    expect(endings).not.toContain(PointEnding.ServeAce);
    expect(endings).not.toContain(PointEnding.ThirdBallWinner);
  });

  it('credits the decisive shot to whoever hit it', () => {
    expect(actorFor(Opponent, Opponent, PointEnding.ReceiveError)).toBe(Me);
    expect(actorFor(Me, Me, PointEnding.ServeAce)).toBe(Me);
    expect(actorFor(Me, Opponent, PointEnding.ServeError)).toBe(Opponent);
    expect(actorFor(Opponent, Me, PointEnding.ForehandUnforcedError)).toBe(Me);
    expect(actorFor(Opponent, Me, PointEnding.BackhandWinner)).toBe(Opponent);
    expect(actorFor(Me, Me, PointEnding.NetOrEdge)).toBe(Me);
  });
});
