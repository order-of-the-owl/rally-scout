import type { ReactElement, ReactNode } from 'react';

import { requireOnboardedUser } from '@/lib/auth';

export default async function MainLayout({ children }: Readonly<{ children: ReactNode }>): Promise<ReactElement> {
  await requireOnboardedUser();

  return <>{children}</>;
}
