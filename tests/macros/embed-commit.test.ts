// @see https://bun.com/docs/bundler/macros — Bun macros
import { describe, expect, test } from 'bun:test';
import { getGitCommitHash } from '../../lib/macros/git-commit';

const FIXTURE = `${import.meta.dir}/fixtures/embed-commit.ts`;
const OUT = `${import.meta.dir}/.tmp-embed-commit.js`;

describe('lib/macros (bun build)', () => {
  test('inlines git commit hash and erases macro source', async () => {
    const expected = getGitCommitHash();
    expect(expected).toMatch(/^[0-9a-f]{40}$/);

    const build = Bun.spawnSync({
      cmd: ['bun', 'build', FIXTURE, '--outfile', OUT],
      stdout: 'pipe',
      stderr: 'pipe',
    });
    expect(build.exitCode).toBe(0);

    const bundled = await Bun.file(OUT).text();
    try {
      expect(bundled).toContain(expected);
      expect(bundled).not.toContain('rev-parse');
      expect(bundled).not.toContain('getGitCommitHash');
      expect(bundled).toMatch(/brendadeeznuts1111/);
      expect(bundled).toMatch(/project-R-score/);
    } finally {
      await Bun.$`rm -f ${OUT}`.quiet();
    }
  });
});
