/**
 * Bun.$ throws on nonzero exit by default.
 * .nothrow() yields the result object with exitCode instead.
 *
 * Note: expect(...).rejects hangs on Bun.$ ShellPromise — use try/catch.
 *
 * @see https://bun.com/docs/runtime/shell#error-handling
 */
import { describe, expect, test } from 'bun:test';

describe('bun-shell error-handling', () => {
  test('nonzero exit throws by default', async () => {
    let threw = false;
    try {
      await Bun.$`false`.quiet();
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });

  test('.nothrow() exposes exitCode without throwing', async () => {
    const result = await Bun.$`false`.nothrow().quiet();
    expect(result.exitCode).not.toBe(0);
  });

  test('success exit does not throw', async () => {
    const result = await Bun.$`true`.quiet();
    expect(result.exitCode).toBe(0);
  });
});
