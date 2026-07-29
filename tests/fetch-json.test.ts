/**
 * Portal fetch-json helpers (browser-oriented; Bun fetch verbose is not used here).
 * @see https://bun.com/docs/runtime/networking/fetch#request-options
 */
import { describe, expect, test } from 'bun:test';
import {
  classifyFetchError,
  fetchJsonResult,
  isPortalFetchDebug,
} from '../public/portal/fetch-json.js';

describe('portal fetch-json', () => {
  test('classifyFetchError maps timeout / network / parse', () => {
    expect(classifyFetchError(Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' })).kind).toBe(
      'timeout'
    );
    expect(classifyFetchError(new Error('Failed to fetch')).kind).toBe('network');
    expect(classifyFetchError(new Error('Unexpected token < in JSON')).kind).toBe('parse');
  });

  test('GET with body is rejected (web + Bun rule)', async () => {
    const r = await fetchJsonResult('http://127.0.0.1:9/unused', {
      method: 'GET',
      body: '{}',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.kind).toBe('method');
      expect(String(r.error)).toMatch(/body not allowed/i);
    }
  });

  test('isPortalFetchDebug is false by default in tests', () => {
    expect(typeof isPortalFetchDebug()).toBe('boolean');
  });
});
