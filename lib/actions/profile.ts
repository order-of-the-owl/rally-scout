'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { requireUser } from '@/lib/auth';
import { Route } from '@/lib/config/routes';
import { saveProfile } from '@/lib/db/queries/users';
import { logger } from '@/lib/logger';
import { profileSchema, type ProfileFormState } from '@/lib/validation/profile';

type SubmittedValues = Extract<ProfileFormState, { status: 'failed' }>['values'];

function readSubmittedValues(formData: FormData): SubmittedValues {
  const values: SubmittedValues = {};
  for (const field of profileSchema.keyof().options) {
    const value = formData.get(field);
    if (typeof value === 'string') {
      values[field] = value;
    }
  }
  return values;
}

export async function saveProfileAction(
  _previousState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const userId = await requireUser();
  const values = readSubmittedValues(formData);

  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) {
    return { status: 'invalid', fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  try {
    await saveProfile(userId, parsed.data);
  } catch (error) {
    logger.error('profile.save_failed', { userId, error });
    return { status: 'failed', values };
  }

  logger.info('profile.saved', { userId });
  redirect(Route.Dashboard);
}
