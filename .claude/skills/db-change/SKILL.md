---
name: db-change
description: Change the database schema safely with Drizzle. Use when adding or changing tables, columns, indexes or database enums.
---

1. Edit `lib/db/schema.ts`. Derive `pgEnum` values from `lib/domain/enums.ts`.
2. User-owned tables need `owner_id`. Add the indexes and cascade deletes the change needs.
3. Add or update typed query functions in `lib/db/queries`. Each takes the user id and filters by `owner_id`.
4. Run drizzle-kit to generate the migration and read the generated SQL. Flag anything destructive before applying it.
5. Apply it to the local database only with `pnpm db:migrate`, then run `pnpm typecheck`. Never run migrations against production without being asked.
