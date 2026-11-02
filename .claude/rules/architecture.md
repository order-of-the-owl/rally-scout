# Architecture

## Domain logic

- `lib/domain` is pure TypeScript: no database, React, Next.js, logging or environment access.
- Match state is always derived from the points list. Never store the score.
- Points are append-only events; undo removes the last point.

## Validation

- Validate every form input, API input and AI output with Zod.
- Share schemas rather than redefining a shape. Infer types from schemas with `z.infer`.

## Data access

- Database access goes through `lib/db/queries`. Components, routes and actions don't call Drizzle directly.
- Every query takes the user id from `requireUser()` and filters by `owner_id`. Never accept a user id from the client.
- Schema changes go through drizzle-kit migrations.

## AI

- All AI calls are server-side and go through `callStructured` in `lib/ai/client.ts`.
- Provider URLs and model names come from `lib/config/env.ts`, never from feature code.
- AI receives numbers computed by code and never invents numbers or video links.

## UI

- Mobile-first: every signed-in page must work at 375 px wide.
- Default to Server Components. Use client components only for interactivity.
- Every list has an empty state. Every AI feature handles too little data and failure with a retry.

## Testing

- Vitest covers all domain logic, targeting 90%+ coverage on `lib/domain`.
- Tests never make live AI or YouTube calls; use recorded sample responses.
- Test behaviour through public functions, and add a regression test with each bug fix.
