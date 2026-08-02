// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import { stagedDeletions } from '../scripts/bun-test-changed-staged.ts';

describe('test-changed-staged helpers', () => {
  test('stagedDeletions parses name-only diff output', () => {
    expect(stagedDeletions('lib/a.ts\nscripts/b.ts\n')).toEqual(['lib/a.ts', 'scripts/b.ts']);
    expect(stagedDeletions('')).toEqual([]);
    expect(stagedDeletions('single.ts')).toEqual(['single.ts']);
  });

  test('hook invokes the staged-scoped runner, not the worktree wrapper', async () => {
    const hook = await Bun.file('.husky/pre-commit').text();
    expect(hook).toContain('bun scripts/bun-test-changed-staged.ts --bail=1');
    expect(hook).not.toContain('bun run test:changed -- --bail=1');
  });
});
