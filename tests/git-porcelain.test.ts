// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import { parseGitStatusPorcelain } from '../scripts/lib/git-porcelain.ts';

describe('git status porcelain parser', () => {
  test('preserves staged and unstaged XY columns', () => {
    expect(
      parseGitStatusPorcelain(
        ' M unstaged.ts\nM  staged.ts\nMM both.ts\nA  added.ts\n?? untracked.ts\n'
      )
    ).toEqual([
      { code: ' M', path: 'unstaged.ts' },
      { code: 'M ', path: 'staged.ts' },
      { code: 'MM', path: 'both.ts' },
      { code: 'A ', path: 'added.ts' },
      { code: '??', path: 'untracked.ts' },
    ]);
  });

  test('preserves spaces and rename notation in paths', () => {
    expect(parseGitStatusPorcelain('R  old name.ts -> new name.ts\n')).toEqual([
      { code: 'R ', path: 'old name.ts -> new name.ts' },
    ]);
  });

  test('returns no entries for empty output', () => {
    expect(parseGitStatusPorcelain('')).toEqual([]);
  });
});
