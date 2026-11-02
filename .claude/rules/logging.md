# Logging

All server-side logging goes through `lib/logger.ts`, a thin wrapper that writes structured JSON to stdout so it shows up in Vercel logs. No logging library unless one is approved first.

- Don't use `console.*` outside `lib/logger.ts`.
- `lib/domain` stays pure and never logs. Callers log the outcome.
- Levels: `debug` for local detail, `info` for completed operations, `warn` for recoverable problems, `error` for failures.
- Use a stable event name plus fields, not interpolated strings:

```ts
logger.info('match.completed', { matchId, durationMs });
```

## What to log

- Every Server Action and API route failure, with the error and the operation name.
- Every AI call: model, latency, token usage, retry count, validation failures.
- External API calls: YouTube cache hit or miss, quota errors, AI provider errors.
- Key state changes: match started, completed or abandoned; rate limit reached.

## What never to log

- Secrets, API keys, tokens, connection strings or auth headers.
- Raw note text, voice transcripts, full AI prompts or AI responses.
- Personal data such as names or emails. Use ids.

Errors shown to users stay friendly and generic; the detail belongs in the logs. Don't log and rethrow the same error at every layer: log it once where it is handled.
