# Enums and configuration

Don't hardcode values inside feature files. If a value has a meaning, give it a name and one home.

## Enums

Any fixed set of values is an enum: sides, match status, point endings, play styles, rubber types, AI model aliases.

Use the const object pattern. Don't use the TypeScript `enum` keyword or `const enum`: they generate runtime code and don't work with plain string data or type stripping.

```ts
export const Side = { Me: 'me', Opponent: 'opponent' } as const;
export type Side = (typeof Side)[keyof typeof Side];
```

- Domain enums live in `lib/domain/enums.ts`. The database schema and Zod schemas derive from them; never redeclare the values.
- Compare against `Side.Me`, never the string `'me'`.
- A literal union is fine for a small option used by one function, with no runtime values needed.

## Where values live

| Kind of value | Location |
| --- | --- |
| Environment variables | `lib/config/env.ts`, validated with Zod at startup |
| Rules and thresholds used by domain logic (points to win, Elo K-factor, weakness thresholds) | `lib/domain/constants.ts` |
| App settings (rate limits, cache TTLs, timeouts, debounce and auto-dismiss durations) | `lib/config/app.ts` |
| YouTube channel IDs | `lib/youtube/channels.ts` |
| Routes | `lib/config/routes.ts` |

- Read `process.env` only in `lib/config/env.ts`.
- No magic numbers or repeated string literals in feature code.
- `lib/domain` may not import from `lib/config`; pass settings in as arguments if needed.
- Every new environment variable also goes in `.env.example`, with no real value.

Not everything needs a constant: `0`, `1`, array indexes and one-off UI copy can stay inline.
