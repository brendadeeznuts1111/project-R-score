// @see https://github.com/oven-sh/bun/issues/28792 — reconciled Bun 1.4 breaking changes
/**
 * Residual Bun 1.4.0 Other-behavior contracts: platform-gated, observational,
 * or constructor-only (no live Redis/Postgres/S3/N-API addon required).
 */
import { describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const TARGET = '1.4.0';
const rt = Bun.version === TARGET ? test : test.skip;
const onWin = process.platform === 'win32';
const onLinux = process.platform === 'linux';

describe('Bun 1.4.0 Other — residual / platform', () => {
  rt('process.title defaults to argv0 as invoked (#31831)', () => {
    const proc = Bun.spawnSync([process.execPath, '-e', 'console.log(process.title)'], {
      argv0: 'bun-1.4-title-contract',
      stdout: 'pipe',
      stderr: 'pipe',
    });
    expect(proc.exitCode).toBe(0);
    expect(proc.stdout.toString().trim()).toBe('bun-1.4-title-contract');
  });

  test.todo('S3Client.list checksumAlgorithm requires an isolated S3 integration (#36502)');

  rt('node:test skip suites do not run callback (#34444)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'bun-1.4-node-test-'));
    try {
      writeFileSync(
        join(dir, 't.test.js'),
        `
import { describe, test } from "node:test";
import assert from "node:assert";
let ran = false;
describe("skipped", { skip: true }, () => {
  ran = true;
  test("inner", () => assert.fail("should not run"));
});
describe("skipped-and-todo", { skip: true, todo: true }, () => {
  ran = true;
  test("inner", () => assert.fail("should not run"));
});
test("probe", () => assert.equal(ran, false));
`
      );
      const proc = Bun.spawnSync([process.execPath, 'test', join(dir, 't.test.js')], {
        stdout: 'pipe',
        stderr: 'pipe',
      });
      expect(proc.exitCode).toBe(0);
      expect(proc.stderr.toString()).not.toContain('should not run');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  (onWin ? rt : test.skip)(
    'Windows libuv errno for ENOENT is -4058 (#34505)',
    () => {
      try {
        require('node:fs').accessSync('Z:\\bun-1.4-definitely-missing-' + Date.now());
      } catch (e) {
        const err = e as NodeJS.ErrnoException;
        expect(err.errno).toBe(-4058);
      }
    }
  );

  (onLinux ? rt : test.skip)(
    'Linux THP: child inherits system setting (observational #36990)',
    () => {
      // Cannot read PR_SET_THP_DISABLE from JS; prove spawn still works.
      const proc = Bun.spawnSync([process.execPath, '-e', 'process.exit(0)'], {
        stdout: 'pipe',
        stderr: 'pipe',
      });
      expect(proc.exitCode).toBe(0);
    }
  );

  test.todo('SQL, Redis, HTTP/2, Terminal and N-API behavior needs dedicated fixtures');

  rt('warnings printer format includes (node:PID) style when emitted (#31831)', () => {
    const proc = Bun.spawnSync(
      [
        process.execPath,
        '-e',
        'console.log(process.listenerCount("warning")); process.on("warning", warning => console.log(`user:${warning.code}`)); console.log(process.listenerCount("warning")); process.emitWarning("contract", { code: "BUN14", type: "BunContractWarning" });',
      ],
      { stdout: 'pipe', stderr: 'pipe' }
    );
    expect(proc.exitCode).toBe(0);
    expect(proc.stdout.toString().trim().split('\n')).toEqual(['1', '2', 'user:BUN14']);
    const err = proc.stderr.toString();
    expect(err).toMatch(/^\(node:\d+\) \[BUN14\] BunContractWarning: contract/m);

    const silenced = Bun.spawnSync(
      [
        process.execPath,
        '-e',
        'process.removeAllListeners("warning"); process.emitWarning("silent", { code: "BUN14" });',
      ],
      { stdout: 'pipe', stderr: 'pipe' }
    );
    expect(silenced.exitCode).toBe(0);
    expect(silenced.stderr.toString()).toBe('');

    const noWarnings = Bun.spawnSync(
      [process.execPath, '--no-warnings', '-e', 'process.emitWarning("silent");'],
      { stdout: 'pipe', stderr: 'pipe' }
    );
    expect(noWarnings.exitCode).toBe(0);
    expect(noWarnings.stderr.toString()).toBe('');
  });

  rt('HTML routes development:false omit sourceMappingURL (#36982)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'bun-1.4-html-'));
    const htmlPath = join(dir, 'index.html');
    try {
      writeFileSync(
        htmlPath,
        '<!doctype html><html><body><script type="module" src="./app.ts"></script></body></html>\n'
      );
      writeFileSync(join(dir, 'app.ts'), 'console.log(1);\n');
      // Dynamic import yields an HTMLBundle for Bun.serve routes.
      const html = await import(htmlPath);
      const server = Bun.serve({
        port: 0,
        development: false,
        routes: {
          '/': html.default ?? html,
        },
        fetch: () => new Response('no', { status: 404 }),
      });
      try {
        const res = await fetch(server.url);
        const body = await res.text();
        expect(body).not.toMatch(/sourceMappingURL/);
      } finally {
        server.stop(true);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test.todo('trustedDependencies exact-name behavior needs a lifecycle-script collision fixture (#31218)');
});
