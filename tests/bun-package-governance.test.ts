import { describe, expect, test } from 'bun:test';
import { buildPackageDiffCommand } from '../tools/bun-package-governance-cli.ts';
import { parseLicenseInventory } from '../tools/bun-package-governance.ts';

describe('Bun 1.4 package governance', () => {
  test('normalizes machine-specific Bun license output without retaining paths', () => {
    const summary = parseLicenseInventory(
      {
        MIT: [
          {
            name: 'alpha',
            versions: ['1.0.0', '1.1.0'],
            paths: ['/private/machine/path'],
            license: 'MIT',
          },
        ],
        'Apache-2.0': [
          { name: 'beta', versions: ['2.0.0'], paths: ['/elsewhere'], license: 'Apache-2.0' },
        ],
      },
      '1.4.0'
    );

    expect(summary.bunVersion).toBe('1.4.0');
    expect(summary.licenses).toEqual([
      { license: 'Apache-2.0', packages: 1, versions: 1 },
      { license: 'MIT', packages: 1, versions: 2 },
    ]);
    expect(summary.totals).toEqual({ licenses: 2, packages: 2, uniquePackages: 2, versions: 3 });
    expect(JSON.stringify(summary)).not.toContain('/private/');
  });

  test('keeps unknown and unlicensed labels in an explicit review queue', () => {
    const summary = parseLicenseInventory({
      UNKNOWN: [{ name: 'mystery', versions: ['1.0.0'], license: 'UNKNOWN' }],
      UNLICENSED: [{ name: 'private-package', versions: ['2.0.0'], license: 'UNLICENSED' }],
    });
    expect(summary.reviewRequired).toEqual([
      { license: 'UNKNOWN', packages: ['mystery'] },
      { license: 'UNLICENSED', packages: ['private-package'] },
    ]);
  });

  test('rejects malformed or mismatched native output', () => {
    expect(() => parseLicenseInventory([])).toThrow('expected a JSON object');
    expect(() =>
      parseLicenseInventory({ MIT: [{ name: 'alpha', versions: [], license: 'MIT' }] })
    ).toThrow('has no versions');
    expect(() =>
      parseLicenseInventory({ MIT: [{ name: 'alpha', versions: ['1.0.0'], license: 'ISC' }] })
    ).toThrow('reports ISC');
  });

  test('builds bun pm diff as an argument array without shell interpolation', () => {
    expect(buildPackageDiffCommand(['react-dom@18.2.0', '18.3.1', '*.min.js'], '/bun')).toEqual([
      '/bun',
      'pm',
      'diff',
      'react-dom@18.2.0',
      '18.3.1',
      '*.min.js',
    ]);
    expect(() => buildPackageDiffCommand([])).toThrow('requires at least one');
  });
});
