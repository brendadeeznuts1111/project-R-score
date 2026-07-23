// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import { withRetry } from '../lib/retry.ts';

describe('withRetry', () => {
  test('returns value after transient failures', async () => {
    let n = 0;
    const r = await withRetry(
      async () => {
        n++;
        if (n < 3) throw new Error('transient');
        return 42;
      },
      { maxRetries: 3, baseDelayMs: 5, jitterMs: 0 }
    );
    expect(r).toBe(42);
    expect(n).toBe(3);
  });

  test('returns null when all attempts fail', async () => {
    const r = await withRetry(
      async () => {
        throw new Error('always');
      },
      { maxRetries: 2, baseDelayMs: 5, jitterMs: 0 }
    );
    expect(r).toBeNull();
  });
});
