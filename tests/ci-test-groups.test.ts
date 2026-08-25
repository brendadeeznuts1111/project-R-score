import { describe, expect, test } from 'bun:test';
import {
  CI_RESERVED_TEST_GROUPS,
  auditReservedTestGroups,
  type CiTestGroup,
} from '../lib/harness/ci-test-groups.ts';
import { TEST_SNAPSHOT_SUITES } from '../lib/portal/bun-test-snapshots.ts';

describe('CI reserved test ownership baseline', () => {
  test('every reserved group has a stable owner, repair command, and paths', () => {
    for (const group of CI_RESERVED_TEST_GROUPS) {
      expect(group.owner.trim(), group.id).not.toBe('');
      expect(group.repair.trim(), group.id).not.toBe('');
      expect(group.paths.length, group.id).toBeGreaterThan(0);
    }
  });

  test('current reserved groups have no explicit path overlap', () => {
    const audit = auditReservedTestGroups();
    expect(audit.missingOwners).toEqual([]);
    expect(audit.missingRepairs).toEqual([]);
    expect(audit.duplicatePaths).toEqual([]);
  });

  test('snapshot ownership follows the snapshot catalog instead of a copied list', () => {
    const snapshots = CI_RESERVED_TEST_GROUPS.find(group => group.id === 'snapshot-contract');
    expect(snapshots?.paths).toEqual(TEST_SNAPSHOT_SUITES.map(suite => suite.testRel));
  });

  test('the audit identifies overlap in a proposed group change', () => {
    const proposed: CiTestGroup[] = [
      {
        id: 'runtime-boundary',
        owner: 'one',
        repair: 'bun test tests/example.test.ts',
        paths: ['tests/example.test.ts'],
      },
      {
        id: 'channel-contract',
        owner: 'two',
        repair: 'bun test tests/example.test.ts',
        paths: ['tests/example.test.ts'],
      },
    ];
    expect(auditReservedTestGroups(proposed).duplicatePaths).toEqual([
      {
        path: 'tests/example.test.ts',
        groups: ['runtime-boundary', 'channel-contract'],
      },
    ]);
  });
});
