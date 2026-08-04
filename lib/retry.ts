// @see https://bun.com/docs/runtime/utils#bun-sleep — Bun.sleep
/**
 * Exponential backoff retry helper for network/proof operations.
 */
export type WithRetryOpts = {
  label?: string;
  maxRetries?: number;
  baseDelayMs?: number;
  /** Extra random jitter 0..jitterMs added each attempt. */
  jitterMs?: number;
  onRetry?: (info: {
    attempt: number;
    maxRetries: number;
    error: unknown;
    delayMs: number;
  }) => void;
};

/**
 * Run `fn` up to maxRetries times with exponential backoff.
 * Returns null if all attempts fail (never throws unless maxRetries < 1).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: WithRetryOpts = {}
): Promise<T | null> {
  const maxRetries = opts.maxRetries ?? 3;
  const baseDelay = opts.baseDelayMs ?? 1000;
  const jitterMs = opts.jitterMs ?? 1000;
  const label = opts.label ?? 'retry';

  if (maxRetries < 1) return null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (attempt === maxRetries) {
        console.error(`[${label}] all ${maxRetries} attempts failed:`, e);
        return null;
      }
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * jitterMs;
      opts.onRetry?.({ attempt, maxRetries, error: e, delayMs: delay });
      console.warn(
        `[${label}] attempt ${attempt}/${maxRetries} failed: ${
          e instanceof Error ? e.message : e
        }. Retrying in ${Math.round(delay)}ms`
      );
      await Bun.sleep(delay);
    }
  }
  return null;
}
