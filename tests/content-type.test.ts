// @see https://bun.com/docs/test/index#run-tests
// @see https://bun.com/docs/runtime/networking/fetch#content-type-handling — Content-Type
import { describe, expect, test } from 'bun:test';
import {
  CT_JSON,
  contentTypePolicyCatalog,
  contentTypePolicyTableRows,
  decideFromResponse,
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
  summarizeContentTypeMatrix,
} from '../lib/http/content-type.ts';

describe('content-type deep matrix (default|our|wire|expected|status)', () => {
  test('FormData: default multipart, our —, wire has boundary, status ok', () => {
    const form = new FormData();
    form.set('file', jsonFile({ ok: true }, 'x.json'));
    const d = decideRequestContentType(form, { id: 'formdata' });
    expect(normalizeContentType(d.defaultValue)).toBe('multipart/form-data');
    expect(d.ourValue).toBe('—');
    expect(isMultipartContentType(d.wireValue)).toBe(true);
    expect(d.wireValue).toContain('boundary=');
    expect(normalizeContentType(d.expected)).toBe('multipart/form-data');
    expect(d.status).toBe('ok');
    expect(d.severity).toBe('pass');
    expect(d.bunMechanism).toBe('formdata-multipart');
    expect(d.match.wireVsExpected).toBe(true);
  });

  test('FormData + manual Content-Type → override fail', () => {
    const form = new FormData();
    form.set('x', '1');
    const d = decideRequestContentType(form, {
      id: 'bad',
      explicitOurHeader: 'multipart/form-data',
    });
    expect(d.status).toBe('override');
    expect(d.severity).toBe('fail');
  });

  test('JSON Blob: wire carries blob.type', () => {
    const blob = jsonBlob({ a: 1 });
    const d = decideRequestContentType(blob);
    expect(isJsonContentType(d.defaultValue)).toBe(true);
    expect(d.ourValue).toBe('—');
    expect(isJsonContentType(d.wireValue)).toBe(true);
    expect(d.status).toBe('ok');
    expect(d.bunMechanism).toBe('blob-type');
  });

  test('JSON string: default empty, our CT_JSON, wire empty until header applied', () => {
    const d = decideRequestContentType('{"a":1}');
    expect(d.defaultValue).toBe('—');
    expect(d.ourValue).toBe(CT_JSON);
    expect(normalizeContentType(d.expected)).toBe('application/json');
    expect(d.status).toBe('ok');
    expect(d.bunMechanism).toBe('none');
  });

  test('JSON string with forced empty header → missing fail', () => {
    const d = decideRequestContentType('{"a":1}', {
      id: 'no-ct',
      explicitOurHeader: '',
    });
    expect(d.ourValue).toBe('—');
    expect(d.status).toBe('missing');
    expect(d.severity).toBe('fail');
  });

  test('response path: four columns + severity', () => {
    const d = decideResponseContentType('public/x.json');
    expect(d.defaultValue).toBe('—');
    expect(d.ourValue).toBe(CT_JSON);
    expect(d.wireValue).toBe(CT_JSON);
    expect(d.expected).toBe(CT_JSON);
    expect(d.status).toBe('ok');
    expect(d.side).toBe('response');
  });

  test('decideFromResponse uses live wire header', () => {
    const res = new Response('{}', { headers: { 'Content-Type': CT_JSON } });
    const d = decideFromResponse('public/a.json', res);
    expect(d.wireValue).toBe(CT_JSON);
    expect(d.status).toBe('ok');

    const bad = decideFromResponse(
      'public/a.json',
      new Response('x', { headers: { 'Content-Type': 'text/plain' } })
    );
    expect(bad.status).toBe('mismatch');
    expect(bad.severity).toBe('fail');
  });

  test('evaluateContentType mismatch when our ≠ expected', () => {
    const d = evaluateContentType({
      id: 'x',
      label: 'x',
      side: 'response',
      defaultValue: '',
      ourValue: 'text/plain',
      wireValue: 'text/plain',
      expected: CT_JSON,
    });
    expect(d.status).toBe('mismatch');
    expect(d.match.ourVsExpected).toBe(false);
  });

  test('catalog + summary: all rows have five CT columns', () => {
    const catalog = contentTypePolicyCatalog();
    expect(catalog.length).toBeGreaterThanOrEqual(15);
    for (const r of catalog) {
      expect(r).toHaveProperty('defaultValue');
      expect(r).toHaveProperty('ourValue');
      expect(r).toHaveProperty('wireValue');
      expect(r).toHaveProperty('expected');
      expect(r).toHaveProperty('status');
      expect(r).toHaveProperty('severity');
    }
    const summary = summarizeContentTypeMatrix(catalog);
    expect(summary.total).toBe(catalog.length);
    expect(summary.pass + summary.warn + summary.fail).toBe(summary.total);

    const table = contentTypePolicyTableRows(catalog);
    expect(table[0]).toHaveProperty('wireValue');
    expect(table[0]).toHaveProperty('severity');
  });

  test('intentional bad rows are fail severity', () => {
    const catalog = contentTypePolicyCatalog();
    const override = catalog.find(c => c.id === 'formdata-manual-ct-override');
    const missing = catalog.find(c => c.id === 'json-string-missing-ct');
    expect(override?.status).toBe('override');
    expect(override?.severity).toBe('fail');
    expect(missing?.status).toBe('missing');
    expect(missing?.severity).toBe('fail');
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
