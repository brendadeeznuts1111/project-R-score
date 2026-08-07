// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import {
  BUN_RELEASE_CONTRACTS_ALLOWED_LONG,
  runCli,
} from '../packages/bun-release-contracts/src/cli.ts';
import { ALLOWED_LONG_REGISTRY } from '../lib/docs/ref-id-tool-flags.ts';

describe('bun:release-contracts CLI', () => {
  test('registry key matches exported allowlist', () => {
    expect(ALLOWED_LONG_REGISTRY['bun:release-contracts']).toBe(BUN_RELEASE_CONTRACTS_ALLOWED_LONG);
    expect([...BUN_RELEASE_CONTRACTS_ALLOWED_LONG]).toEqual(
      expect.arrayContaining(['json', 'check', 'all', 'output-dir', 'help'])
    );
  });

  test('rejects unknown long options', async () => {
    await expect(runCli(['--typo'])).rejects.toThrow(/unknown flag/);
  });

  test('check --json returns a dual-mode summary for the installed Bun version', async () => {
    const summary = await runCli([Bun.version, '--check', '--json']);
    expect(summary).toBeDefined();
    expect(summary!.mode).toBe('check');
    expect(summary!.bunVersion).toBe(Bun.version);
    expect(summary!.releases.length).toBe(1);
    expect(summary!.releases[0]!.status).toBe('verified');
    expect(summary!.releases[0]!.itemCount).toBeGreaterThan(0);
    expect(summary!.index.releaseCount).toBeGreaterThan(0);
  });
});
