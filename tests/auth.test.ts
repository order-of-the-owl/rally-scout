import { auth } from '@clerk/nextjs/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { requireUser } from '@/lib/auth';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));

const REDIRECT_SIGNAL = new Error('redirected to sign-in');
const redirectToSignIn = vi.fn(() => {
  throw REDIRECT_SIGNAL;
});

function mockSession(userId: string | null): void {
  // Cast because the real session type has many fields requireUser never reads.
  vi.mocked(auth).mockResolvedValue({ userId, redirectToSignIn } as never);
}

describe('requireUser', () => {
  beforeEach(() => {
    redirectToSignIn.mockClear();
  });

  it('returns the id of a signed-in user', async () => {
    mockSession('user_123');

    await expect(requireUser()).resolves.toBe('user_123');
    expect(redirectToSignIn).not.toHaveBeenCalled();
  });

  it('redirects a signed-out visitor to sign-in', async () => {
    mockSession(null);

    await expect(requireUser()).rejects.toBe(REDIRECT_SIGNAL);
    expect(redirectToSignIn).toHaveBeenCalledOnce();
  });
});
