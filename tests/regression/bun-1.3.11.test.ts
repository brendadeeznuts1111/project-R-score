// @see https://bun.com/docs/test/index#run-tests — bun:test
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/reference/bun/sliceAnsi — Bun.sliceAnsi
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// @see https://bun.com/docs/runtime/utils#bun-stripansi — Bun.stripANSI
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/blog/bun-v1.3.11 — Bun.sliceAnsi and --path-ignore-patterns
import { describe, expect } from 'bun:test';
import { join } from 'node:path';
import { releaseTest, tempRoot } from './shared.ts';

const MIN_VERSION = '1.3.11';
const BLOG = 'https://bun.com/blog/bun-v1.3.11';

const { test: releaseCase } = releaseTest(MIN_VERSION);

describe(`Bun ${MIN_VERSION} features (${BLOG})`, () => {
  releaseCase('Bun.sliceAnsi preserves ANSI and grapheme boundaries', () => {
    expect(Bun.sliceAnsi('\x1b[31mhello\x1b[39m', 1, 4)).toBe(
      '\x1b[31mell\x1b[39m'
    );
    expect(Bun.sliceAnsi('A👨\u200D👩\u200D👧\u200D👦B', 1, 3)).toBe(
      '👨\u200D👩\u200D👧\u200D👦'
    );
    expect(Bun.sliceAnsi('unicorn', 0, 4, '…')).toBe('uni…');
  });

  releaseCase('CLI path ignores override bunfig test discovery ignores', async () => {
    const root = tempRoot('1.3.11-path-ignore');
    await Bun.write(
      join(root, 'bunfig.toml'),
      '[test]\npathIgnorePatterns = ["allowed/**"]\n'
    );
    await Bun.write(
      join(root, 'allowed', 'allowed.test.ts'),
      'import { expect, test } from "bun:test"; test("allowed", () => expect(1).toBe(1));\n'
    );
    await Bun.write(
      join(root, 'ignored', 'ignored.test.ts'),
      'import { test } from "bun:test"; test("ignored", () => { throw new Error("must stay ignored"); });\n'
    );

    const result = Bun.spawnSync(
      [process.execPath, 'test', '--path-ignore-patterns', 'ignored/**'],
      { cwd: root, stdout: 'pipe', stderr: 'pipe', env: { ...Bun.env, NO_COLOR: '1' } }
    );
    const output = Bun.stripANSI(`${result.stdout}\n${result.stderr}`);

    expect(result.exitCode).toBe(0);
    expect(output).toContain('allowed');
    expect(output).not.toContain('must stay ignored');
  });
});
