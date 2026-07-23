// @see https://bun.com/docs/test/index#run-tests
// @see https://bun.com/docs/runtime/networking/fetch#content-type-handling — Content-Type
import { describe, expect, test } from 'bun:test';
import {
  CT_JSON,
  contentTypePolicyCatalog,
  contentTypePolicyTableRows,
  decideRequestContentType,
  decideResponseContentType,
  evaluateContentType,
  fetchHeadersForBody,
  guessContentType,
  isJsonContentType,
  isMultipartContentType,
  jsonBlob,
  jsonFile,
  normalizeContentType,
} from '../lib/http/content-type.ts';

describe('content-type (defaultValue | ourValue | expected | status)', () => {
  test('FormData: default multipart, our empty, expected multipart → ok', () => {
    const form = new FormData();
    form.set('file', jsonFile({ ok: true }, 'x.json'));
    const d = decideRequestContentType(form, { id: 'formdata' });
    expect(normalizeContentType(d.defaultValue)).toBe('multipart/form-data');
    expect(d.ourValue).toBe('—');
    expect(normalizeContentType(d.expected)).toBe('multipart/form-data');
    expect(d.status).toBe('ok');

    const req = new Request('http://example.test/upload', { method: 'POST', body: form });
    expect(isMultipartContentType(req.headers.get('content-type'))).toBe(true);
  });

  test('FormData + manual Content-Type → override (bad)', () => {
    const form = new FormData();
    form.set('x', '1');
    const d = decideRequestContentType(form, {
      id: 'bad',
      explicitOurHeader: 'multipart/form-data',
    });
    expect(d.status).toBe('override');
  });

  test('JSON Blob: Bun default from blob.type, we defer → ok', () => {
    const blob = jsonBlob({ a: 1 });
    const d = decideRequestContentType(blob);
    expect(isJsonContentType(d.defaultValue)).toBe(true);
    expect(d.ourValue).toBe('—');
    expect(d.status).toBe('ok');
  });

  test('JSON string: Bun default empty, our CT_JSON, expected json → ok', () => {
    const d = decideRequestContentType('{"a":1}');
    expect(d.defaultValue).toBe('—');
    expect(d.ourValue).toBe(CT_JSON);
    expect(normalizeContentType(d.expected)).toBe('application/json');
    expect(d.status).toBe('ok');
  });

  test('JSON string with forced empty header → missing', () => {
    const d = decideRequestContentType('{"a":1}', {
      id: 'no-ct',
      explicitOurHeader: '',
    });
    expect(d.ourValue).toBe('—');
    expect(d.status).toBe('missing');
  });

  test('response path decision separates default empty vs our guess', () => {
    const d = decideResponseContentType('public/x.json');
    expect(d.defaultValue).toBe('—');
    expect(d.ourValue).toBe(CT_JSON);
    expect(d.expected).toBe(CT_JSON);
    expect(d.status).toBe('ok');
    expect(d.side).toBe('response');
  });

  test('evaluateContentType mismatch when our ≠ expected', () => {
    const d = evaluateContentType({
      id: 'x',
      label: 'x',
      side: 'response',
      defaultValue: '',
      ourValue: 'text/plain',
      expected: CT_JSON,
    });
    expect(d.status).toBe('mismatch');
  });

  test('policy catalog rows have all four columns + status', () => {
    const rows = contentTypePolicyTableRows();
    expect(rows.length).toBeGreaterThanOrEqual(6);
    for (const r of rows) {
      expect(r).toHaveProperty('defaultValue');
      expect(r).toHaveProperty('ourValue');
      expect(r).toHaveProperty('expected');
      expect(r).toHaveProperty('status');
    }
    // FormData bad override is in catalog as override
    const bad = contentTypePolicyCatalog().find(c => c.id === 'formdata-override-bad');
    expect(bad?.status).toBe('override');
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
