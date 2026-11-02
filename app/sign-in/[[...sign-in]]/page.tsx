import { SignIn } from '@clerk/nextjs';
import { Suspense, type ReactElement } from 'react';

export default function SignInPage(): ReactElement {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <Suspense>
        <SignIn />
      </Suspense>
    </main>
  );
}
