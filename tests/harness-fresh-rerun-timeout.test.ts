/**
 * freshRerun spawn timeout — fail closed when a catalog command hangs.
 * @see lib/harness/maintenance.ts
 */
import { describe, expect, test } from 'bun:test';
import {
  DEFAULT_FRESH_RERUN_TIMEOUT_MS,
  freshRerunTimeoutMs,
  runFreshRerunCommand,
} from '../lib/harness/maintenance';
import { joinPath } from '../lib/path-bun';

const ROOT = joinPath(import.meta.dir, '..');

describe('freshRerun timeout', () => {
  test('freshRerunTimeoutMs defaults to 120s when unset', () => {
    expect(DEFAULT_FRESH_RERUN_TIMEOUT_MS).toBe(120_000);
    if (!Bun.env.HARNESS_FRESH_RERUN_TIMEOUT_MS) {
      expect(freshRerunTimeoutMs()).toBe(DEFAULT_FRESH_RERUN_TIMEOUT_MS);
    }
  });

  test('runFreshRerunCommand times out a hung sleep', async () => {
    const { code, timedOut } = await runFreshRerunCommand('sleep 30', ROOT, {
      timeoutMs: 250,
    });
    expect(timedOut).toBe(true);
    expect(code).toBe(124);
  }, 10_000);

  test('runFreshRerunCommand exits 0 for a fast command', async () => {
    const { code, timedOut } = await runFreshRerunCommand('bun -e console.log(1)', ROOT, {
      timeoutMs: 10_000,
    });
    expect(timedOut).toBeUndefined();
    expect(code).toBe(0);
  }, 10_000);
});
