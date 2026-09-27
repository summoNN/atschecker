export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:4000'
).replace(/\/$/, '');

export class ApiError extends Error {
  readonly status?: number;
  readonly code: 'HTTP' | 'NETWORK' | 'TIMEOUT' | 'INVALID_RESPONSE';

  constructor(
    message: string,
    code: ApiError['code'],
    status?: number
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

export async function requestJson<T>(
  path: string,
  options: RequestInit = {},
  timeoutMs = 60000
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
    });
    const rawText = await response.text();
    let body: unknown = null;

    try {
      body = rawText ? JSON.parse(rawText) : null;
    } catch {
      throw new ApiError('The backend returned an invalid response.', 'INVALID_RESPONSE', response.status);
    }

    if (!response.ok) {
      const message =
        typeof body === 'object' && body !== null && 'message' in body
          ? String(body.message)
          : `Request failed with status ${response.status}`;
      throw new ApiError(message, 'HTTP', response.status);
    }

    return body as T;
  } catch (error: unknown) {
    if (error instanceof ApiError) throw error;
    if (typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError') {
      throw new ApiError('The request timed out. Please try again.', 'TIMEOUT');
    }
    throw new ApiError('Unable to reach the ATS backend.', 'NETWORK');
  } finally {
    clearTimeout(timeout);
  }
}
