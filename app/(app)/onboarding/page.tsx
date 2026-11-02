import { redirect } from 'next/navigation';
import type { ReactElement } from 'react';

import { ProfileForm } from '@/components/profile/ProfileForm';
import { completeOnboardingAction } from '@/lib/actions/profile';
import { getCurrentUser } from '@/lib/auth';
import { Route } from '@/lib/config/routes';

export default async function OnboardingPage(): Promise<ReactElement> {
  const user = await getCurrentUser();
  if (user.onboardedAt !== null) {
    redirect(Route.Dashboard);
  }

  return (
    <section className="mx-auto flex max-w-2xl animate-rise flex-col gap-8 pb-16 pt-4">
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-5xl font-black uppercase leading-none">Set up your profile</h1>
        <p className="text-pretty text-foreground-soft">
          Your game plans use your style and equipment, so they fit how you actually play.
        </p>
      </div>
      <ProfileForm action={completeOnboardingAction} submitLabel="Save and continue" />
    </section>
  );
}
