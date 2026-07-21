// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/blog/bun-v1.3.12#faster-bun-glob-scan — Bun.Glob.scan
// @see https://bun.com/docs/test/index#run-tests — bun:test
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
/**
 * Spine smoke: Bun.Glob.scan / scanSync (1.3.12+ faster scan path).
 *
 * Blog vector: boundary pattern under node_modules (up to 2x faster scan).
 * Mechanism: "star-star / X / ..." boundary avoids double-reading directories.
 * Patterns without a boundary (e.g. all .ts files) are unchanged.
 *
 *   bun test tests/bun-glob-scan.test.ts
 */
import { afterAll, describe, expect, test } from 'bun:test';

const FIXTURE = `${Bun.env.TMPDIR ?? '/tmp'}/bun-glob-scan-${crypto.randomUUID()}`;

afterAll(async () => {
  await Bun.$`rm -rf ${FIXTURE}`.quiet();
});

describe('Bun.Glob.scan (Bun 1.3.12+)', () => {
  test('async scan yields files under tests/', async () => {
    const glob = new Bun.Glob('**/*.test.ts');
    const paths: string[] = [];
    for await (const path of glob.scan({ cwd: 'tests', onlyFiles: true })) {
      paths.push(path);
    }
    expect(paths.length).toBeGreaterThan(0);
    expect(paths.some(p => p.includes('bun-glob-scan.test.ts'))).toBe(true);
  });

  test('scan and scanSync agree on count', async () => {
    const glob = new Bun.Glob('**/*.ts');
    const asyncPaths: string[] = [];
    for await (const path of glob.scan({ cwd: 'tests', onlyFiles: true })) {
      asyncPaths.push(path);
    }
    const syncPaths = [...glob.scanSync({ cwd: 'tests', onlyFiles: true })];
    expect(asyncPaths.length).toBe(syncPaths.length);
    expect(new Set(asyncPaths)).toEqual(new Set(syncPaths));
  });

  test('blog vector boundary pattern under node_modules', async () => {
    // Blog: new Bun.Glob("**/node_modules/**/*.js").scan({ cwd })
    await Bun.write(`${FIXTURE}/a/node_modules/pkg/x.js`, '1');
    await Bun.write(`${FIXTURE}/b/y.js`, '2');

    const glob = new Bun.Glob('**/node_modules/**/*.js');
    const hits: string[] = [];
    for await (const path of glob.scan({ cwd: FIXTURE, onlyFiles: true })) {
      hits.push(path);
    }

    expect(hits).toEqual(['a/node_modules/pkg/x.js']);
  });
});
