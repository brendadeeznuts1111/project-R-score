// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/test/snapshots — Bun Snapshot v1 inventory
/**
 * SSOT integrity for committed bun:test snapshots.
 * Does not update snaps — only checks catalog ↔ disk.
 */
import { describe, expect, test } from 'bun:test';
import { joinPath } from '../lib/path-bun.ts';
import {
  BUN_SNAPSHOT_HEADER,
  checkTestSnapshots,
  countMatchSnapshotCalls,
  isBunSnapshotHeader,
  parseSnapExportKeys,
  TEST_SNAPSHOT_SUITES,
  bunTestArgsForSuites,
} from '../lib/portal/bun-test-snapshots.ts';

const ROOT = joinPath(import.meta.dir, '..');

describe('test-snapshots SSOT', () => {
  test('catalog has unique ids and snap paths', () => {
    const ids = TEST_SNAPSHOT_SUITES.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    const snaps = TEST_SNAPSHOT_SUITES.map(s => s.snapRel);
    expect(new Set(snaps).size).toBe(snaps.length);
    expect(TEST_SNAPSHOT_SUITES.some(s => s.id === 'capability-map')).toBe(true);
    expect(TEST_SNAPSHOT_SUITES.some(s => s.id === 'partner-cli')).toBe(true);
    expect(TEST_SNAPSHOT_SUITES.some(s => s.id === 'vault-health')).toBe(true);
  });

  test('parseSnapExportKeys reads Bun Snapshot v1 exports', () => {
    const sample = `${BUN_SNAPSHOT_HEADER}

exports[\`suite name 1\`] = \`
{
  "a": 1,
}
\`;
exports[\`other 1\`] = \`"x"\`;
`;
    expect(isBunSnapshotHeader(sample)).toBe(true);
    expect(parseSnapExportKeys(sample)).toEqual(['suite name 1', 'other 1']);
  });

  test('bunTestArgsForSuites is always file-scoped', () => {
    const suites = TEST_SNAPSHOT_SUITES.filter(s => s.id === 'capability-map');
    const args = bunTestArgsForSuites(suites, true);
    expect(args[0]).toBe('test');
    expect(args).toContain('tests/capability-map-subset.test.ts');
    expect(args).toContain('-u');
    // never bare repo-wide update without file paths
    expect(args.indexOf('test') + 1).not.toBe(args.indexOf('-u'));

    const runArgs = bunTestArgsForSuites(suites, false);
    expect(runArgs).toEqual(['test', 'tests/capability-map-subset.test.ts']);
    expect(runArgs).not.toContain('-u');
  });

  test('countMatchSnapshotCalls counts matchers', () => {
    expect(countMatchSnapshotCalls('expect(x).toMatchSnapshot();\nexpect(y).toMatchSnapshot();')).toBe(
      2
    );
    expect(countMatchSnapshotCalls('expect(() => f()).toThrowErrorMatchingSnapshot()')).toBe(1);
  });

  test('checkTestSnapshots passes for repo inventory', async () => {
    const report = await checkTestSnapshots(ROOT, '2026-07-28T00:00:00.000Z');
    if (!report.ok) {
      const errs = report.findings.filter(f => f.severity === 'error');
      throw new Error(
        `check:snapshots failed:\n${errs.map(e => `  ${e.code} ${e.path}: ${e.detail}`).join('\n')}`
      );
    }
    expect(report.ok).toBe(true);
    expect(report.suiteCount).toBe(TEST_SNAPSHOT_SUITES.length);
    // every catalog suite inventory exists with entries
    for (const suite of TEST_SNAPSHOT_SUITES) {
      const inv = report.inventories.find(i => i.rel === suite.snapRel);
      expect(inv?.exists).toBe(true);
      expect(inv?.headerOk).toBe(true);
      expect((inv?.entryCount ?? 0) > 0).toBe(true);
      const src = await Bun.file(`${ROOT}/${suite.testRel}`).text();
      expect(countMatchSnapshotCalls(src)).toBe(inv!.entryCount);
    }
    // no entry-count-mismatch findings
    expect(report.findings.some(f => f.code === 'entry-count-mismatch')).toBe(false);
  });
});
