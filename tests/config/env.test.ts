import { describe, expect, it } from 'vitest';

import { EnvValidationError, LogLevel, parseEnv, resolveLogLevel } from '@/lib/config/env';

const validEnv = {
  DATABASE_URL: 'postgresql://user:fake-db-password@localhost:5432/rally_scout',
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_fake',
  CLERK_SECRET_KEY: 'sk_test_fake-clerk-secret',
  LITELLM_BASE_URL: 'http://localhost:4000',
  LITELLM_API_KEY: 'fake-litellm-key',
};

function captureEnvError(source: Readonly<Record<string, string | undefined>>): EnvValidationError {
  try {
    parseEnv(source);
  } catch (error) {
    if (error instanceof EnvValidationError) {
      return error;
    }
    throw error;
  }
  throw new Error('Expected parseEnv to throw');
}

describe('parseEnv', () => {
  it('accepts a valid environment and applies defaults', () => {
    const env = parseEnv(validEnv);

    expect(env.AI_MODEL_REPORT).toBe('smart');
    expect(env.AI_MODEL_FAST).toBe('fast');
    expect(env.AI_RATE_LIMIT_PER_HOUR).toBe(20);
    expect(env.YOUTUBE_API_KEY).toBeUndefined();
  });

  it('accepts overrides and coerces numbers', () => {
    const env = parseEnv({ ...validEnv, AI_MODEL_FAST: 'cheap', AI_RATE_LIMIT_PER_HOUR: '5', YOUTUBE_API_KEY: 'yt' });

    expect(env.AI_MODEL_FAST).toBe('cheap');
    expect(env.AI_RATE_LIMIT_PER_HOUR).toBe(5);
    expect(env.YOUTUBE_API_KEY).toBe('yt');
  });

  it('names every missing required variable', () => {
    const error = captureEnvError({});

    expect(error.invalidVariables).toEqual([
      'DATABASE_URL',
      'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
      'CLERK_SECRET_KEY',
      'LITELLM_BASE_URL',
      'LITELLM_API_KEY',
    ]);
  });

  it('treats empty strings as unset', () => {
    expect(captureEnvError({ ...validEnv, LITELLM_API_KEY: '' }).invalidVariables).toEqual(['LITELLM_API_KEY']);
    expect(parseEnv({ ...validEnv, YOUTUBE_API_KEY: '', AI_MODEL_FAST: '' }).AI_MODEL_FAST).toBe('fast');
  });

  it.each([
    ['DATABASE_URL', 'mysql://localhost/rally_scout'],
    ['DATABASE_URL', 'not a url'],
    ['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'sk_test_wrong-kind'],
    ['CLERK_SECRET_KEY', 'pk_test_wrong-kind'],
    ['LITELLM_BASE_URL', 'ftp://localhost:4000'],
    ['AI_RATE_LIMIT_PER_HOUR', '0'],
    ['AI_RATE_LIMIT_PER_HOUR', 'many'],
  ])('rejects %s=%s', (name, value) => {
    expect(captureEnvError({ ...validEnv, [name]: value }).invalidVariables).toEqual([name]);
  });

  it('never includes values in the error', () => {
    const secretValue = 'pk_test_should-not-appear';
    const error = captureEnvError({ ...validEnv, CLERK_SECRET_KEY: secretValue, DATABASE_URL: secretValue });

    expect(error.message).not.toContain(secretValue);
    expect(JSON.stringify(error)).not.toContain(secretValue);
    expect(error.message).toContain('CLERK_SECRET_KEY');
  });
});

describe('resolveLogLevel', () => {
  it('uses an explicit valid level', () => {
    expect(resolveLogLevel({ LOG_LEVEL: 'warn', NODE_ENV: 'production' })).toBe(LogLevel.Warn);
  });

  it('defaults to info in production and debug otherwise', () => {
    expect(resolveLogLevel({ NODE_ENV: 'production' })).toBe(LogLevel.Info);
    expect(resolveLogLevel({ NODE_ENV: 'development' })).toBe(LogLevel.Debug);
    expect(resolveLogLevel({})).toBe(LogLevel.Debug);
  });

  it('falls back instead of throwing on an unknown or empty level', () => {
    expect(resolveLogLevel({ LOG_LEVEL: 'loud', NODE_ENV: 'production' })).toBe(LogLevel.Info);
    expect(resolveLogLevel({ LOG_LEVEL: '', NODE_ENV: 'production' })).toBe(LogLevel.Info);
  });
});
