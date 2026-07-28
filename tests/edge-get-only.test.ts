// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import { resolvePath } from '../scripts/lib/fs-bun';
import { getOnly } from '../functions/api/_get-only.ts';
import { onRequest } from '../functions/api/operations/summary.ts';

const ROOT = resolvePath(import.meta.dir, '..');

describe('edge-get-only', () => {
  test('getOnly allows GET/HEAD/OPTIONS', () => {
    for (const method of ['GET', 'HEAD', 'OPTIONS']) {
      expect(getOnly(new Request('https://x/api/anything', { method }))).toBeNull();
    }
  });

  test('getOnly blocks POST/PUT/DELETE with 405 + Allow header', async () => {
    for (const method of ['POST', 'PUT', 'DELETE']) {
      const res = getOnly(new Request('https://x/api/anything', { method }));
      expect(res).not.toBeNull();
      if (!res) throw new Error('expected 405 response');
      expect(res.status).toBe(405);
      expect(res.headers.get('Allow')).toBe('GET, HEAD, OPTIONS');
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe('Method not allowed');
    }
  });

  test('operations/summary onRequest returns 405 for POST', async () => {
    const res = await onRequest({
      request: new Request('https://x/api/operations/summary', { method: 'POST' }),
      env: {},
    });
    expect(res.status).toBe(405);
    expect(res.headers.get('Allow')).toBe('GET, HEAD, OPTIONS');
  });

  test('operations/summary onRequest still serves GET (200 or 503, never 405)', async () => {
    const res = await onRequest({
      request: new Request('https://x/api/operations/summary'),
      env: {},
    });
    // 200 when the snapshot is reachable, 503 when it is not — but never 405
    expect([200, 503]).toContain(res.status);
  });

  test('guard wiring present in all 12 read-only Pages Functions', async () => {
    const guarded = [
      'functions/api/defaults/script.meta.ts',
      'functions/api/defaults/script.ts',
      'functions/api/doc-refs/index.ts',
      'functions/api/doc-refs/script.meta.ts',
      'functions/api/doc-refs/script.ts',
      'functions/api/limits/analyze.ts',
      'functions/api/networking/script.meta.ts',
      'functions/api/networking/script.ts',
      'functions/api/operations/summary.ts',
      'functions/api/release/script.meta.ts',
      'functions/api/release/script.ts',
      'functions/api/sqlite/version.ts',
    ];
    for (const rel of guarded) {
      const src = await Bun.file(resolvePath(ROOT, rel)).text();
      expect(src).toContain("import { getOnly } from '../_get-only.ts';");
      expect(src).toContain('const blocked = getOnly(context.request);');
      expect(src).toContain('if (blocked) return blocked;');
    }
  });
});
