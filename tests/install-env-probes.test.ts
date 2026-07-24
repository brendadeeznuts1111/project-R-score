// @see https://bun.com/docs/test/index#run-tests
// @see https://bun.com/docs/pm/cli/install#configuring-with-environment-variables
import { describe, expect, test } from 'bun:test';
import { CANONICAL_INSTALL_ENV_TOKENS } from '../tools/bun-doc-refs.ts';
import { BUN_CONFIG_INSTALL_VARS } from '../tools/bun-install-env.ts';
import { runInstallEnvVerification } from '../lib/verification/install-env-probes.ts';

describe('lib/verification/install-env-probes', () => {
  test('CANONICAL_INSTALL_ENV_TOKENS carries descriptions for all six vars', () => {
    for (const row of BUN_CONFIG_INSTALL_VARS) {
      const token = CANONICAL_INSTALL_ENV_TOKENS[row.name];
      expect(token?.description).toBe(row.description);
      expect(token?.url).toContain('#configuring-with-environment-variables');
    }
    expect(CANONICAL_INSTALL_ENV_TOKENS['install.scopes']?.url).toContain('#install-registry');
  });

  test(
    'runInstallEnvVerification passes all BUN_CONFIG_* probes, scoped registry, and read plane',
    async () => {
      const report = await runInstallEnvVerification();
      expect(report.results.length).toBe(8);
      for (const row of report.results) {
        expect(row.canonical).toBeTruthy();
        expect(row._links?.docs).toBe(row.canonical);
        expect(row.passed).toBe(true);
      }
      const scoped = report.results.find(r => r.envVar === 'install.scopes');
      expect(scoped?.lane).toBeTruthy();
      expect(report.ok).toBe(true);
    },
    { timeout: 120_000 }
  );
});
