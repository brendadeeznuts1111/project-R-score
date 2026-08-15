import { describe, expect, expectTypeOf, test } from 'bun:test';
import {
  BUN_REMEDIATION_CATALOG,
  formatBunMessage,
  getBunRemediationEntry,
  getRemediationByModule,
  getRemediationByPattern,
  mapRuleToRemediation,
  randomBunRemediation,
  searchBunRemediations,
  type BunRemediationEntry,
} from '../config/bun-remediation-catalog.ts';
import { computeBunDocsCoverage } from '../tools/bun-docs-coverage.ts';

describe('Bun remediation catalog contract', () => {
  test('has stable, complete entries', () => {
    expect(BUN_REMEDIATION_CATALOG).toHaveLength(38);
    expect(new Set(BUN_REMEDIATION_CATALOG.map(entry => entry.id)).size).toBe(
      BUN_REMEDIATION_CATALOG.length
    );

    for (const entry of BUN_REMEDIATION_CATALOG) {
      expect(entry.id).toMatch(/^[a-z][a-zA-Z0-9]*(?:[.-][a-zA-Z0-9]+)+$/);
      expect(entry.summary.trim()).not.toBe('');
      expect(entry.good.trim()).not.toBe('');
      expect(entry.docs).toMatch(/^https:\/\/bun\.com\/(?:docs|blog|reference)\//);
      expect(['error', 'warn', 'info']).toContain(entry.severity);
      if (entry.fixTier) expect(['easy', 'medium', 'hard']).toContain(entry.fixTier);
    }
  });

  test('lookup, search, module, pattern, and rule mappings share the same entries', () => {
    const read = getBunRemediationEntry('file.read');
    expectTypeOf(read).toEqualTypeOf<BunRemediationEntry | undefined>();
    expect(read?.good).toContain('Bun.file');
    expect(getRemediationByModule('node:fs')?.id).toBe('file.read');
    expect(getRemediationByPattern('writeFileSync(path, data)')?.id).toBe('file.write');
    expect(mapRuleToRemediation('no-restricted-imports', 'Avoid "node:fs"')).toBe('file.read');
    expect(searchBunRemediations('glob').map(entry => entry.id)).toContain('file.glob');
    expect(BUN_REMEDIATION_CATALOG).toContain(randomBunRemediation());
  });

  test('formatted advice and docs coverage stay canonical', async () => {
    const message = formatBunMessage('tty.color');
    expect(message).toContain('Bun.color');
    expect(message).toContain('https://bun.com/docs/runtime/color#flexible-input');

    const coverage = await computeBunDocsCoverage({
      skipRepoScan: true,
      skipLinkScan: true,
    });
    expect(coverage.groups.remediation.canonical.hit).toBe(BUN_REMEDIATION_CATALOG.length);
    expect(coverage.groups.remediation.canonical.missing).toBeUndefined();
  });
});

describe('bun:remediation CLI', () => {
  test('is wired through the package scripts without a duplicate MCP surface', async () => {
    const root = new URL('..', import.meta.url);
    const packageJson = (await Bun.file(new URL('package.json', root)).json()) as {
      scripts?: Record<string, string>;
    };
    expect(packageJson.scripts?.['bun:remediation']).toBe(
      'bun run scripts/bun-remediation-cli.ts'
    );
    expect(await Bun.file(new URL('scripts/dx-mcp.ts', root)).exists()).toBe(false);
  });

  test('publishes the catalog as machine-readable JSON', () => {
    const proc = Bun.spawnSync(['bun', 'run', 'bun:remediation', '--json'], {
      cwd: new URL('..', import.meta.url).pathname,
      stdout: 'pipe',
      stderr: 'pipe',
    });

    expect(proc.exitCode).toBe(0);
    const entries = JSON.parse(proc.stdout.toString()) as BunRemediationEntry[];
    expect(entries).toHaveLength(BUN_REMEDIATION_CATALOG.length);
    expect(entries.some(entry => entry.id === 'runtime.inspect')).toBe(true);
  });

  test('fails closed for an unknown entry', () => {
    const proc = Bun.spawnSync(['bun', 'run', 'bun:remediation', 'not.a.real.entry'], {
      cwd: new URL('..', import.meta.url).pathname,
      stdout: 'pipe',
      stderr: 'pipe',
    });

    expect(proc.exitCode).not.toBe(0);
    expect(proc.stderr.toString()).toContain('Unknown entry: not.a.real.entry');
  });
});
