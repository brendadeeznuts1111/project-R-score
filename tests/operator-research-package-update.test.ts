import { describe, expect, test } from 'bun:test';
import {
  hashLockfile,
  parseOutdatedTable,
  getPackageSnapshot,
} from '../lib/operator-research/package-update.ts';

describe('package-update desk API helpers', () => {
  test('parseOutdatedTable extracts name/current/latest + strips (dev)', () => {
    const rows = parseOutdatedTable(`
| Package | Current | Update | Latest | Workspace |
|---------|---------|--------|--------|-----------|
| zod | 3.23.0 | 3.23.0 | 4.4.3 | factorywager-enterprise |
| eslint (dev) | 9.39.4 | 9.39.4 | 10.8.0 | factorywager-enterprise |
`);
    expect(rows).toHaveLength(2);
    expect(rows[0]!.name).toBe('zod');
    expect(rows[0]!.latest).toBe('4.4.3');
    expect(rows[1]!.name).toBe('eslint');
    expect(rows[1]!.typeHint).toContain('dev');
  });

  test('hashLockfile returns sha256 prefix', async () => {
    const { hash } = await hashLockfile();
    expect(hash.startsWith('sha256-') || hash === 'missing').toBe(true);
  });

  test('getPackageSnapshot returns outdated deps from bun outdated', async () => {
    const snap = await getPackageSnapshot({});
    expect(snap.ok).toBe(true);
    expect(snap.lockfileHash).toMatch(/^sha256-/);
    expect(Array.isArray(snap.dependencies)).toBe(true);
    expect(snap.bun).toBeTruthy();
    if (snap.dependencies.length) {
      const d = snap.dependencies[0]!;
      expect(d.name).toBeTruthy();
      expect(d.current).toBeTruthy();
      expect(d.latest).toBeTruthy();
      expect(d.range).toBeTruthy();
    }
  }, 60_000);
});
