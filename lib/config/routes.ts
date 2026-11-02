import type { OpponentId } from '@/lib/domain/ids';

export const Route = {
  Home: '/',
  SignIn: '/sign-in',
  SignUp: '/sign-up',
  Onboarding: '/onboarding',
  Dashboard: '/dashboard',
  Profile: '/profile',
  Opponents: '/opponents',
  NewOpponent: '/opponents/new',
} as const;

export function opponentRoute(opponentId: OpponentId): string {
  return `${Route.Opponents}/${opponentId}`;
}

export function editOpponentRoute(opponentId: OpponentId): string {
  return `${opponentRoute(opponentId)}/edit`;
}
