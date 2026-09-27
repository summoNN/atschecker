export class JdError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'JdError';
    this.statusCode = statusCode;
  }
}

export class EmptyJobDescriptionError extends JdError {
  constructor(message = 'Job description must be a non-empty string') {
    super(message, 400);
    this.name = 'EmptyJobDescriptionError';
  }
}

export class JdNormalizationError extends JdError {
  public readonly rawResponse?: string;

  constructor(message: string, rawResponse?: string) {
    super(message, 500);
    this.name = 'JdNormalizationError';
    this.rawResponse = rawResponse;
  }
}
