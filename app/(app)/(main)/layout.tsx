import type { ReactElement, ReactNode } from 'react';

import { AppNav } from '@/components/app/AppNav';
import { requireOnboardedUser } from '@/lib/auth';

export default async function MainLayout({ children }: Readonly<{ children: ReactNode }>): Promise<ReactElement> {
  await requireOnboardedUser();

  return (
    <div className="flex flex-col pb-24 md:pb-10">
      <AppNav />
      {children}
    </div>
  );
}
