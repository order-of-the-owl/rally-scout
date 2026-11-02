import { SignOutButton } from '@clerk/nextjs';
import type { ReactElement } from 'react';

import { ProfileForm } from '@/components/profile/ProfileForm';
import { Button } from '@/components/ui/button';
import { updateProfileAction } from '@/lib/actions/profile';
import { requireOnboardedUser } from '@/lib/auth';

export default async function ProfilePage(): Promise<ReactElement> {
  const user = await requireOnboardedUser();

  return (
    <section className="flex w-full max-w-2xl flex-col gap-8 py-6">
      <h1 className="font-display text-5xl font-black uppercase leading-none">Profile</h1>
      <ProfileForm
        action={updateProfileAction}
        submitLabel="Save changes"
        initialValues={{
          displayName: user.displayName ?? '',
          handedness: user.handedness ?? '',
          grip: user.grip ?? '',
          playStyle: user.playStyle ?? '',
          blade: user.blade ?? '',
          forehandRubber: user.forehandRubber ?? '',
          backhandRubber: user.backhandRubber ?? '',
        }}
      />
      <div className="border-t border-border pt-6">
        <SignOutButton>
          <Button variant="ghost" className="-ml-4">
            Sign out
          </Button>
        </SignOutButton>
      </div>
    </section>
  );
}
