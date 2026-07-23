// @see https://bun.com/docs/test/index#run-tests
// @see https://bun.com/docs/guides/http/file-uploads#upload-files-via-http-using-formdata — FormData
import { afterAll, describe, expect, test } from 'bun:test';
import {
  buildFileUploadForm,
  formString,
  isFormBlob,
  requireFormBlob,
  sha256Blob,
  writeFormBlob,
} from '../lib/http/form-upload.ts';
import { isMultipartContentType } from '../lib/http/content-type.ts';

const TMP = `.tmp/form-upload-${Bun.randomUUIDv7().slice(0, 8)}`;

afterAll(async () => {
  await Bun.$`rm -rf ${TMP}`.quiet();
});

describe('form-upload (Bun file-uploads guide)', () => {
  test('requireFormBlob accepts File and Blob; rejects strings', () => {
    const form = new FormData();
    form.set('file', new File([new Uint8Array([1, 2, 3])], 'a.tgz', { type: 'application/gzip' }));
    form.set('name', 'hello');
    const ok = requireFormBlob(form, 'file');
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.filename).toBe('a.tgz');
      expect(ok.blob.size).toBe(3);
      expect(isFormBlob(ok.blob)).toBe(true);
    }
    expect(requireFormBlob(form, 'name').ok).toBe(false);
    expect(formString(form, 'name')).toBe('hello');
  });

  test('Bun.write via writeFormBlob persists upload Blob', async () => {
    await Bun.$`mkdir -p ${TMP}`.quiet();
    const blob = new Blob([new Uint8Array([9, 8, 7])], { type: 'application/gzip' });
    const path = `${TMP}/artifact.tgz`;
    const n = await writeFormBlob(path, blob);
    expect(n).toBeGreaterThan(0);
    expect(await Bun.file(path).exists()).toBe(true);
    const got = new Uint8Array(await Bun.file(path).bytes());
    expect([...got]).toEqual([9, 8, 7]);
    expect(await sha256Blob(blob)).toMatch(/^[a-f0-9]{64}$/);
  });

  test('client FormData sets multipart without manual Content-Type', () => {
    const form = buildFileUploadForm({
      file: new Blob([1, 2], { type: 'application/gzip' }),
      filename: 'pkg.tgz',
      fields: { version: '1.0.0' },
    });
    const req = new Request('http://registry.test/api/registry/demo/versions', {
      method: 'POST',
      body: form,
    });
    expect(isMultipartContentType(req.headers.get('content-type'))).toBe(true);
    expect(form.get('version')).toBe('1.0.0');
  });
});
