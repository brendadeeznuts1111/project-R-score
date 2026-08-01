// @see https://bun.com/docs/test/writing-tests
import { describe, expect, test } from 'bun:test';
import { canonicalSlashRedirect } from '../lib/http/canonical-redirect.ts';

describe('canonical slash redirect', () => {
  test('301s to the directory form', () => {
    const res = canonicalSlashRedirect(new Request('http://localhost:3000/portal/ops'), '/portal/ops/');
    expect(res.status).toBe(301);
    expect(res.headers.get('Location')).toBe('/portal/ops/');
  });

  test('preserves the query string (tenant and filters survive canonicalization)', () => {
    const res = canonicalSlashRedirect(
      new Request('http://localhost:3000/portal?tenant=factory'),
      '/portal/'
    );
    expect(res.headers.get('Location')).toBe('/portal/?tenant=factory');

    const board = canonicalSlashRedirect(
      new Request('http://localhost:3000/portal/ops?view=summary&plane=ops'),
      '/portal/ops/'
    );
    expect(board.headers.get('Location')).toBe('/portal/ops/?view=summary&plane=ops');
  });

  test('empty query stays clean (no dangling ?)', () => {
    const res = canonicalSlashRedirect(new Request('http://localhost:3000/portal'), '/portal/');
    expect(res.headers.get('Location')).toBe('/portal/');
  });
});
