import { PointEnding, Side } from '@/lib/domain/enums';

export interface PointTag {
  ending: PointEnding;
  actor: Side | null;
}

function otherSide(side: Side): Side {
  return side === Side.Me ? Side.Opponent : Side.Me;
}

export function pointTagOptions(winner: Side, server: Side): readonly PointTag[] {
  const loser = otherSide(winner);
  const serviceTags: PointTag[] =
    winner === server
      ? [
          { ending: PointEnding.ServeAce, actor: winner },
          { ending: PointEnding.ReceiveError, actor: loser },
          { ending: PointEnding.ThirdBallWinner, actor: winner },
        ]
      : [
          { ending: PointEnding.ServeError, actor: loser },
          { ending: PointEnding.ThirdBallError, actor: loser },
        ];

  return [
    ...serviceTags,
    { ending: PointEnding.ForehandWinner, actor: winner },
    { ending: PointEnding.BackhandWinner, actor: winner },
    { ending: PointEnding.ForehandUnforcedError, actor: loser },
    { ending: PointEnding.BackhandUnforcedError, actor: loser },
    { ending: PointEnding.ForcedError, actor: loser },
    { ending: PointEnding.NetOrEdge, actor: winner },
  ];
}
