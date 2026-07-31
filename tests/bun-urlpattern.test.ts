// @see https://bun.com/blog/bun-v1.3.4#urlpattern-api — component properties / groups
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
import { RegistryGatewayPatterns } from '../lib/factory/server.ts';
import { parsePortalMdPath, PortalMarkdownPattern } from '../lib/http/portal-nav.ts';

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

  test('exposes every component property and matched group', () => {
    const componentPattern = new URLPattern({
      protocol: 'https',
      username: ':user',
      password: ':password',
      hostname: 'example.com',
      port: ':port',
      pathname: '/users/:id',
      search: 'q=:query',
      hash: 'section-:section',
    });

    expect({
      protocol: componentPattern.protocol,
      username: componentPattern.username,
      password: componentPattern.password,
      hostname: componentPattern.hostname,
      port: componentPattern.port,
      pathname: componentPattern.pathname,
      search: componentPattern.search,
      hash: componentPattern.hash,
    }).toEqual({
      protocol: 'https',
      username: ':user',
      password: ':password',
      hostname: 'example.com',
      port: ':port',
      pathname: '/users/:id',
      search: 'q=:query',
      hash: 'section-:section',
    });
    expect(componentPattern.hasRegExpGroups).toBe(false);

    const match = componentPattern.exec(
      'https://reader:token@example.com:8443/users/42?q=urlpattern#section-routing'
    );
    expect(match?.username.groups.user).toBe('reader');
    expect(match?.password.groups.password).toBe('token');
    expect(match?.port.groups.port).toBe('8443');
    expect(match?.pathname.groups.id).toBe('42');
    expect(match?.search.groups.query).toBe('urlpattern');
    expect(match?.hash.groups.section).toBe('routing');
  });

  test('drives real registry and portal route captures', () => {
    const publish = RegistryGatewayPatterns.publish.exec(
      'https://registry.test/api/registry/@factorywager/sdk/versions'
    );
    expect(publish?.pathname.groups.package).toBe('@factorywager/sdk');
    expect(RegistryGatewayPatterns.publish.hostname).toBe('*');
    expect(RegistryGatewayPatterns.publish.port).toBe('*');

    expect(PortalMarkdownPattern.hasRegExpGroups).toBe(true);
    expect(parsePortalMdPath('/portal/Ops-Loop.md')).toBe('ops-loop');
    expect(parsePortalMdPath('/portal/not_allowed.md')).toBeNull();
  });
});
