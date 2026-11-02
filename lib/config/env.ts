import { z } from 'zod';

export const LogLevel = {
  Debug: 'debug',
  Info: 'info',
  Warn: 'warn',
  Error: 'error',
} as const;
export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

// Calls Gemini directly because a hosted LiteLLM proxy doesn't fit free plans. To add fallbacks and spend
// tracking later, point AI_BASE_URL at a proxy; the removed setup is in commit fbcdc4e.
const DEFAULT_AI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/';
const DEFAULT_REPORT_MODEL = 'gemini-3.6-flash';
const DEFAULT_FAST_MODEL = 'gemini-3.5-flash-lite';
const DEFAULT_AI_RATE_LIMIT_PER_HOUR = 20;
const PRODUCTION = 'production';

type EnvSource = Readonly<Record<string, string | undefined>>;

const databaseUrlSchema = z.url({ protocol: /^postgres(ql)?$/ });

const envSchema = z.object({
  DATABASE_URL: databaseUrlSchema,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
  CLERK_SECRET_KEY: z.string().startsWith('sk_'),
  AI_BASE_URL: z.url({ protocol: /^https?$/ }).default(DEFAULT_AI_BASE_URL),
  AI_API_KEY: z.string().min(1),
  AI_MODEL_REPORT: z.string().min(1).default(DEFAULT_REPORT_MODEL),
  AI_MODEL_FAST: z.string().min(1).default(DEFAULT_FAST_MODEL),
  YOUTUBE_API_KEY: z.string().min(1).optional(),
  AI_RATE_LIMIT_PER_HOUR: z.coerce.number().int().positive().default(DEFAULT_AI_RATE_LIMIT_PER_HOUR),
});

export type Env = z.infer<typeof envSchema>;

export class EnvValidationError extends Error {
  readonly invalidVariables: readonly string[];

  constructor(invalidVariables: readonly string[]) {
    super(`Invalid environment variables: ${invalidVariables.join(', ')}`);
    this.name = 'EnvValidationError';
    this.invalidVariables = invalidVariables;
  }
}

// Blank lines copied from .env.example arrive as empty strings; treat them as unset.
function withoutEmptyValues(source: EnvSource): EnvSource {
  return Object.fromEntries(Object.entries(source).filter(([, value]) => value !== ''));
}

export function parseEnv(source: EnvSource): Env {
  const result = envSchema.safeParse(withoutEmptyValues(source));
  if (result.success) {
    return result.data;
  }

  const invalidVariables = [...new Set(result.error.issues.map((issue) => issue.path.join('.')))];
  throw new EnvValidationError(invalidVariables);
}

let cachedEnv: Env | undefined;

export function getEnv(): Env {
  cachedEnv ??= parseEnv(process.env);
  return cachedEnv;
}

// Separate from parseEnv so migrations don't need the app's other secrets.
export function resolveDatabaseUrl(source: EnvSource): string {
  const result = databaseUrlSchema.safeParse(source.DATABASE_URL);
  if (result.success) {
    return result.data;
  }

  throw new EnvValidationError(['DATABASE_URL']);
}

export function getDatabaseUrl(): string {
  return resolveDatabaseUrl(process.env);
}

// Separate from parseEnv so a bad config can still be logged.
export function resolveLogLevel(source: EnvSource): LogLevel {
  const result = z.enum(LogLevel).safeParse(source.LOG_LEVEL);
  if (result.success) {
    return result.data;
  }

  return source.NODE_ENV === PRODUCTION ? LogLevel.Info : LogLevel.Debug;
}

export function getLogLevel(): LogLevel {
  return resolveLogLevel(process.env);
}
