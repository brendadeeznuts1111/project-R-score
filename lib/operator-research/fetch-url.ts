// @see https://bun.com/docs/runtime/utils#bun-sleep — Bun.sleep
// @see https://bun.com/docs/runtime/networking/fetch — fetch
// @see https://bun.com/blog/bun-v1.3.14#experimental-http-2-client-for-fetch — per-request protocol

export const FETCH_MAX_RETRIES = 3;
export const FETCH_BASE_DELAY_MS = 500;

export type FetchRetryOptions = BunFetchRequestInit & {
  maxRetries?: number;
  baseDelayMs?: number;
  /** Extra statuses to retry beyond 429 + 5xx. */
  retryStatuses?: number[];
};

function shouldRetryStatus(status: number, extra: number[]): boolean {
  if (status === 429) return true;
  if (status >= 500 && status <= 599) return true;
  return extra.includes(status);
}

/**
 * Polite fetch with exponential backoff on 429 / 5xx and network failures.
 * Uses `Bun.sleep` between attempts.
 */
export async function fetchWithRetry(
  url: string,
  options: FetchRetryOptions = {}
): Promise<Response> {
  const {
    maxRetries = FETCH_MAX_RETRIES,
    baseDelayMs = FETCH_BASE_DELAY_MS,
    retryStatuses = [],
    ...init
  } = options;

  let attempt = 0;
  let lastError: unknown;
  let lastResponse: Response | undefined;

  while (attempt < maxRetries) {
    attempt++;
    try {
      const response = await fetch(url, init);
      if (shouldRetryStatus(response.status, retryStatuses) && attempt < maxRetries) {
        lastResponse = response;
        // Drain body so the socket can be reused.
        try {
          await response.arrayBuffer();
        } catch {
          /* ignore */
        }
        const delay = baseDelayMs * 2 ** (attempt - 1);
        await Bun.sleep(delay);
        continue;
      }
      return response;
    } catch (err) {
      lastError = err;
      if (attempt >= maxRetries) break;
      const delay = baseDelayMs * 2 ** (attempt - 1);
      await Bun.sleep(delay);
    }
  }

  if (lastResponse) return lastResponse;
  throw lastError instanceof Error ? lastError : new Error(`Max retries exceeded for ${url}`);
}
