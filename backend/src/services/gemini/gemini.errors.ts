export class AiError extends Error {
  public readonly isRetryable: boolean;

  constructor(message: string, isRetryable = false) {
    super(message);
    this.name = 'AiError';
    this.isRetryable = isRetryable;
  }
}

export class AiConfigError extends AiError {
  constructor(message = 'AI provider is not configured') {
    super(message, false);
    this.name = 'AiConfigError';
  }
}

export class AiTimeoutError extends AiError {
  constructor(timeoutMs: number) {
    super(`AI request timed out after ${timeoutMs}ms`, true);
    this.name = 'AiTimeoutError';
  }
}

export class AiRateLimitError extends AiError {
  constructor(message = 'AI provider rate limit exceeded') {
    super(message, true);
    this.name = 'AiRateLimitError';
  }
}

export class AiResponseParsingError extends AiError {
  public readonly rawResponse?: string;

  constructor(message: string, rawResponse?: string) {
    super(message, false);
    this.name = 'AiResponseParsingError';
    this.rawResponse = rawResponse;
  }
}

export class AiApiError extends AiError {
  public readonly statusCode?: number;

  constructor(message: string, statusCode?: number, isRetryable = false) {
    super(message, isRetryable);
    this.name = 'AiApiError';
    this.statusCode = statusCode;
  }
}

// Backward-compatible exports for existing imports. Runtime errors remain
// provider-neutral and no longer expose a provider name in logs.
export {
  AiError as GeminiError,
  AiConfigError as GeminiConfigError,
  AiTimeoutError as GeminiTimeoutError,
  AiRateLimitError as GeminiRateLimitError,
  AiResponseParsingError as GeminiResponseParsingError,
  AiApiError as GeminiApiError,
};
