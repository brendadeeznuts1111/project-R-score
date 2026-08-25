import { describe, expect, test } from 'bun:test';
import { parseFileRemovalArgs } from '../tools/file-removal-candidates.ts';

describe('file removal CLI', () => {
  test('defaults are conservative and reports stay ignored', () => {
    const parsed = parseFileRemovalArgs(['--write', '--limit', '12', '--action', 'split']);
    expect(parsed.writePath).toBe('reports/file-removal-candidates.json');
    expect(parsed.limit).toBe(12);
    expect(parsed.duplicateByteThreshold).toBe(4096);
    expect(parsed.action).toBe('split');
  });

  test('rejects output outside reports and unknown options', () => {
    expect(() => parseFileRemovalArgs(['--write=public/report.json'])).toThrow(/reports/);
    expect(() => parseFileRemovalArgs(['--delete'])).toThrow(/unknown option/);
  });
});
