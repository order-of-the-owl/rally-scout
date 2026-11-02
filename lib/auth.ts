import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { cache } from 'react';

import { Route } from '@/lib/config/routes';
import { getOrCreateUser, type User } from '@/lib/db/queries/users';
import { userIdSchema, type UserId } from '@/lib/domain/ids';

export async function requireUser(): Promise<UserId> {
  const { userId, redirectToSignIn } = await auth();
  if (!userId) {
    return redirectToSignIn();
  }

  return userIdSchema.parse(userId);
}

export const getCurrentUser = cache(async (): Promise<User> => getOrCreateUser(await requireUser()));

export async function requireOnboardedUser(): Promise<User> {
  const user = await getCurrentUser();
  if (user.onboardedAt === null) {
    redirect(Route.Onboarding);
  }

  return user;
}
