// @see https://github.com/oven-sh/bun/issues/28792 — reconciled Bun 1.4 breaking changes
// @see https://github.com/oven-sh/bun/pull/36463 — Bun 1.3 to 1.4 upgrade guide
import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  BUN_14_BREAKING_CHANGES_URL,
  BUN_14_UPGRADE_GUIDE_URL,
} from '../tools/bun-blog-assets/constants.ts';

const releaseTest = Bun.version === '1.4.0' ? test : test.skip;

function temp(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

describe('Bun 1.4 reconciled breaking-change contracts', () => {
  releaseTest('reports Node 26.3.0 and native addon ABI 147', () => {
    expect(process.versions.node).toBe('26.3.0');
    expect(process.versions.modules).toBe('147');
  });

  releaseTest('enables Temporal and compares Temporal values by value', () => {
    expect(typeof Temporal).toBe('object');
    const first = Temporal.Instant.from('2026-08-19T00:00:00Z');
    const same = Temporal.Instant.from('2026-08-19T00:00:00Z');
    const later = Temporal.Instant.from('2026-08-20T00:00:00Z');
    expect(Bun.deepEquals(first, same)).toBe(true);
    expect(Bun.deepEquals(first, later)).toBe(false);
  });

  releaseTest('uses plain-string CString values without the removed wrapper fields', async () => {
    const { CString } = await import('bun:ffi');
    const value = CString(0);
    expect(typeof value).toBe('string');
    expect(value).toBe('');
    expect(Object(value)).not.toHaveProperty('ptr');
    expect(Object(value)).not.toHaveProperty('byteLength');
    expect(Object(value)).not.toHaveProperty('arrayBuffer');
  });

  releaseTest('uses TOML 1.1 date values and YAML 1.2 booleans', () => {
    expect(() => Bun.TOML.parse('x = 9007199254740992')).toThrow(SyntaxError);
    const toml = Bun.TOML.parse('date = 1979-05-27') as { date: Temporal.PlainDate };
    expect(toml.date).toBeInstanceOf(Temporal.PlainDate);
    expect(toml.date.toString()).toBe('1979-05-27');
    expect(Bun.YAML.parse('yes: yes\nno: no\non: on\noff: off\n')).toEqual({
      yes: 'yes',
      no: 'no',
      on: 'on',
      off: 'off',
    });
  });

  releaseTest('removes response.writeHeader and recursive fs.rmdir', () => {
    const http = require('node:http') as typeof import('node:http');
    expect((http.ServerResponse.prototype as { writeHeader?: unknown }).writeHeader).toBeUndefined();

    const dir = temp('bun-1.4-rmdir-');
    try {
      expect(() =>
        require('node:fs').rmdirSync(dir, { recursive: true })
      ).toThrow(/ERR_INVALID_ARG_VALUE|recursive/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  releaseTest('process.reallyExit bypasses exit listeners', () => {
    const proc = Bun.spawnSync(
      [
        process.execPath,
        '-e',
        'process.on("exit", () => console.log("exit-listener-ran")); process.reallyExit(0);',
      ],
      { stdout: 'pipe', stderr: 'pipe' }
    );
    expect(proc.exitCode).toBe(0);
    expect(proc.stdout.toString()).toBe('');
    expect(proc.stderr.toString()).toBe('');
  });

  releaseTest('new projects write lockfile v2 while this existing v1 lock stays valid', () => {
    const dir = temp('bun-1.4-lock-');
    try {
      writeFileSync(
        join(dir, 'package.json'),
        '{"name":"lock-probe","private":true,"dependencies":{"probe-dep":"file:./dep"}}\n'
      );
      require('node:fs').mkdirSync(join(dir, 'dep'));
      writeFileSync(join(dir, 'dep', 'package.json'), '{"name":"probe-dep","version":"1.0.0"}\n');
      const install = Bun.spawnSync([process.execPath, 'install'], {
        cwd: dir,
        stdout: 'pipe',
        stderr: 'pipe',
      });
      expect(install.exitCode).toBe(0);
      const fresh = Bun.JSONC.parse(readFileSync(join(dir, 'bun.lock'), 'utf8')) as {
        lockfileVersion: number;
      };
      expect(fresh.lockfileVersion).toBe(2);

      const existing = Bun.JSONC.parse(
        readFileSync(new URL('../bun.lock', import.meta.url), 'utf8')
      ) as { lockfileVersion: number; configVersion: number };
      expect(existing).toEqual(expect.objectContaining({ lockfileVersion: 1, configVersion: 1 }));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  releaseTest('node-name invocation skips automatic dotenv but accepts --env-file', () => {
    const dir = temp('bun-1.4-node-env-');
    const node = join(dir, 'node');
    const key = 'BUN_14_NODE_ENV_PROBE';
    try {
      symlinkSync(process.execPath, node);
      writeFileSync(join(dir, '.env'), `${key}=loaded\n`);
      writeFileSync(join(dir, 'probe.js'), `console.log(process.env.${key} ?? "missing");\n`);
      const env = { ...process.env };
      delete env[key];

      const automatic = Bun.spawnSync([node, 'probe.js'], {
        cwd: dir,
        env,
        stdout: 'pipe',
        stderr: 'pipe',
      });
      expect(automatic.exitCode).toBe(0);
      expect(automatic.stdout.toString().trim()).toBe('missing');

      const explicit = Bun.spawnSync([node, '--env-file=.env', 'probe.js'], {
        cwd: dir,
        env,
        stdout: 'pipe',
        stderr: 'pipe',
      });
      expect(explicit.exitCode).toBe(0);
      expect(explicit.stdout.toString().trim()).toBe('loaded');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('keeps migration sources canonical and non-shipped proposals explicit', async () => {
    expect(BUN_14_BREAKING_CHANGES_URL).toBe('https://github.com/oven-sh/bun/issues/28792');
    expect(BUN_14_UPGRADE_GUIDE_URL).toBe('https://github.com/oven-sh/bun/pull/36463');
    const migration = await Bun.file(
      new URL('../docs/BUN_1_4_MIGRATION.md', import.meta.url)
    ).text();
    expect(migration).toContain('Under consideration');
    expect(migration).toContain('did **not**');
    expect(migration).toContain('TypeError("fetch failed")');
    expect(migration).toContain('unsettled top-level await');
  });
});
