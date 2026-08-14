// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import {
  assertOutputDirInRepo,
  BUN_RELEASE_CONTRACTS_ALLOWED_LONG,
  runCli,
} from '../packages/bun-release-contracts/src/cli.ts';
import { ALLOWED_LONG_REGISTRY } from '../lib/docs/ref-id-tool-flags.ts';

describe('bun:release-contracts CLI', () => {
  test('registry key matches exported allowlist', () => {
    expect(ALLOWED_LONG_REGISTRY['bun:release-contracts']).toBe(BUN_RELEASE_CONTRACTS_ALLOWED_LONG);
    expect([...BUN_RELEASE_CONTRACTS_ALLOWED_LONG]).toEqual(
      expect.arrayContaining(['json', 'check', 'all', 'output-dir', 'force', 'help'])
    );
  });

  test('rejects unknown long options', async () => {
    await expect(runCli(['--typo'])).rejects.toThrow(/unknown flag/);
  });

  test('assertOutputDirInRepo rejects escapes unless --force', async () => {
    await expect(assertOutputDirInRepo('/tmp/outside-contracts')).rejects.toThrow(
      /repository root/
    );
    // macOS maps /tmp → /private/tmp via realpath; assertPathInRepo returns the resolved path.
    const forced = await assertOutputDirInRepo('/tmp/outside-contracts', { force: true });
    expect(forced.endsWith('/outside-contracts')).toBe(true);
    expect(forced.includes('..')).toBe(false);
    // Same path whether caller used /tmp or the platform realpath form.
    const again = await assertOutputDirInRepo(forced, { force: true });
    expect(again).toBe(forced);
  });

  test('check --json returns a dual-mode summary for a committed inventory', async () => {
    // Pin to a committed inventory version so the suite survives Bun tip drift.
    const summary = await runCli(['1.3.14', '--check', '--json']);
    expect(summary).toBeDefined();
    expect(summary!.mode).toBe('check');
    expect(summary!.releases.length).toBe(1);
    expect(summary!.releases[0]!.version).toBe('1.3.14');
    expect(summary!.releases[0]!.status).toBe('verified');
    expect(summary!.releases[0]!.path).toContain('bun-v1.3.14.json');
    expect(summary!.releases[0]!.itemCount).toBeGreaterThan(0);
    expect(summary!.index.path).toContain('index.json');
    expect(summary!.index.releaseCount).toBeGreaterThan(0);
  });

  test('--output-dir outside the repo fails without --force', async () => {
    await expect(runCli(['1.3.14', '--check', '--output-dir', '/tmp/outside-contracts'])).rejects.toThrow(
      /repository root/
    );
  });

  test('strips unknown long options when BUN_STRIP_UNKNOWN=true', async () => {
    const prev = Bun.env.BUN_STRIP_UNKNOWN;
    Bun.env.BUN_STRIP_UNKNOWN = 'true';
    try {
      // --typo stripped; --help remains and short-circuits before network I/O.
      const summary = await runCli(['--typo', '--help']);
      expect(summary).toBeUndefined();
    } finally {
      if (prev === undefined) delete Bun.env.BUN_STRIP_UNKNOWN;
      else Bun.env.BUN_STRIP_UNKNOWN = prev;
    }
  });
});
