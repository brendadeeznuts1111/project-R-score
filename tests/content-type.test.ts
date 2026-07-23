// @see https://bun.com/docs/test/index#run-tests
// @see https://bun.com/docs/runtime/networking/fetch#content-type-handling — Content-Type
import { describe, expect, test } from 'bun:test';
import {
  CT_JSON,
  fetchHeadersForBody,
  guessContentType,
  isJsonContentType,
  isMultipartContentType,
  jsonBlob,
  jsonFile,
} from '../lib/http/content-type.ts';

describe('content-type (Bun fetch auto CT)', () => {
  test('FormData Request gets multipart Content-Type with boundary', () => {
    const form = new FormData();
    form.set('file', jsonFile({ ok: true }, 'x.json'));
    const req = new Request('http://example.test/upload', { method: 'POST', body: form });
    const ct = req.headers.get('content-type');
    expect(isMultipartContentType(ct)).toBe(true);
    expect(ct).toContain('boundary=');
  });

  test('Blob body gets type from blob.type', () => {
    const blob = jsonBlob({ a: 1 });
    expect(blob.type).toMatch(/application\/json/);
    const req = new Request('http://example.test', { method: 'POST', body: blob });
    expect(isJsonContentType(req.headers.get('content-type'))).toBe(true);
  });

  test('plain string body has no auto Content-Type', () => {
    const req = new Request('http://example.test', {
      method: 'POST',
      body: JSON.stringify({ a: 1 }),
    });
    expect(req.headers.get('content-type')).toBeNull();
  });

  test('fetchHeadersForBody leaves FormData CT unset', () => {
    const form = new FormData();
    form.set('x', '1');
    const h = fetchHeadersForBody(form, { Authorization: 'Bearer t' });
    expect(h.get('Authorization')).toBe('Bearer t');
    expect(h.get('Content-Type')).toBeNull();
  });

  test('fetchHeadersForBody sets JSON for string bodies', () => {
    const h = fetchHeadersForBody('{"a":1}');
    expect(h.get('Content-Type')).toBe(CT_JSON);
  });

  test('guessContentType for response paths', () => {
    expect(guessContentType('public/x.json')).toBe(CT_JSON);
    expect(guessContentType('/a/b.html')).toContain('text/html');
    expect(guessContentType('chart.svg')).toBe('image/svg+xml');
    expect(guessContentType('pkg.tgz')).toBe('application/gzip');
  });
});
