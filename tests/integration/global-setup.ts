import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

import { getDatabaseUrl } from '@/lib/config/env';

export default async function setup(): Promise<void> {
  const client = postgres(getDatabaseUrl(), { max: 1, onnotice: () => undefined });
  await migrate(drizzle(client), { migrationsFolder: './drizzle' });
  await client.end();
}
