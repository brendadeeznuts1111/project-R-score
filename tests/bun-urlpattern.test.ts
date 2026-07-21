// @see https://bun.com/blog/bun-v1.3.12#urlpattern-is-up-to-2-3x-faster — URLPattern
// @see https://bun.com/docs/test/index#run-tests — bun:test
/**
 * Spine smoke: URLPattern test/exec (Bun 1.3.12+ faster path).
 *
 * Blog vector: pathname /api/users/:id/posts/:postId
 * Mechanism: compiled regex path; fewer per-call JS/GC temps (ship note).
 * Side effect: internals must not clobber RegExp.lastMatch / RegExp.$N.
 *
 *   bun test tests/bun-urlpattern.test.ts
 */
import { describe, expect, test } from 'bun:test';

const PATH = '/api/users/:id/posts/:postId';
const HREF = 'https://example.com/api/users/42/posts/123';

describe('URLPattern (Bun 1.3.12+)', () => {
  const pattern = new URLPattern({ pathname: PATH });

  test('test matches blog vector (string + URL)', () => {
    // Blog: ~2.16× faster than prior Bun on this shape
    expect(pattern.test(HREF)).toBe(true);
    expect(pattern.test(new URL(HREF))).toBe(true);
    expect(pattern.test('https://example.com/other')).toBe(false);
  });

  test('exec extracts named groups', () => {
    // Blog: ~1.43× faster than prior Bun on this shape
    const m = pattern.exec(HREF);
    expect(m?.pathname.groups).toEqual({ id: '42', postId: '123' });

    const fromUrl = pattern.exec(new URL(HREF));
    expect(fromUrl?.pathname.groups.id).toBe('42');
    expect(fromUrl?.pathname.groups.postId).toBe('123');
  });

  test('does not pollute RegExp.$N / lastMatch', () => {
    // Establish legacy statics from a normal JS match, then route-match.
    // Pre-1.3.12: URLPattern internals could overwrite these.
    'hello'.match(/h(e)llo/);
    expect(RegExp.$1).toBe('e');
    expect(RegExp.lastMatch).toBe('hello');

    pattern.test(HREF);
    pattern.exec(HREF);

    expect(RegExp.$1).toBe('e');
    expect(RegExp.lastMatch).toBe('hello');
  });

  test('search patterns extract query groups', () => {
    const q = new URLPattern({ search: 'id=:id' });
    expect(q.exec({ search: 'id=123' })?.search.groups.id).toBe('123');
  });
});
