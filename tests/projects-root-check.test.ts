import { describe, expect, test } from 'bun:test';
import {
  auditProjectRoots,
  validateProjectBunContract,
  type ProjectLeaf,
} from '../tools/projects-root-check.ts';

const ACTIVE_LEAF: ProjectLeaf = { tier: 'active', path: 'projects/active/example' };

describe('projects root Bun contract', () => {
  test('requires a compatible Bun engine and independent lockfile for active products', () => {
    expect(
      validateProjectBunContract({
        leaf: ACTIVE_LEAF,
        manifest: { dependencies: { example: '1.0.0' } },
        reviewedBunVersion: '1.3.14',
        rootWorkspace: false,
        lockfiles: [],
      }).map(finding => finding.kind)
    ).toEqual(['missing-bun-engine', 'missing-bun-lock']);
  });

  test('accepts an inherited root lock and a range compatible with the repository runtime', () => {
    expect(
      validateProjectBunContract({
        leaf: ACTIVE_LEAF,
        manifest: { engines: { bun: '>=1.3.8' }, dependencies: { example: '1.0.0' } },
        reviewedBunVersion: '1.3.14',
        rootWorkspace: true,
        lockfiles: [],
      })
    ).toEqual([]);
  });

  test('rejects incompatible runtimes and foreign package-manager artifacts', () => {
    expect(
      validateProjectBunContract({
        leaf: ACTIVE_LEAF,
        manifest: { engines: { bun: '>=2.0.0' }, packageManager: 'yarn@4.12.0' },
        reviewedBunVersion: '1.3.14',
        rootWorkspace: false,
        lockfiles: ['yarn.lock'],
      }).map(finding => finding.kind)
    ).toEqual(['unsupported-bun-engine', 'foreign-package-manager', 'foreign-lockfile']);
  });

  test('keeps archive products frozen instead of forcing runtime modernization', () => {
    expect(
      validateProjectBunContract({
        leaf: { tier: 'archive', path: 'projects/archive/example' },
        manifest: { packageManager: 'yarn@1.22.0', dependencies: { example: '1.0.0' } },
        reviewedBunVersion: '1.3.14',
        rootWorkspace: false,
        lockfiles: ['yarn.lock'],
      })
    ).toEqual([]);
  });

  test('the checked-in active product set satisfies the contract', async () => {
    const report = await auditProjectRoots();
    expect(report.issues).toEqual([]);
    expect(report.leaves.some(leaf => leaf.tier === 'experimental')).toBe(true);
    expect(report.leaves.some(leaf => leaf.tier === 'archive')).toBe(true);
  });
});
