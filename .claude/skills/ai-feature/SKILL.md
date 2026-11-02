---
name: ai-feature
description: Add or change an AI feature. Use when working on scouting reports, match summaries, note extraction, video queries or their prompts.
---

1. Define the output as a Zod schema in `lib/ai/schemas.ts`.
2. Write the prompt in its own file in `lib/ai/prompts/`, using the shared system prompt rules.
3. Build the input from functions in `lib/domain/stats.ts`. The AI only receives numbers computed by code.
4. Call it through `callStructured` with a model from config. Never name a provider or model in feature code.
5. Handle too little data, a rate limit and failure in the UI, with a retry.
6. Add schema tests using recorded sample responses, including a bad response. Make no live AI calls in tests.
