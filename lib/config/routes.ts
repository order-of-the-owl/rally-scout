import type { MatchId, OpponentId } from '@/lib/domain/ids';

export const Route = {
  Home: '/',
  SignIn: '/sign-in',
  SignUp: '/sign-up',
  Onboarding: '/onboarding',
  Dashboard: '/dashboard',
  Profile: '/profile',
  Opponents: '/opponents',
  NewOpponent: '/opponents/new',
  Matches: '/matches',
  NewMatch: '/matches/new',
} as const;

export function opponentRoute(opponentId: OpponentId): string {
  return `${Route.Opponents}/${opponentId}`;
}

export function editOpponentRoute(opponentId: OpponentId): string {
  return `${opponentRoute(opponentId)}/edit`;
}

export function matchRoute(matchId: MatchId): string {
  return `${Route.Matches}/${matchId}`;
}

export function liveMatchRoute(matchId: MatchId): string {
  return `${matchRoute(matchId)}/live`;
}

export function newMatchAgainstRoute(opponentId: OpponentId): string {
  return `${Route.NewMatch}?opponent=${opponentId}`;
}
