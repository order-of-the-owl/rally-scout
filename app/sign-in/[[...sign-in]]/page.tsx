import { SignIn } from '@clerk/nextjs';
import { Suspense, type ReactElement } from 'react';

import { Logo } from '@/components/app/Logo';
import { Route } from '@/lib/config/routes';

export default function SignInPage(): ReactElement {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-10">
      <Logo href={Route.Home} />
      <Suspense>
        <SignIn />
      </Suspense>
    </main>
  );
}
