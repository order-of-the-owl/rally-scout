import { existsSync } from 'node:fs';

import { defineConfig } from 'drizzle-kit';

import { getDatabaseUrl } from './lib/config/env';

const LOCAL_ENV_FILE = '.env.local';

if (existsSync(LOCAL_ENV_FILE)) {
  process.loadEnvFile(LOCAL_ENV_FILE);
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: getDatabaseUrl() },
});
