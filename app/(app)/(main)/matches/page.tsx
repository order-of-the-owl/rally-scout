import { redirect } from 'next/navigation';

import { Route } from '@/lib/config/routes';

export default function MatchesPage(): never {
  redirect(Route.Dashboard);
}
