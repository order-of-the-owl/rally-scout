import OpenAI from 'openai';
import { z } from 'zod';

import { AiProviderError, AiRateLimitError, AiValidationError } from '@/lib/ai/errors';
import {
  AI_MAX_ATTEMPTS,
  AI_PROVIDER_RETRIES,
  AI_RATE_LIMIT_WINDOW_MS,
  AI_REQUEST_TIMEOUT_MS,
} from '@/lib/config/app';
import { getEnv } from '@/lib/config/env';
import { countAiCallsSince, recordAiCall } from '@/lib/db/queries/ai';
import type { AiFeature } from '@/lib/domain/enums';
import type { UserId } from '@/lib/domain/ids';
import { logger } from '@/lib/logger';

interface CallStructuredOptions<Output> {
  userId: UserId;
  feature: AiFeature;
  model: string;
  fallbackModel?: string;
  system: string;
  input: unknown;
  schema: z.ZodType<Output>;
  toolName: string;
}

let cachedClient: OpenAI | undefined;

function getClient(): OpenAI {
  const { AI_API_KEY, AI_BASE_URL } = getEnv();
  cachedClient ??= new OpenAI({
    apiKey: AI_API_KEY,
    baseURL: AI_BASE_URL,
    timeout: AI_REQUEST_TIMEOUT_MS,
    maxRetries: AI_PROVIDER_RETRIES,
  });
  return cachedClient;
}

function toToolParameters(schema: z.ZodType): Record<string, unknown> {
  const { $schema, ...parameters } = z.toJSONSchema(schema);
  return parameters;
}

function parseArguments(rawArguments: string | undefined): unknown {
  try {
    return rawArguments === undefined ? undefined : JSON.parse(rawArguments);
  } catch {
    return undefined;
  }
}

const providerStatusSchema = z.object({ status: z.number() });
const RATE_LIMITED_STATUS = 429;
const FIRST_SERVER_ERROR_STATUS = 500;

function isProviderOverloaded(error: unknown): boolean {
  const parsed = providerStatusSchema.safeParse(error);
  return parsed.success && (parsed.data.status === RATE_LIMITED_STATUS || parsed.data.status >= FIRST_SERVER_ERROR_STATUS);
}

export async function callStructured<Output>({
  userId,
  feature,
  model,
  fallbackModel,
  system,
  input,
  schema,
  toolName,
}: CallStructuredOptions<Output>): Promise<{ data: Output; model: string }> {
  const callsThisWindow = await countAiCallsSince(userId, new Date(Date.now() - AI_RATE_LIMIT_WINDOW_MS));
  if (callsThisWindow >= getEnv().AI_RATE_LIMIT_PER_HOUR) {
    logger.warn('ai.rate_limited', { userId, feature, callsThisWindow });
    throw new AiRateLimitError();
  }

  const parameters = toToolParameters(schema);
  const createCompletion = (activeModel: string): Promise<OpenAI.Chat.Completions.ChatCompletion> =>
    getClient().chat.completions.create({
      model: activeModel,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: JSON.stringify(input) },
      ],
      tools: [{ type: 'function', function: { name: toolName, parameters } }],
      tool_choice: { type: 'function', function: { name: toolName } },
    });

  let activeModel = model;

  for (let attempt = 1; attempt <= AI_MAX_ATTEMPTS; attempt += 1) {
    const startedAt = performance.now();
    let completion: OpenAI.Chat.Completions.ChatCompletion;
    try {
      completion = await createCompletion(activeModel);
    } catch (error) {
      if (!fallbackModel || activeModel === fallbackModel || !isProviderOverloaded(error)) {
        logger.error('ai.provider_failed', { userId, feature, model: activeModel, attempt, error });
        throw new AiProviderError({ cause: error });
      }

      logger.warn('ai.fallback_used', { userId, feature, from: activeModel, to: fallbackModel, attempt });
      activeModel = fallbackModel;
      try {
        completion = await createCompletion(activeModel);
      } catch (fallbackError) {
        logger.error('ai.provider_failed', { userId, feature, model: activeModel, attempt, error: fallbackError });
        throw new AiProviderError({ cause: fallbackError });
      }
    }

    const latencyMs = Math.round(performance.now() - startedAt);
    const totalTokens = completion.usage?.total_tokens ?? null;
    await recordAiCall({ ownerId: userId, feature, model: activeModel, totalTokens, latencyMs });
    logger.info('ai.call', { userId, feature, model: activeModel, attempt, latencyMs, totalTokens });

    const toolCall = completion.choices[0]?.message.tool_calls?.find(
      (call) => call.type === 'function' && call.function.name === toolName,
    );
    const rawArguments = toolCall?.type === 'function' ? toolCall.function.arguments : undefined;
    const parsed = schema.safeParse(parseArguments(rawArguments));
    if (parsed.success) {
      return { data: parsed.data, model: activeModel };
    }

    logger.warn('ai.validation_failed', {
      userId,
      feature,
      model: activeModel,
      attempt,
      issueCount: parsed.error.issues.length,
      hadToolCall: toolCall !== undefined,
    });
  }

  throw new AiValidationError();
}
