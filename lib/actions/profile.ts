'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { requireUser } from '@/lib/auth';
import { Route } from '@/lib/config/routes';
import { saveProfile } from '@/lib/db/queries/users';
import { logger } from '@/lib/logger';
import { readSubmittedValues } from '@/lib/validation/form-state';
import { profileSchema, type ProfileFormState } from '@/lib/validation/profile';

async function submitProfile(formData: FormData): Promise<ProfileFormState> {
  const userId = await requireUser();
  const values = readSubmittedValues(formData, profileSchema.keyof().options);

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
  return { status: 'saved', values };
}

export async function completeOnboardingAction(
  _previousState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const state = await submitProfile(formData);
  if (state.status === 'saved') {
    redirect(Route.Dashboard);
  }
  return state;
}

export async function updateProfileAction(
  _previousState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const state = await submitProfile(formData);
  if (state.status === 'saved') {
    revalidatePath(Route.Profile);
  }
  return state;
}
