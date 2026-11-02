# TypeScript

Push correctness into the types: parse at the edges, make illegal states unrepresentable, and treat every escape hatch as something to justify in review.

## Modeling

- Use discriminated unions rather than bags of optional fields, so impossible states can't be written:

```ts
type ReportState =
  | { status: 'loading' }
  | { status: 'success'; report: ScoutingReport }
  | { status: 'error'; message: string };
```

- Make switches over unions exhaustive, so a new variant is a compile error. Use the shared `assertNever(value: never): never` helper in the `default` branch.
- Brand ids so they can't be swapped: `UserId`, `OpponentId`, `MatchId`, `PointId`. Create them with Zod's `.brand()` at the boundary.
- Derive types rather than duplicating them: `z.infer`, `typeof`, `keyof`, indexed access, `ReturnType`, `Pick`, `Omit`, and Drizzle's `$inferSelect`.
- Use `satisfies` to check a shape while keeping literal types.

## External data

- Treat API responses, `JSON.parse`, browser storage, env vars, request bodies, form data, AI output and `jsonb` columns as `unknown` until parsed.
- Define the Zod schema first and derive the type from it. Never write `await response.json() as User`.

## Escape hatches

- `any`, `as` and `!` are code smells. Prefer narrowing with type guards, `in` and `instanceof`, and `unknown` over `any`. `as const` is fine.
- If a cast is truly needed, isolate it in one well-named function with a one-line comment explaining why.

## Functions and APIs

- Annotate return types on exported functions. Let inference work inside them.
- Accept wide inputs and return narrow outputs: take `readonly T[]` or `Iterable<T>`, and return concrete types.
- Use an options object instead of positional booleans: `createOpponent({ name, shouldExtractTraits: true })`.
- A generic parameter must appear at least twice, linking input to output. Otherwise it shouldn't be generic. No conditional-type gymnastics.

## Errors

- `catch (error)` gives `unknown`, so narrow it before use. Don't assume `error.message` exists.
- Use `cause` when rethrowing: `new Error('Failed to load match', { cause: error })`.
- Return a `Result` union for expected failures such as validation errors, not found and rate limits, so they are visible in the type. Throw only for unexpected failures.

## Modules

- Export only what other modules use.
- No barrel files (`index.ts` re-exporting a folder).
- Use `import type` for type-only imports.

## Compiler and lint settings

`tsconfig.json` enables, alongside `strict`:

- `noUncheckedIndexedAccess`
- `exactOptionalPropertyTypes`
- `noImplicitOverride`
- `noFallthroughCasesInSwitch`
- `verbatimModuleSyntax`

Type-aware typescript-eslint rules are errors:

- `no-floating-promises`
- `no-misused-promises`
- `switch-exhaustiveness-check`
- `no-unnecessary-condition`

## Type tests

For shared helpers and branded ids, assert that invalid usage fails, using Vitest's `expectTypeOf` or `// @ts-expect-error`.
