// @see https://bun.com/blog/bun-v1.4#bug-fixes — Bun 1.4.0 Bug fixes
/**
 * Executable proofs for high-signal Bun 1.4.0 Bug fixes (safe / in-process tier).
 * Inventory section: packages/bun-release-contracts/contracts/bun-v1.4.0.json → "Bug fixes"
 * Other behavior contracts: tests/bun-1.4.0-behavior-contract.test.ts
 */
import { afterAll, describe, expect, jest, mock, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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
