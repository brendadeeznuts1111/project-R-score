// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import {
  releasePreviewRows,
  releasePreviewRowsBySubsystem,
} from '../lib/verification/release-preview.ts';

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

  test('releasePreviewRowsBySubsystem diversifies subsystems', () => {
    const rows = [
      ...Array.from({ length: 10 }, (_, i) => ({
        name: `runtime-${i}`,
        subsystem: 'runtime' as const,
        expected: 'ok',
        actual: 'ok',
        passed: true,
      })),
      {
        name: 'bundler:loader.css',
        subsystem: 'bundler' as const,
        expected: 'ok',
        actual: 'ok',
        passed: true,
      },
      {
        name: 'networking:Health',
        subsystem: 'networking' as const,
        expected: 'ok',
        actual: 'ok',
        passed: true,
      },
    ];
    const preview = releasePreviewRowsBySubsystem(rows, 2, 8);
    const subs = new Set(preview.map(r => r.subsystem));
    expect(subs.has('runtime')).toBe(true);
    expect(subs.has('bundler')).toBe(true);
    expect(subs.has('networking')).toBe(true);
    expect(preview.length).toBeLessThanOrEqual(8);
  });
});
