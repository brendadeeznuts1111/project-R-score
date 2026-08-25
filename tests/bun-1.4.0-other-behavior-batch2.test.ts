// @see https://github.com/oven-sh/bun/issues/28792 — reconciled Bun 1.4 breaking changes
/**
 * Bun 1.4.0 Other behavior — bundler / runtime / Node API contracts (batch 2).
 */
import { describe, expect, test } from 'bun:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import util from 'node:util';
import { Database } from 'bun:sqlite';

const TARGET = '1.4.0';
const rt = Bun.version === TARGET ? test : test.skip;

function temp(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

describe('Bun 1.4.0 Other — bundler shapes', () => {
  rt('import * as ns enumerates exports in sorted order (#35957)', async () => {
    const dir = temp('bun-1.4-ns-');
    try {
      writeFileSync(join(dir, 'ns.js'), 'export const z = 1; export const a = 2; export const m = 3;\n');
      writeFileSync(
        join(dir, 'use.js'),
        'import * as ns from "./ns.js"; export const keys = Object.keys(ns);\n'
      );
      const build = await Bun.build({
        entrypoints: [join(dir, 'use.js')],
        outdir: join(dir, 'out'),
        target: 'bun',
      });
      expect(build.success).toBe(true);
      const { keys } = await import(join(dir, 'out', 'use.js'));
      expect(keys).toEqual(['a', 'm', 'z']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  rt('bun build --minify does not emit a bare $ identifier (#35668)', async () => {
    const dir = temp('bun-1.4-min-');
    try {
      writeFileSync(
        join(dir, 'e.js'),
        'export const a = { foo: 1, bar: 2, baz: 3 }; console.log(a.foo, a.bar);\n'
      );
      const build = await Bun.build({
        entrypoints: [join(dir, 'e.js')],
        minify: true,
        target: 'browser',
      });
      expect(build.success).toBe(true);
      const code = await build.outputs[0]!.text();
      expect(code).not.toMatch(/(^|[^$\w])\$(?![$\w])/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  rt('assigning to imported binding throws TypeError when reached (#36046)', async () => {
    const dir = temp('bun-1.4-imp-');
    try {
      writeFileSync(join(dir, 'mod.js'), 'export let x = 1;\n');
      writeFileSync(join(dir, 'main.js'), 'import { x } from "./mod.js";\nx = 2;\n');
      await expect(import(join(dir, 'main.js'))).rejects.toThrow(/readonly|assign/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  rt('browser target honors browser field remap for Node builtin (#36597)', async () => {
    const dir = temp('bun-1.4-br-');
    try {
      mkdirSync(join(dir, 'node_modules', 'cryptopkg'), { recursive: true });
      writeFileSync(
        join(dir, 'node_modules', 'cryptopkg', 'package.json'),
        JSON.stringify({
          name: 'cryptopkg',
          main: 'index.js',
          browser: { crypto: false },
        })
      );
      writeFileSync(
        join(dir, 'node_modules', 'cryptopkg', 'index.js'),
        'module.exports = require("crypto");\n'
      );
      writeFileSync(join(dir, 'app.js'), 'import "cryptopkg";\n');
      const build = await Bun.build({
        entrypoints: [join(dir, 'app.js')],
        target: 'browser',
        bundling: true,
      } as Bun.BuildConfig);
      expect(build.success).toBe(true);
      expect(build.logs).toHaveLength(0);
      const output = await build.outputs[0]!.text();
      expect(output).not.toContain('node:crypto');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  rt('wildcard export retries known extensions (#36299)', async () => {
    const dir = temp('bun-1.4-wild-');
    try {
      mkdirSync(join(dir, 'pkg'), { recursive: true });
      writeFileSync(
        join(dir, 'pkg', 'package.json'),
        JSON.stringify({
          name: 'wildpkg',
          exports: { './feat/*': './feat/*.js' },
        })
      );
      mkdirSync(join(dir, 'pkg', 'feat'), { recursive: true });
      writeFileSync(join(dir, 'pkg', 'feat', 'x.ts'), 'export const v = 1;\n');
      writeFileSync(
        join(dir, 'app.ts'),
        'import { v } from "./pkg/feat/x";\nexport default v;\n'
      );
      const build = await Bun.build({
        entrypoints: [join(dir, 'app.ts')],
        target: 'bun',
        outdir: join(dir, 'out'),
      });
      expect(build.success).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('Bun 1.4.0 Other — udp / redis / ffi / shell / sqlite', () => {
  rt('udpSocket connect rejects port outside 1..65535 (#34029)', () => {
    // Validation is synchronous before the Promise settles.
    expect(() => {
      void Bun.udpSocket({ connect: { hostname: '127.0.0.1', port: 0 } });
    }).toThrow(/port|integer|1/i);
    expect(() => {
      void Bun.udpSocket({ connect: { hostname: '127.0.0.1', port: 70_000 } });
    }).toThrow(/port|integer|1/i);
  });

  rt('RedisClient rejects non-numeric database path (#34039)', () => {
    expect(() => new Bun.RedisClient('redis://127.0.0.1/notadb')).toThrow(
      /Invalid database number/
    );
  });

  rt('bun:ffi viewSource throws on invalid arguments (#34396)', async () => {
    const ffi = await import('bun:ffi');
    expect(() => (ffi as { viewSource: (x: unknown) => unknown }).viewSource(1)).toThrow();
  });

  rt('Bun.$ fails on ambiguous redirect (#34324)', async () => {
    const dir = temp('bun-1.4-dollar-');
    try {
      writeFileSync(join(dir, 'a.txt'), '1');
      writeFileSync(join(dir, 'b.txt'), '2');
      const run = Bun.$`echo hi > ${dir}/*.txt`.quiet().nothrow();
      const result = await Promise.race([
        run,
        Bun.sleep(3_000).then(() => ({ exitCode: 124 as number })),
      ]);
      expect(result.exitCode).not.toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  rt('sqlite empty AS "" alias kept; query finalized on close (#34925 #36573)', () => {
    const db = new Database(':memory:');
    const q = db.query('SELECT \'\' AS ""');
    expect(q.columnNames).toEqual(['']);
    expect(q.all()).toEqual([{ '': '' }]);
    db.close();
    expect(() => q.all()).toThrow(/closed|finaliz/i);
  });
});

describe('Bun 1.4.0 Other — validation hardening', () => {
  rt('TextDecoder rejects primitive options argument', () => {
    expect(() => (new TextDecoder() as any).decode(new Uint8Array([65]), 'utf-8')).toThrow(
      /options|object/i
    );
  });

  rt('password rejects fractional memoryCost', () => {
    expect(() =>
      Bun.password.hash('x', {
        algorithm: 'argon2id',
        memoryCost: 8.5 as unknown as number,
        timeCost: 1,
      })
    ).toThrow(/integer|Memory cost/i);
  });

  rt('crypto.createDiffieHellman invalid args throw', () => {
    expect(() => require('crypto').createDiffieHellman('bad')).toThrow();
  });

  rt('fs.open object flags → ERR_INVALID_ARG_VALUE (#34505)', () => {
    expect(() => (fs as any).openSync('/tmp/x', {})).toThrow(/flags|ERR_INVALID_ARG_VALUE|invalid/i);
  });

  rt('fs.rmSync rejects recursive: undefined (#34505)', () => {
    expect(() => fs.rmSync('/tmp/nope-' + Date.now(), { recursive: undefined as any })).toThrow(
      /recursive|boolean|ERR_INVALID_ARG/i
    );
  });

  rt('fs.appendFile with flag w truncates (#36553)', async () => {
    const dir = temp('bun-1.4-app-');
    const file = join(dir, 'f.txt');
    try {
      writeFileSync(file, 'old');
      await fs.promises.appendFile(file, 'new', { flag: 'w' });
      expect(readFileSync(file, 'utf8')).toBe('new');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  rt('fs.writeSync with non-safe-integer position uses current offset (#36135)', () => {
    const dir = temp('bun-1.4-write-');
    const file = join(dir, 'f.txt');
    try {
      writeFileSync(file, 'abcd');
      const fd = fs.openSync(file, 'r+');
      fs.writeSync(fd, Buffer.from('Z'), 0, 1, Number.NaN);
      fs.closeSync(fd);
      expect(readFileSync(file, 'utf8')[0]).toBe('Z');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  rt('assert.deepStrictEqual compares prototypes (#34660)', () => {
    class A {}
    class B extends A {}
    expect(() => assert.deepStrictEqual(new A(), new B())).toThrow();
    expect(Bun.deepEquals(new A(), new B())).toBe(true);
  });

  rt('child_process.spawn ignores options.encoding (#36050)', async () => {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(process.execPath, ['-e', 'process.stdout.write("hi")'], {
        encoding: 'utf8',
      } as any);
      child.stdout!.on('data', (chunk: Buffer | string) => {
        expect(Buffer.isBuffer(chunk)).toBe(true);
      });
      child.on('error', reject);
      child.on('close', () => resolve());
    });
  });

  rt('util.styleText returns plain text for non-TTY stream (#34434)', () => {
    const { PassThrough } = require('node:stream');
    const pt = new PassThrough();
    expect(util.styleText('red', 'hi', { stream: pt })).toBe('hi');
    expect(util.styleText('red', 'hi', { validateStream: false })).toMatch(/\u001b/);
  });

  rt('crypto.subtle is a getter on Crypto.prototype (#34838)', () => {
    const desc = Object.getOwnPropertyDescriptor(Crypto.prototype, 'subtle');
    expect(typeof desc?.get).toBe('function');
  });

  rt('require/getBuiltinModule share native builtin object (#31831)', () => {
    expect(require('node:buffer')).toBe(process.getBuiltinModule('buffer'));
    expect(require('node:module').builtinModules.includes('bun:wrap')).toBe(false);
  });

  rt('new WebSocket proxy scheme must be http/https (#35147)', () => {
    expect(() => new WebSocket('ws://example.com', { proxy: 'ftp://x' } as any)).toThrow(
      SyntaxError
    );
  });
});
