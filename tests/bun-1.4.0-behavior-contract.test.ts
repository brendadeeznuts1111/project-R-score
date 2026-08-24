// @see https://bun.com/blog/bun-v1.4#other-behavior-changes — Bun 1.4.0 Other behavior changes
/**
 * Executable proofs for Bun 1.4.0 Other behavior changes (safe / in-process tier).
 * Inventory: packages/bun-release-contracts/contracts/bun-v1.4.0.json
 * Install/PM tempdir cases: tests/bun-1.4.0-install-behavior-contract.test.ts
 * Metafile #34534: tests/bun-1.4-cli-example.test.ts
 */
import { afterAll, describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ARGON2ID_OWASP_DEFAULTS, hashPassword } from '../lib/security/password-hash.ts';

const TARGET_VERSION = '1.4.0';
const releaseTest = Bun.version === TARGET_VERSION ? test : test.skip;

describe('Bun 1.4.0 Other behavior — CLI removed', () => {
  releaseTest('bun feedback is removed (#38444)', () => {
    const proc = Bun.spawnSync([process.execPath, 'feedback', '--help'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const out = `${proc.stdout.toString()}\n${proc.stderr.toString()}`;
    expect(out).toMatch(/Script not found|Unknown command|not found/i);
    expect(proc.exitCode).not.toBe(0);
  });
});

describe('Bun 1.4.0 Other behavior — password / parse / uuid', () => {
  releaseTest('argon2 memoryCost below 8 is rejected (#39596)', async () => {
    expect(() =>
      Bun.password.hash('x', { algorithm: 'argon2id', memoryCost: 7, timeCost: 1 })
    ).toThrow(/Memory cost must be at least 8/);
    expect(ARGON2ID_OWASP_DEFAULTS.memoryCost).toBeGreaterThanOrEqual(8);
    const hash = await hashPassword('contract-check');
    expect(await Bun.password.verify('contract-check', hash)).toBe(true);
  });

  releaseTest('Bun.JSONC.parse throws SyntaxError on invalid or empty input (#35066)', () => {
    expect(() => Bun.JSONC.parse('')).toThrow(SyntaxError);
    expect(() => Bun.JSONC.parse('{')).toThrow(SyntaxError);
    expect(Bun.JSONC.parse('{"ok":true /* c */ }')).toEqual({ ok: true });
  });

  releaseTest('Bun.YAML.parse throws SyntaxError on a NUL byte', () => {
    expect(() => Bun.YAML.parse('a: 1\0b: 2')).toThrow(SyntaxError);
  });

  releaseTest('Bun.randomUUIDv7 rejects out-of-range timestamps (#34021)', () => {
    expect(() => Bun.randomUUIDv7(2 ** 48)).toThrow(RangeError);
    expect(() => Bun.randomUUIDv7(Number.NaN)).toThrow(RangeError);
    expect(() => Bun.randomUUIDv7(new Date('invalid'))).toThrow(RangeError);
    expect(() => Bun.randomUUIDv7(new Date(-1))).toThrow(RangeError);
    expect(typeof Bun.randomUUIDv7()).toBe('string');
  });
});

describe('Bun 1.4.0 Other behavior — serve / cookie / color', () => {
  releaseTest('Bun.serve rejects non-integer / out-of-range ports (#34957)', () => {
    expect(() =>
      Bun.serve({
        port: 65_536,
        fetch: () => new Response('x'),
      })
    ).toThrow(RangeError);
    expect(() =>
      Bun.serve({
        port: -1,
        fetch: () => new Response('x'),
      })
    ).toThrow(RangeError);
  });

  releaseTest('Bun.Cookie Expires serializes like Date#toUTCString (#32926)', () => {
    const expires = new Date(Date.UTC(2026, 7, 23, 12, 0, 0));
    const cookie = new Bun.Cookie('k', 'v', { expires });
    const serialized = String(cookie);
    expect(serialized).toContain(`Expires=${expires.toUTCString()}`);
    expect(serialized).not.toContain('-0000');
  });

  releaseTest('Bun.color 24-bit numbers are opaque (#33328)', () => {
    const rgba = Bun.color(0xff0000, '{rgba}') as { r: number; g: number; b: number; a: number };
    expect(rgba).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(Bun.color(0xff0000, '[rgba]')).toEqual([255, 0, 0, 255]);
  });
});

describe('Bun 1.4.0 Other behavior — spawn hardening', () => {
  releaseTest('Bun.spawnSync rejects NUL in argv0 (#spawn)', () => {
    expect(() => Bun.spawnSync(['true'], { argv0: 'a\0b' })).toThrow(/ERR_INVALID_ARG_VALUE|null/);
  });

  releaseTest('Bun.spawnSync rejects NUL in cwd', () => {
    expect(() => Bun.spawnSync(['true'], { cwd: `${tmpdir()}/\0x` })).toThrow(
      /ERR_INVALID_ARG_VALUE|null/
    );
  });

  releaseTest('Bun.spawnSync rejects timeout: NaN and killSignal: 0 (#35348)', () => {
    expect(() => Bun.spawnSync(['true'], { timeout: Number.NaN })).toThrow(/out of range|NaN/i);
    expect(() => Bun.spawnSync(['true'], { killSignal: 0 })).toThrow(/Unknown signal|ERR_UNKNOWN_SIGNAL/i);
  });

  releaseTest('Bun.spawnSync throws AbortError for already-aborted signal', () => {
    const ac = new AbortController();
    ac.abort('already-aborted');
    try {
      Bun.spawnSync(['true'], { signal: ac.signal });
      expect.unreachable();
    } catch (e) {
      const err = e as Error & { name?: string; cause?: unknown };
      expect(err.name).toBe('AbortError');
      expect(err.cause).toBe('already-aborted');
    }
  });

  releaseTest('Bun.spawn rejects typedArray stdout', () => {
    expect(() =>
      Bun.spawn(['true'], {
        stdout: new Uint8Array(8),
      })
    ).toThrow(/ArrayBufferView|stdout/);
  });
});

describe('Bun 1.4.0 Other behavior — router / equals / fetch shapes', () => {
  const routerDir = mkdtempSync(join(tmpdir(), 'bun-1.4-fsr-'));
  const pages = join(routerDir, 'pages');
  mkdirSync(pages, { recursive: true });
  writeFileSync(join(pages, 'top.tsx'), 'export default () => null;\n');

  afterAll(() => {
    rmSync(routerDir, { recursive: true, force: true });
  });

  releaseTest('FileSystemRouter.match returns null without leading slash (#34028)', () => {
    const router = new Bun.FileSystemRouter({ dir: pages, style: 'nextjs' });
    expect(router.match('Xtop')).toBeNull();
    expect(router.match('/top')?.name).toBe('/top');
  });

  releaseTest('Bun.deepEquals distinguishes boxed BigInts (#34434)', () => {
    expect(Bun.deepEquals(Object(1n), Object(2n))).toBe(false);
    expect(Bun.deepEquals(Object(1n), Object(1n))).toBe(true);
  });

  releaseTest('Response.redirect re-serializes absolute URLs via WHATWG (#33126)', () => {
    // Absolute URL → WHATWG parse + re-serialize Location (spaces, non-ASCII,
    // default ports, and dot segments normalized per Fetch).
    expect(Response.redirect('http://example.com').headers.get('Location')).toBe(
      'http://example.com/'
    );
    expect(Response.redirect('http://example.com:80/path').headers.get('Location')).toBe(
      'http://example.com/path'
    );
    expect(Response.redirect('http://example.com/a/./b/../c').headers.get('Location')).toBe(
      'http://example.com/a/c'
    );
    expect(Response.redirect('http://example.com/hello world').headers.get('Location')).toBe(
      'http://example.com/hello%20world'
    );
    expect(Response.redirect('http://example.com/café').headers.get('Location')).toBe(
      'http://example.com/caf%C3%A9'
    );
    // Relative URL is written as-is (not run through absolute URL serialization).
    expect(Response.redirect('/relative/path').headers.get('Location')).toBe('/relative/path');
  });

  releaseTest('structuredClone rejects non-object transfer entries (#32809)', () => {
    expect(() => structuredClone({}, { transfer: [null as unknown as ArrayBuffer] })).toThrow(
      TypeError
    );
  });

  releaseTest('new URL(bad) throws Node-shaped TypeError (#34660)', () => {
    try {
      new URL('not a url');
      expect.unreachable();
    } catch (e) {
      const err = e as TypeError & { code?: string; input?: string };
      expect(err).toBeInstanceOf(TypeError);
      expect(err.code).toBe('ERR_INVALID_URL');
      expect(err.input).toBe('not a url');
    }
  });

  releaseTest('CryptoHasher rejects odd-length hex update', () => {
    expect(() => new Bun.CryptoHasher('sha256').update('abc', 'hex')).toThrow(/encoding|length/i);
  });
});

describe('Bun 1.4.0 Other behavior — catch-require bundle (#35659)', () => {
  releaseTest('unresolvable require inside catch becomes runtime throw', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'bun-1.4-catch-req-'));
    try {
      const entry = join(dir, 'entry.js');
      writeFileSync(
        entry,
        `export function run() {
  try {
    require("___bun_1_4_missing_module_xyz___");
  } catch (e) {
    throw e;
  }
}
`
      );
      const outdir = join(dir, 'out');
      const result = await Bun.build({
        entrypoints: [entry],
        outdir,
        target: 'bun',
      });
      expect(result.success).toBe(true);
      const bundled = join(outdir, 'entry.js');
      const mod = await import(bundled);
      expect(() => mod.run()).toThrow();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
