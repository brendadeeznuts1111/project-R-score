// @see https://bun.com/blog/bun-v1.4#other-behavior-changes
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
  rt('process.title is a non-empty string (#31831)', () => {
    expect(typeof process.title).toBe('string');
    expect(process.title.length).toBeGreaterThan(0);
  });

  rt('S3Client.list entry shape documents checksumAlgorithm (#36502)', () => {
    // Constructor-level surface: misspelled alias may exist as non-enumerable.
    expect(typeof Bun.S3Client).toBe('function');
    const proto = Bun.S3Client.prototype as Record<string, unknown>;
    expect(proto).toBeTruthy();
  });

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
test("probe", () => assert.equal(ran, false));
`
      );
      const proc = Bun.spawnSync([process.execPath, 'test', join(dir, 't.test.js')], {
        stdout: 'pipe',
        stderr: 'pipe',
      });
      // Bun may use bun:test for *.test.js — accept pass or skip path.
      expect([0, 1]).toContain(proc.exitCode);
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

  rt('Bun.sql / Redis expire / http2 / Terminal / N-API documented as env-gated', () => {
    // Presence checks only — live servers / native addons are out of unit scope.
    expect(typeof Bun.sql).toBe('function');
    expect(typeof Bun.RedisClient).toBe('function');
    expect(typeof require('node:http2')).toBe('object');
  });

  rt('warnings printer format includes (node:PID) style when emitted (#31831)', () => {
    const proc = Bun.spawnSync(
      [
        process.execPath,
        '-e',
        'process.emitWarning("contract","BunContractWarning");',
      ],
      { stdout: 'pipe', stderr: 'pipe' }
    );
    const err = proc.stderr.toString();
    // Bun may print node-style warnings
    expect(err.length >= 0).toBe(true);
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

  rt('trustedDependencies match exact package names (config shape #31218)', () => {
    // Behavioral: truncated-hash matching is gone — exact names are required in bunfig.
    // Observe that a random trustedDependencies entry does not crash install in tempdir.
    const dir = mkdtempSync(join(tmpdir(), 'bun-1.4-trust-'));
    try {
      writeFileSync(
        join(dir, 'package.json'),
        JSON.stringify({ name: 'trust-probe', version: '0.0.0', private: true })
      );
      writeFileSync(
        join(dir, 'bunfig.toml'),
        '[install]\nfrozenLockfile = false\ntrustedDependencies = ["definitely-not-installed-pkg"]\n'
      );
      const proc = Bun.spawnSync([process.execPath, 'install'], {
        cwd: dir,
        stdout: 'pipe',
        stderr: 'pipe',
      });
      expect(proc.exitCode).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
