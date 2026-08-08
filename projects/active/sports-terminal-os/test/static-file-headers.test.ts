import { describe, expect, it } from 'bun:test';
import {
  getStaticFileHeaders,
  getStaticMimeType,
} from '../src/utils/static-file-headers';

describe('static frontend headers', () => {
  it('caches content-hashed assets immutably', () => {
    expect(getStaticFileHeaders('/assets/index-AbC123.js', 'application/javascript')).toEqual({
      'Content-Type': 'application/javascript',
      'Cache-Control': 'public, max-age=31536000, immutable',
    });
  });

  it('requires HTML entry points to revalidate', () => {
    expect(getStaticFileHeaders('/', 'text/html')['Cache-Control']).toBe('no-cache');
    expect(getStaticFileHeaders('/sportsbook', 'text/html')['Cache-Control']).toBe('no-cache');
  });

  it('uses the expected font MIME with immutable asset caching', () => {
    const contentType = getStaticMimeType('woff2');
    expect(contentType).toBe('font/woff2');
    expect(getStaticFileHeaders('/assets/geist-latin.woff2', contentType)).toEqual({
      'Content-Type': 'font/woff2',
      'Cache-Control': 'public, max-age=31536000, immutable',
    });
  });
});
