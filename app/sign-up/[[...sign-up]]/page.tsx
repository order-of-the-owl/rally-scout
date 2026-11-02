import { SignUp } from '@clerk/nextjs';
import { Suspense, type ReactElement } from 'react';

export default function SignUpPage(): ReactElement {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <Suspense>
        <SignUp />
      </Suspense>
    </main>
  );
}
