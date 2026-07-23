// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import {
  describeUpgrade,
  mintSnapshotVersion,
  nextUpgradeTag,
  promoteProofPackage,
  resolveSnapshotPhase,
  tagsForPhase,
  upsertProofPackageRelease,
  type ProofPackagesIndex,
} from '../lib/registry-tags.ts';

describe('registry-tags', () => {
  test('mintSnapshotVersion is monotonic-ish ISO stamp', () => {
    const v = mintSnapshotVersion(new Date('2026-07-23T18:00:00.000Z'));
    expect(v.startsWith('0.0.0+20260723T18000')).toBe(true);
  });

  test('tagsForPhase pre vs post', () => {
    expect(tagsForPhase('pre')).toEqual(['pre', 'latest']);
    expect(tagsForPhase('post')).toEqual(['post', 'latest']);
    expect(tagsForPhase('post', { pinStable: true })).toContain('stable');
  });

  test('nextUpgradeTag path', () => {
    expect(nextUpgradeTag('pre')).toBe('post');
    expect(nextUpgradeTag('post')).toBe('stable');
    expect(nextUpgradeTag('latest')).toBe('stable');
    expect(nextUpgradeTag('stable')).toBeNull();
  });

  test('resolveSnapshotPhase', () => {
    expect(resolveSnapshotPhase('post')).toBe('post');
    expect(resolveSnapshotPhase('pre')).toBe('pre');
    expect(resolveSnapshotPhase(undefined)).toBe('pre');
  });

  test('pre does not clobber existing post on latest', () => {
    let index: ProofPackagesIndex = {
      schemaVersion: 1,
      lastUpdated: '',
      packages: {},
    };
    index = upsertProofPackageRelease(index, '@factorywager/routing-test', '0.0.0+a', {
      phase: 'post',
      path: 'public/registry/@factorywager/routing-test/latest.json',
      proofHash: 'aaa',
    });
    index = upsertProofPackageRelease(index, '@factorywager/routing-test', '0.0.0+b', {
      phase: 'pre',
      path: 'public/registry/@factorywager/routing-test/latest.json',
      proofHash: 'bbb',
    });
    const tags = index.packages['@factorywager/routing-test']!['dist-tags'];
    expect(tags.pre).toBe('0.0.0+b');
    expect(tags.post).toBe('0.0.0+a');
    expect(tags.latest).toBe('0.0.0+a'); // stays on post
  });

  test('promoteProofPackage moves pre → post', () => {
    let index: ProofPackagesIndex = {
      schemaVersion: 1,
      lastUpdated: '',
      packages: {},
    };
    index = upsertProofPackageRelease(index, '@factorywager/bun-utils-test', '0.0.0+c', {
      phase: 'pre',
      path: 'x',
      proofHash: 'ccc',
    });
    index = promoteProofPackage(index, '@factorywager/bun-utils-test');
    const tags = index.packages['@factorywager/bun-utils-test']!['dist-tags'];
    expect(tags.post).toBe('0.0.0+c');
    expect(tags.latest).toBe('0.0.0+c');
  });

  test('describeUpgrade recommends promote', () => {
    let index: ProofPackagesIndex = {
      schemaVersion: 1,
      lastUpdated: '',
      packages: {},
    };
    index = upsertProofPackageRelease(index, '@factorywager/registry-snapshot', '0.0.0+d', {
      phase: 'pre',
      path: 'y',
    });
    const u = describeUpgrade(index, '@factorywager/registry-snapshot', 'pre');
    expect(u.action).toBe('promote');
    expect(u.toTag).toBe('post');
  });
});
