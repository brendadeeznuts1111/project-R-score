// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import { releasePreviewRows } from '../lib/verification/release-preview.ts';

describe('lib/verification/release-preview', () => {
  test('drops install platform duplicate rows from release preview', () => {
    const rows = [
      { name: 'Bun.Image terminal methods', subsystem: 'runtime' },
      { name: 'install platform: bun-binary-resolved', subsystem: 'package-manager' },
      { name: '--no-orphans support', subsystem: 'package-manager' },
      { name: 'install platform: runtime-flags', subsystem: 'package-manager' },
    ];
    const preview = releasePreviewRows(rows);
    expect(preview.map(r => r.name)).toEqual([
      'Bun.Image terminal methods',
      '--no-orphans support',
    ]);
  });

  test('returns empty array for undefined input', () => {
    expect(releasePreviewRows(undefined)).toEqual([]);
  });
});
