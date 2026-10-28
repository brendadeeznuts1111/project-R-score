import { describe, expect, test } from 'bun:test';
import { parsePackageDependencyRecords } from '../lib/registry/package-dependencies.ts';

describe('package dependency registry contract', () => {
  test('preserves runtime, development, optional, peer, and optional-peer planes', () => {
    expect(
      parsePackageDependencyRecords({
        dependencies: { alpha: '^1.0.0' },
        devDependencies: { bravo: '~2.0.0' },
        optionalDependencies: { charlie: '3.x' },
        peerDependencies: { delta: '>=4', echo: '^5' },
        peerDependenciesMeta: { echo: { optional: true } },
      })
    ).toEqual([
      { packageName: 'alpha', range: '^1.0.0', kind: 'runtime' },
      { packageName: 'bravo', range: '~2.0.0', kind: 'development' },
      { packageName: 'charlie', range: '3.x', kind: 'optional' },
      { packageName: 'delta', range: '>=4', kind: 'peer', peer: { optional: false } },
      { packageName: 'echo', range: '^5', kind: 'peer', peer: { optional: true } },
    ]);
  });

  test('is deterministic without collapsing the same name across planes', () => {
    const parsed = parsePackageDependencyRecords({
      optionalDependencies: { same: '2' },
      dependencies: { same: '1' },
    });
    expect(parsed).toEqual([
      { packageName: 'same', range: '1', kind: 'runtime' },
      { packageName: 'same', range: '2', kind: 'optional' },
    ]);
  });

  test('rejects malformed dependency ranges and orphan peer metadata', () => {
    expect(() => parsePackageDependencyRecords({ dependencies: { alpha: 1 } })).toThrow(
      'nonempty dependency range'
    );
    expect(() =>
      parsePackageDependencyRecords({ peerDependenciesMeta: { alpha: { optional: true } } })
    ).toThrow('no matching peer dependency');
    expect(() =>
      parsePackageDependencyRecords({
        peerDependencies: { alpha: '*' },
        peerDependenciesMeta: { alpha: { optional: 'true' } },
      })
    ).toThrow('optional:boolean');
  });
});
