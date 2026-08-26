// @see https://bun.com/blog/bun-v1.4#bug-fixes — Bun 1.4.0 Bug fixes
/**
 * Executable proofs for high-signal Bun 1.4.0 Bug fixes (safe / in-process tier).
 * Inventory section: packages/bun-release-contracts/contracts/bun-v1.4.0.json → "Bug fixes"
 * Other behavior contracts: tests/bun-1.4.0-behavior-contract.test.ts
 */
import { afterAll, describe, expect, jest, mock, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path, { join } from 'node:path';

const TARGET_VERSION = '1.4.0';
const releaseTest = Bun.version === TARGET_VERSION ? test : test.skip;

describe('Bun 1.4.0 Bug fixes — Glob / HTMLRewriter / formData', () => {
  const globDir = mkdtempSync(join(tmpdir(), 'bun-1.4-glob-'));
  writeFileSync(join(globDir, '.env'), 'x=1\n');
  writeFileSync(join(globDir, 'plain.txt'), 'y\n');

  afterAll(() => {
    rmSync(globDir, { recursive: true, force: true });
  });

  releaseTest('Bun.Glob matches explicitly-named dotfile segments without dot: true', () => {
    const hits = [...new Bun.Glob('.env').scanSync({ cwd: globDir })];
    expect(hits).toContain('.env');
    // Wildcard * still skips dotfiles unless dot: true (bash/fast-glob parity).
    expect([...new Bun.Glob('*').scanSync({ cwd: globDir })]).not.toContain('.env');
  });

  releaseTest('HTMLRewriter getAttribute returns "" for present-but-empty attrs (#32840)', async () => {
    let disabled: string | null = 'unset';
    await new HTMLRewriter()
      .on('input', {
        element(el) {
          disabled = el.getAttribute('disabled');
        },
      })
      .transform(new Response('<input disabled>'))
      .arrayBuffer();
    expect(disabled).toBe('');
  });

  releaseTest('Request.formData preserves small binary uploads through NUL bytes', async () => {
    const gzipHeader = new Uint8Array([0x1f, 0x8b, 0x08, 0x00]);
    const body = new FormData();
    body.append('f', new Blob([gzipHeader], { type: 'application/gzip' }), 'x.gz');
    const form = await new Request('http://example.local', { method: 'POST', body }).formData();
    const file = form.get('f');
    expect(file).toBeInstanceOf(File);
    const bytes = new Uint8Array(await (file as File).arrayBuffer());
    expect([...bytes]).toEqual([0x1f, 0x8b, 0x08, 0x00]);
  });
});

describe('Bun 1.4.0 Bug fixes — Cookie / YAML / sqlite / stringWidth', () => {
  releaseTest('Bun.Cookie.parse records Expires and Max-Age regardless of order (#33393)', () => {
    const maxFirst = Bun.Cookie.parse(
      'a=b; Max-Age=10; Expires=Wed, 21 Oct 2015 07:28:00 GMT'
    );
    const expFirst = Bun.Cookie.parse(
      'a=b; Expires=Wed, 21 Oct 2015 07:28:00 GMT; Max-Age=10'
    );
    expect(maxFirst?.maxAge).toBe(10);
    expect(expFirst?.maxAge).toBe(10);
    expect(maxFirst?.expires?.toISOString()).toBe('2015-10-21T07:28:00.000Z');
    expect(expFirst?.expires?.toISOString()).toBe('2015-10-21T07:28:00.000Z');
  });

  releaseTest('Bun.YAML.parse combines surrogate-pair escapes for emoji (#32731)', () => {
    expect(Bun.YAML.parse('"\\uD83D\\uDE00"')).toBe('😀');
  });

  releaseTest('bun:sqlite generic errors set code SQLITE_ERROR (#33397)', () => {
    const db = new Database(':memory:');
    try {
      db.run('select * from nope');
      expect.unreachable();
    } catch (e) {
      const err = e as Error & { code?: string };
      expect(err.code).toBe('SQLITE_ERROR');
      expect(err.message).toMatch(/no such table/i);
    }
  });

  releaseTest('Bun.stringWidth treats bidi controls as zero-width (#33049)', () => {
    expect(Bun.stringWidth('\u202Ahi\u202C')).toBe(2);
    expect(Bun.stringWidth('hi')).toBe(2);
  });
});

describe('Bun 1.4.0 Bug fixes — bun:test matcher / mock semantics', () => {
  releaseTest('expect.any(Object) matches null and rejects functions (#32922)', () => {
    expect(null).toEqual(expect.any(Object));
    expect(() => {}).not.toEqual(expect.any(Object));
  });

  releaseTest('toContain compares with === not Object.is (#32950)', () => {
    expect([-0]).toContain(0);
    expect(() => expect([Number.NaN]).toContain(Number.NaN)).toThrow();
  });

  releaseTest('jest.resetAllMocks resets implementations (#33374)', () => {
    const fn = mock(() => 42);
    expect(fn()).toBe(42);
    jest.resetAllMocks();
    expect(fn()).toBeUndefined();
  });
});

describe('Bun 1.4.0 Bug fixes — Cookie precedence / Glob depth / HTMLRewriter throws', () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'bun-1.4-bugfix2-'));
  const braceDir = join(fixtureRoot, 'braces');
  const linkDir = join(fixtureRoot, 'links');
  mkdirSync(braceDir, { recursive: true });
  mkdirSync(join(linkDir, 'real'), { recursive: true });
  for (const name of ['a', 'b', 'c', 'd', 'e', 'f']) {
    writeFileSync(join(braceDir, name), '');
  }
  writeFileSync(join(linkDir, 'real', 'file.txt'), 'x');
  symlinkSync(join(linkDir, 'real'), join(linkDir, 'link'));

  afterAll(() => {
    rmSync(fixtureRoot, { recursive: true, force: true });
  });

  releaseTest('Bun.Cookie.isExpired applies Max-Age over Expires (#33393)', () => {
    const past = new Date(Date.now() - 60_000).toUTCString();
    const future = new Date(Date.now() + 3_600_000).toUTCString();
    const maxAgeWinsExpired = Bun.Cookie.parse(`a=b; Max-Age=0; Expires=${future}`)!;
    const maxAgeWinsFresh = Bun.Cookie.parse(`a=b; Max-Age=3600; Expires=${past}`)!;
    expect(maxAgeWinsExpired.isExpired()).toBe(true);
    expect(maxAgeWinsFresh.isExpired()).toBe(false);
  });

  releaseTest('Bun.Glob handles deeply nested braces', () => {
    const hits = [...new Bun.Glob('{a,{b,{c,{d,{e,f}}}}}').scanSync({ cwd: braceDir })].sort();
    expect(hits).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
  });

  releaseTest('Bun.Glob literal segments resolve through symlinks without followSymlinks', () => {
    const hits = [...new Bun.Glob('link/file.txt').scanSync({ cwd: linkDir })];
    expect(hits).toContain('link/file.txt');
  });

  releaseTest('Bun.Glob absolute: true reports ENAMETOOLONG for over-long paths', () => {
    try {
      [...new Bun.Glob('x'.repeat(4096), { absolute: true }).scanSync({ cwd: tmpdir() })];
      expect.unreachable();
    } catch (e) {
      const err = e as Error & { code?: string };
      expect(err.code).toBe('ENAMETOOLONG');
    }
  });

  releaseTest('HTMLRewriter setAttribute/removeAttribute throw on invalid args (#32840)', async () => {
    let setThrew = false;
    let removeThrew = false;
    await new HTMLRewriter()
      .on('div', {
        element(el) {
          try {
            el.setAttribute('', 'x');
          } catch {
            setThrew = true;
          }
          try {
            // @ts-expect-error intentional invalid arg
            el.removeAttribute(null);
          } catch {
            removeThrew = true;
          }
        },
      })
      .transform(new Response('<div></div>'))
      .arrayBuffer();
    expect(setThrew).toBe(true);
    expect(removeThrew).toBe(true);
  });
});

