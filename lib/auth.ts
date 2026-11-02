import { auth } from '@clerk/nextjs/server';

import { userIdSchema, type UserId } from '@/lib/domain/ids';

export async function requireUser(): Promise<UserId> {
  const { userId, redirectToSignIn } = await auth();
  if (!userId) {
    return redirectToSignIn();
  }

  return userIdSchema.parse(userId);
}
