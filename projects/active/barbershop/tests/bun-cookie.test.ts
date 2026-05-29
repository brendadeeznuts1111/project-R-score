/**
 * Bun Cookie API Tests
 *
 * Tests for Bun.Cookie and Bun.CookieMap integration
 * Based on Bun's official test patterns
 */

import { describe, test, expect } from 'bun:test';
import { BunCookieManager, cookieManager } from '../lib/cloudflare/bun-data-api';

describe('Bun.Cookie API', () => {
  describe('BunCookieManager', () => {
    test('creates instance', () => {
      const manager = new BunCookieManager();
      expect(manager).toBeDefined();
    });

    test('sets and gets cookie', () => {
      const manager = new BunCookieManager();
      manager.set('test', 'value');
      const cookie = manager.get('test');
      expect(cookie).toBeDefined();
      expect(cookie?.value).toBe('value');
    });

    test('checks cookie existence', () => {
      const manager = new BunCookieManager();
      manager.set('exists', 'yes');
      expect(manager.has('exists')).toBe(true);
      expect(manager.has('missing')).toBe(false);
    });

    test('deletes cookie', () => {
      const manager = new BunCookieManager();
      manager.set('delete', 'me');
      expect(manager.has('delete')).toBe(true);
      manager.delete('delete');
      expect(manager.has('delete')).toBe(false);
    });

    test('clears all cookies', () => {
      const manager = new BunCookieManager();
      manager.set('a', '1');
      manager.set('b', '2');
      manager.clear();
      expect(manager.has('a')).toBe(false);
      expect(manager.has('b')).toBe(false);
    });

    test('sets cookie with options', () => {
      const manager = new BunCookieManager();
      manager.set('session', 'abc123', {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/',
        maxAge: 3600,
      });

      const cookie = manager.get('session');
      expect(cookie).toBeDefined();
      expect(cookie?.httpOnly).toBe(true);
      expect(cookie?.secure).toBe(true);
      expect(cookie?.sameSite).toBe('strict');
    });

    test('serializes cookie', () => {
      const manager = new BunCookieManager();
      manager.set('simple', 'value');
      const serialized = manager.serialize('simple');
      expect(serialized).toBeDefined();
      expect(serialized).toContain('simple=value');
    });

    test('parses cookie header', () => {
      const manager = new BunCookieManager();
      manager.parse('foo=bar; baz=qux');
      expect(manager.get('foo')?.value).toBe('bar');
      expect(manager.get('baz')?.value).toBe('qux');
    });

    test('handles URL-encoded values', () => {
      const manager = new BunCookieManager();
      manager.parse('encoded=hello%20world');
      expect(manager.get('encoded')?.value).toBe('hello world');
    });

    test('gets all cookies', () => {
      const manager = new BunCookieManager();
      manager.set('x', '1');
      manager.set('y', '2');
      const all = manager.getAll();
      expect(all.size).toBe(2);
      expect(all.has('x')).toBe(true);
      expect(all.has('y')).toBe(true);
    });
  });

  describe('Singleton cookieManager', () => {
    test('is available', () => {
      expect(cookieManager).toBeDefined();
    });

    test('maintains state', () => {
      cookieManager.set('singleton', 'test');
      expect(cookieManager.has('singleton')).toBe(true);
      // Clean up
      cookieManager.delete('singleton');
    });
  });

  describe('Cookie Attributes', () => {
    test('sets domain', () => {
      const manager = new BunCookieManager();
      manager.set('domain', 'value', { domain: '.example.com' });
      const cookie = manager.get('domain');
      expect(cookie?.domain).toBe('.example.com');
    });

    test('sets path', () => {
      const manager = new BunCookieManager();
      manager.set('path', 'value', { path: '/api' });
      const cookie = manager.get('path');
      expect(cookie?.path).toBe('/api');
    });

    test('sets expires', () => {
      const manager = new BunCookieManager();
      const expires = new Date('2025-12-31');
      manager.set('expires', 'value', { expires });
      const cookie = manager.get('expires');
      expect(cookie?.expires).toEqual(expires);
    });

    test('sets maxAge', () => {
      const manager = new BunCookieManager();
      manager.set('maxage', 'value', { maxAge: 3600 });
      const cookie = manager.get('maxage');
      expect(cookie?.maxAge).toBe(3600);
    });

    test('sets partitioned', () => {
      const manager = new BunCookieManager();
      manager.set('partitioned', 'value', { partitioned: true });
      const cookie = manager.get('partitioned');
      expect(cookie?.partitioned).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('handles empty value', () => {
      const manager = new BunCookieManager();
      manager.set('empty', '');
      expect(manager.get('empty')?.value).toBe('');
    });

    test('handles special characters', () => {
      const manager = new BunCookieManager();
      manager.set('special', 'a=b&c=d');
      const serialized = manager.serialize('special');
      // Special characters are URL-encoded in output
      expect(serialized).toContain('special=');
      expect(serialized).toBeDefined();
    });

    test('handles unicode', () => {
      const manager = new BunCookieManager();
      manager.set('unicode', 'hello 🎉');
      expect(manager.get('unicode')?.value).toBe('hello 🎉');
    });

    test('overwrite existing cookie', () => {
      const manager = new BunCookieManager();
      manager.set('overwrite', 'first');
      manager.set('overwrite', 'second');
      expect(manager.get('overwrite')?.value).toBe('second');
    });
  });

  describe('Native Bun.Cookie', () => {
    test('creates cookie with defaults', () => {
      const cookie = new Bun.Cookie('name', 'value');
      expect(cookie.name).toBe('name');
      expect(cookie.value).toBe('value');
      expect(cookie.path).toBe('/');
      expect(cookie.domain).toBeNull();
      expect(cookie.expires).toBeUndefined();
      expect(cookie.secure).toBe(false);
      expect(cookie.sameSite).toBe('lax');
    });

    test('creates cookie with options', () => {
      const cookie = new Bun.Cookie('name', 'value', {
        domain: 'example.com',
        path: '/foo',
        expires: 123456789,
        secure: true,
        sameSite: 'strict',
      });

      expect(cookie.name).toBe('name');
      expect(cookie.value).toBe('value');
      expect(cookie.domain).toBe('example.com');
      expect(cookie.path).toBe('/foo');
      expect(cookie.expires).toEqual(new Date(123456789000));
      expect(cookie.secure).toBe(true);
      expect(cookie.sameSite).toBe('strict');
    });

    test('stringifies cookie', () => {
      const cookie = new Bun.Cookie('name', 'value', {
        domain: 'example.com',
        path: '/foo',
        secure: true,
        sameSite: 'lax',
      });

      expect(cookie.toString()).toBe(
        'name=value; Domain=example.com; Path=/foo; Secure; SameSite=Lax'
      );
    });

    test('parses cookie string', () => {
      const cookie = Bun.Cookie.parse(
        'name=value; Domain=example.com; Path=/foo; Secure; SameSite=Lax'
      );

      expect(cookie.name).toBe('name');
      expect(cookie.value).toBe('value');
      expect(cookie.domain).toBe('example.com');
      expect(cookie.path).toBe('/foo');
      expect(cookie.secure).toBe(true);
      expect(cookie.sameSite).toBe('lax');
    });

    test('converts to JSON', () => {
      const cookie = new Bun.Cookie('name', 'value', {
        domain: 'example.com',
        path: '/foo',
      });
      expect(cookie.toJSON()).toEqual({
        name: 'name',
        value: 'value',
        domain: 'example.com',
        path: '/foo',
        secure: false,
        sameSite: 'lax',
        httpOnly: false,
        partitioned: false,
      });
    });
  });

  describe('Native Bun.CookieMap', () => {
    test('creates empty map', () => {
      const map = new Bun.CookieMap();
      expect(map.size).toBe(0);
    });

    test('creates from string', () => {
      const map = new Bun.CookieMap('name=value; foo=bar');
      expect(map.size).toBe(2);
      expect(map.has('name')).toBe(true);
      expect(map.has('foo')).toBe(true);
      expect(map.get('name')).toBe('value');
      expect(map.get('foo')).toBe('bar');
    });

    test('creates from object', () => {
      const map = new Bun.CookieMap({
        name: 'value',
        foo: 'bar',
      });

      expect(map.size).toBe(2);
      expect(map.has('name')).toBe(true);
      expect(map.has('foo')).toBe(true);
      expect(map.get('name')).toBe('value');
      expect(map.get('foo')).toBe('bar');
    });

    test('creates from pairs', () => {
      const map = new Bun.CookieMap([
        ['name', 'value'],
        ['foo', 'bar'],
      ]);

      expect(map.size).toBe(2);
      expect(map.has('name')).toBe(true);
      expect(map.has('foo')).toBe(true);
      expect(map.get('name')).toBe('value');
      expect(map.get('foo')).toBe('bar');
    });

    test('sets and gets cookies', () => {
      const map = new Bun.CookieMap();

      map.set('name', 'value');
      expect(map.size).toBe(1);
      expect(map.has('name')).toBe(true);
      expect(map.get('name')).toBe('value');

      map.set('foo', 'bar');
      expect(map.size).toBe(2);
      expect(map.has('foo')).toBe(true);
      expect(map.get('foo')).toBe('bar');
    });

    test('sets Cookie object', () => {
      const map = new Bun.CookieMap();
      const cookie = new Bun.Cookie('name', 'value', {
        domain: 'example.com',
        path: '/foo',
        secure: true,
        sameSite: 'lax',
      });

      map.set(cookie);
      expect(map.size).toBe(1);
      expect(map.has('name')).toBe(true);
      expect(map.get('name')).toBe('value');
    });

    test('deletes cookies', () => {
      const map = new Bun.CookieMap('name=value; foo=bar');
      expect(map.size).toBe(2);

      map.delete('name');
      expect(map.size).toBe(1);
      expect(map.has('name')).toBe(false);
      expect(map.has('foo')).toBe(true);

      map.delete('foo');
      expect(map.size).toBe(0);
      expect(map.has('foo')).toBe(false);
    });

    test('gets Set-Cookie headers', () => {
      const map = new Bun.CookieMap();
      const cookie = new Bun.Cookie('name', 'value', {
        domain: 'example.com',
        path: '/foo',
        secure: true,
        sameSite: 'lax',
      });

      map.set(cookie);
      const headers = map.toSetCookieHeaders();
      expect(headers).toContain('name=value; Domain=example.com; Path=/foo; Secure; SameSite=Lax');
    });
  });
});