describe('Bun 1.4.0 Bug fixes — color / YAML / module / path / sliceAnsi', () => {
  releaseTest('Bun.color ansi-16 emits decimal color digits', () => {
    const ansi = Bun.color('#00ff00', 'ansi-16') as string;
    expect(ansi).toMatch(/\[\d+m/);
    expect([...ansi].some(ch => ch.charCodeAt(0) < 0x20 && ch !== '\u001b')).toBe(false);
  });

  releaseTest('Bun.YAML.stringify does not emit \\L/\\P for U+00A8/U+00A9 (#32718)', () => {
    expect(Bun.YAML.stringify('\u00A8')).not.toMatch(/\\[LP]/);
    expect(Bun.YAML.stringify('\u00A9')).not.toMatch(/\\[LP]/);
    expect(Bun.YAML.stringify('\u00A8')).toContain('¨');
  });

  releaseTest('stringify surfaces valueOf throws on boxed Number (#37025)', () => {
    const bad = Object(1);
    Object.defineProperty(bad, 'valueOf', {
      value() {
        throw new Error('num-boom');
      },
    });
    expect(() => Bun.YAML.stringify(bad)).toThrow('num-boom');
    expect(() => Bun.JSON5.stringify(bad)).toThrow('num-boom');
    expect(() => Bun.TOML.stringify({ a: bad })).toThrow('num-boom');
  });

  releaseTest('CSS imports at runtime default-export {} (#35163)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'bun-1.4-css-'));
    try {
      writeFileSync(join(dir, 'x.css'), 'body{color:red}');
      writeFileSync(join(dir, 'entry.ts'), 'import css from "./x.css"; console.log(JSON.stringify(css));');
      const proc = Bun.spawnSync([process.execPath, join(dir, 'entry.ts')], {
        cwd: dir,
        stdout: 'pipe',
        stderr: 'pipe',
      });
      expect(proc.exitCode).toBe(0);
      expect(proc.stdout.toString().trim()).toBe('{}');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  releaseTest('importing a long data: URL does not fail with ENAMETOOLONG (#37157)', async () => {
    const url = `data:text/javascript,${'export default 1;'.padEnd(100_000, ' ')}`;
    const mod = await import(url);
    expect(mod.default).toBe(1);
  });

  releaseTest('path.resolve handles arbitrarily long paths', () => {
    const segment = 'a'.repeat(300);
    const resolved = path.resolve('/', ...Array.from({ length: 40 }, () => segment));
    expect(resolved.length).toBeGreaterThan(10_000);
    expect(resolved.startsWith('/')).toBe(true);
  });

  releaseTest('Bun.sliceAnsi returns ellipsis for zero-width start-cut ranges', () => {
    const zw = '\u200b\u200bhello';
    expect(Bun.sliceAnsi(zw, 0, 1, '…')).toBe('…');
  });

  releaseTest('WebAssembly.instantiateStreaming accepts Application/WASM Content-Type (#33229)', async () => {
    const wasm = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]);
    const { module } = await WebAssembly.instantiateStreaming(
      Promise.resolve(new Response(wasm, { headers: { 'Content-Type': 'Application/WASM' } }))
    );
    expect(module).toBeInstanceOf(WebAssembly.Module);
  });

  releaseTest('multipart/form-data accepts HTAB after header colon (#34362)', async () => {
    const boundary = '----bun14';
    const body = `--${boundary}\r\nContent-Disposition:\tform-data; name="x"\r\n\r\nhi\r\n--${boundary}--\r\n`;
    const form = await new Response(body, {
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    }).formData();
    expect(form.get('x')).toBe('hi');
  });
});

describe('Bun 1.4.0 Bug fixes — color round-trip / file slice / env / build / bunfig', () => {
  releaseTest('Bun.color hsl/lab output is parseable', () => {
    const hsl = Bun.color('#ff0000', 'hsl') as string;
    const lab = Bun.color('#ff0000', 'lab') as string;
    expect(Bun.color(hsl, '{rgba}')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    const labRgba = Bun.color(lab, '{rgba}') as { r: number; g: number; b: number; a: number };
    expect(labRgba.r).toBeGreaterThan(250);
    expect(labRgba.g).toBeLessThan(5);
    expect(labRgba.b).toBeLessThan(5);
  });

  releaseTest('Bun.color ansi-256 grey ramp does not underflow', () => {
    const nearBlack = Bun.color('rgb(8,8,8)', 'ansi-256') as string;
    const black = Bun.color('rgb(0,0,0)', 'ansi-256') as string;
    expect(nearBlack).toMatch(/\[38;5;(\d+)m/);
    const code = Number(/\[38;5;(\d+)m/.exec(nearBlack)?.[1]);
    expect(code).toBeGreaterThanOrEqual(232);
    expect(black).toMatch(/\[38;5;\d+m/);
  });

  releaseTest('Bun.color lab() on sRGB gamut boundary stays opaque white', () => {
    expect(Bun.color('lab(100% 0 0)', '{rgba}')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
  });

  releaseTest('Bun.color advanced inputs require the documented component shapes', () => {
    expect(Bun.color('lab(50% 50 50)', 'hex')).toBe('#ca4b22');
    expect(Bun.color('lch(50% 50 100)', 'hex')).toBe('#7a7a17');
    expect(Bun.color('oklab(50% 0.1 0.1)', 'hex')).toBe('#a14203');
    expect(Bun.color('oklch(50% 0.2 120)', 'hex')).toBe('#5b6d00');
    expect(Bun.color('oklab(0.5 0.1 0.1)', 'hex')).toBeNull();
    expect(Bun.color('hsv(200 80% 70%)', 'hex')).toBeNull();
  });

  releaseTest('Sliced Bun.file() reads respect slice bounds', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'bun-1.4-slice-'));
    try {
      const filePath = join(dir, 'f.bin');
      writeFileSync(filePath, Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]));
      const bytes = new Uint8Array(await Bun.file(filePath).slice(2, 6).arrayBuffer());
      expect([...bytes]).toEqual([2, 3, 4, 5]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  releaseTest('nested ${...} inside ${VAR:-default} in .env parses correctly', () => {
    const dir = mkdtempSync(join(tmpdir(), 'bun-1.4-env-'));
    try {
      writeFileSync(join(dir, '.env'), 'X=${Y:-${Z:-inner}}\n');
      const proc = Bun.spawnSync({
        cmd: [process.execPath, '-e', 'console.log(process.env.X)'],
        cwd: dir,
        env: {
          PATH: process.env.PATH ?? '',
          HOME: process.env.HOME ?? '',
        },
        stdout: 'pipe',
        stderr: 'pipe',
      });
      expect(proc.exitCode).toBe(0);
      expect(proc.stdout.toString().trim()).toBe('inner');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  releaseTest('path.relative and path.toNamespacedPath handle long paths', () => {
    const segment = 'a'.repeat(300);
    const from = path.resolve('/', segment, 'x');
    const to = path.resolve('/', segment, 'y', 'z');
    expect(path.relative(from, to)).toBe(join('..', 'y', 'z'));
    expect(path.toNamespacedPath(from)).toContain(segment);
  });

  releaseTest('multipart Content-Disposition Form-Data matches case-insensitively (#34362)', async () => {
    const boundary = '----case';
    const body = `--${boundary}\r\nContent-Disposition: Form-Data; name="k"\r\n\r\nv\r\n--${boundary}--\r\n`;
    const form = await new Response(body, {
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    }).formData();
    expect(form.get('k')).toBe('v');
  });

  releaseTest('Deeply nested expressions throw a catchable error in Bun.build', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'bun-1.4-deep-'));
    try {
      writeFileSync(
        join(dir, 'deep.ts'),
        `export default ${'('.repeat(20_000)}1${')'.repeat(20_000)};\n`
      );
      await expect(
        Bun.build({ entrypoints: [join(dir, 'deep.ts')], outdir: join(dir, 'out') })
      ).rejects.toBeInstanceOf(AggregateError);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  releaseTest('bunfig.toml type-mismatch errors print human-readable type names', () => {
    const dir = mkdtempSync(join(tmpdir(), 'bun-1.4-bunfig-'));
    try {
      writeFileSync(join(dir, 'bunfig.toml'), 'preload = 123\n');
      const proc = Bun.spawnSync({
        cmd: [process.execPath, '--print', '1'],
        cwd: dir,
        stdout: 'pipe',
        stderr: 'pipe',
      });
      const err = proc.stderr.toString();
      expect(err).toMatch(/Expected preload to be an array/i);
      expect(err).not.toMatch(/expected type: \d+/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  releaseTest('Bun.deepEquals and Bun.inspect tolerate mutation during read', () => {
    let reads = 0;
    const shifting = {
      get x() {
        reads += 1;
        return reads < 3 ? 1 : 2;
      },
    };
    expect(Bun.deepEquals(shifting, shifting)).toBe(true);
    expect(Bun.inspect({ [Bun.inspect.custom]: () => 'safe' })).toContain('safe');
  });
});
