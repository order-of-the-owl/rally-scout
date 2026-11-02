import { EnvValidationError, getEnv } from '@/lib/config/env';
import { logger } from '@/lib/logger';

export function register(): void {
  try {
    getEnv();
  } catch (error) {
    if (error instanceof EnvValidationError) {
      logger.error('env.invalid', { invalidVariables: error.invalidVariables });
    }
    throw error;
  }
}
