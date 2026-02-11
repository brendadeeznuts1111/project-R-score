#!/usr/bin/env bun
import { describe, expect, test } from 'bun:test';
import { getProxyConfigForTarget, shouldBypassProxy } from '../../src/utils/fetch-utils';

describe('fetch-utils proxy safety', () => {
  test('bypasses localhost and private ranges', () => {
    expect(shouldBypassProxy('localhost')).toBe(true);
    expect(shouldBypassProxy('127.0.0.1')).toBe(true);
    expect(shouldBypassProxy('10.10.10.10')).toBe(true);
    expect(shouldBypassProxy('192.168.1.10')).toBe(true);
    expect(shouldBypassProxy('metadata.google.internal')).toBe(true);
  });

  test('respects wildcard and NO_PROXY patterns', () => {
    expect(shouldBypassProxy('api.internal', '*.internal')).toBe(true);
    expect(shouldBypassProxy('svc.corp', '')).toBe(true);
    expect(shouldBypassProxy('example.com', 'example.com,localhost')).toBe(true);
    expect(shouldBypassProxy('public.example.com', 'localhost')).toBe(false);
  });

  test('returns no proxy for denied targets', () => {
    const result = getProxyConfigForTarget('http://localhost:3000', {
      proxy: 'http://proxy.local:8080',
    });
    expect(result.proxied).toBe(false);
    expect(result.proxy).toBeUndefined();
  });

  test('returns proxy for public targets', () => {
    const result = getProxyConfigForTarget('https://bun.com', {
      proxy: 'http://proxy.local:8080',
      noProxy: 'localhost,127.0.0.1',
    });
    expect(result.proxied).toBe(true);
    expect(result.proxy).toBe('http://proxy.local:8080');
  });
});

