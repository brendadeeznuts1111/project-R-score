import { describe, test, expect } from 'bun:test';
import { filterPackages, type WorkspacePackage } from '../lib/filter-runner';

function pkg(name: string): WorkspacePackage {
  return { name, path: `/fake/${name}`, version: '1.0.0' };
}

describe('filterPackages', () => {
  const packages = [
    pkg('@scope/core'),
    pkg('@scope/utils'),
    pkg('@scope/cli'),
    pkg('standalone'),
    pkg('other-lib'),
  ];

  test('exact name match', async () => {
    const result = await filterPackages(packages, 'standalone');
    expect(result.map(p => p.name)).toEqual(['standalone']);
  });

  test('glob pattern match', async () => {
    const result = await filterPackages(packages, '@scope/*');
    expect(result.map(p => p.name).sort()).toEqual([
      '@scope/cli',
      '@scope/core',
      '@scope/utils',
    ]);
  });

  test('negation pattern excludes from wildcard set', async () => {
    // `!standalone` sets filterPattern='*' internally.
    // Bun's Glob('*') does NOT match names with '/' (scoped packages).
    const result = await filterPackages(packages, '!standalone');
    const names = result.map(p => p.name);
    expect(names).not.toContain('standalone');
    // '*' only matches non-scoped names: 'standalone' and 'other-lib', minus 'standalone'
    expect(names).toContain('other-lib');
  });

  test('no match returns empty array', async () => {
    const result = await filterPackages(packages, 'nonexistent');
    expect(result).toEqual([]);
  });

  test('wildcard * matches non-scoped packages', async () => {
    // Bun's Glob('*') does not match '/' in names
    const result = await filterPackages(packages, '*');
    const names = result.map(p => p.name);
    expect(names).toContain('standalone');
    expect(names).toContain('other-lib');
    expect(names.length).toBe(2);
  });

  test('multiple patterns separated by space', async () => {
    const result = await filterPackages(packages, 'standalone other-lib');
    const names = result.map(p => p.name);
    expect(names).toContain('standalone');
    expect(names).toContain('other-lib');
    expect(names.length).toBe(2);
  });

  test('scoped glob pattern with negation', async () => {
    const result = await filterPackages(packages, '@scope/* !@scope/cli');
    const names = result.map(p => p.name);
    expect(names).toContain('@scope/core');
    expect(names).toContain('@scope/utils');
    expect(names).not.toContain('@scope/cli');
  });

  test('empty packages returns empty', async () => {
    const result = await filterPackages([], '*');
    expect(result).toEqual([]);
  });
});
