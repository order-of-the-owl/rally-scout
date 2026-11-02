export class AiRateLimitError extends Error {
  constructor() {
    super('AI rate limit reached');
    this.name = 'AiRateLimitError';
  }
}

export class AiProviderError extends Error {
  constructor(options: ErrorOptions) {
    super('AI provider request failed', options);
    this.name = 'AiProviderError';
  }
}

export class AiValidationError extends Error {
  constructor() {
    super('AI output failed validation');
    this.name = 'AiValidationError';
  }
}
