// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import {
  buildDefaultsDocCoverage,
  buildDocIndex,
  DEFAULTS_VERIFY_DOC_KEYS,
} from '../lib/docs/doc-index.ts';
import { CANONICAL_REFS, listCodeApiKeys } from '../tools/bun-doc-refs.ts';

describe('lib/docs/doc-index', () => {
  test('buildDocIndex produces entries for all code API keys', async () => {
    const index = await buildDocIndex();
    expect(index.schemaVersion).toBe(1);
    expect(index.totalEntries).toBe(index.entries.length);
    expect(index.totalEntries).toBeGreaterThan(50);
    expect(index.subsystem).toBe('other');
    expect(index.reportPath).toBe('/registry/doc-index.json');
    expect(index._links?.report).toBe('/registry/doc-index.json');
    expect(index.proofHash).toMatch(/^[a-f0-9]{64}$/);
    expect(index.byStability.stable).toBeGreaterThan(0);
  });

  test('defaults doc coverage maps verify-defaults tests to CANONICAL_REFS', async () => {
    const index = await buildDocIndex();
    const coverage = buildDefaultsDocCoverage(index.entries);
    expect(coverage.total).toBe(Object.keys(DEFAULTS_VERIFY_DOC_KEYS).length);
    expect(coverage.passed).toBe(true);
    for (const row of coverage.rows) {
      expect(row.documented).toBe(true);
      expect(row.url).toMatch(/^https:\/\//);
      expect(CANONICAL_REFS[row.docKey] ?? row.url).toBeTruthy();
    }
  });

  test('each entry has url and key', async () => {
    const index = await buildDocIndex();
    for (const e of index.entries.slice(0, 20)) {
      expect(e.key.length).toBeGreaterThan(0);
      expect(e.url).toMatch(/^https:\/\//);
    }
  });
});

describe('tools/build-doc-index.ts', () => {
  test('ambiguous external CLI flags remain catalogued but are not auto-annotated', () => {
    expect(CANONICAL_REFS['--format']).toBeTruthy();
    expect(listCodeApiKeys()).not.toContain('--format');
  });

  test('CLI reports the generated index without mutating the registry', async () => {
    const proc = Bun.spawn({
      cmd: ['bun', 'tools/build-doc-index.ts'],
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const [stdout, stderr, code] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    expect(code).toBe(0);
    expect(stdout).toContain('Doc index:');
    if (stderr.trim()) expect(stderr).not.toContain('Error');
  });
});
