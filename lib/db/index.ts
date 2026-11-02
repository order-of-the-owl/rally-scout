import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { getDatabaseUrl } from '@/lib/config/env';
import * as schema from '@/lib/db/schema';

type Database = PostgresJsDatabase<typeof schema>;

// Kept on globalThis because dev hot reloads would otherwise open a new pool each time.
declare global {
  var rallyScoutDatabase: Database | undefined;
}

export function getDb(): Database {
  // prepare: false because Neon's pooled connections run in transaction mode.
  globalThis.rallyScoutDatabase ??= drizzle(postgres(getDatabaseUrl(), { prepare: false }), { schema });
  return globalThis.rallyScoutDatabase;
}
