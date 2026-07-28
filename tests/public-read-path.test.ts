// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import { isPublicReadPath } from '../lib/http/public-read-path.ts';

describe('public read plane', () => {
  test('keeps portal chrome, proof, and brand assets public', () => {
    for (const path of [
      '/portal/style.css',
      '/registry/portal-weave.json',
      '/icons/factory/mark-32.webp',
      '/site.webmanifest',
    ]) {
      expect(isPublicReadPath(path)).toBe(true);
    }
  });

  test('does not open private root or mutation paths', () => {
    expect(isPublicReadPath('/')).toBe(false);
    expect(isPublicReadPath('/private')).toBe(false);
    expect(isPublicReadPath('/site.webmanifest.bak')).toBe(false);
  });
});
