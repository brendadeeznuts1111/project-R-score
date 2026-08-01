// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/guides/util/file-url-to-path — Bun.fileURLToPath
// @see https://bun.com/docs/guides/util/path-to-file-url — Bun.pathToFileURL
import { describe, expect, test } from 'bun:test';
import {
  fileURLToPath,
  moduleDir,
  moduleFile,
  modulePath,
  pathToFileURL,
} from '../lib/bun-path-url.ts';

describe('lib/bun-path-url (Utilities guides)', () => {
  test('round-trip path ↔ file URL', () => {
    const abs = '/tmp/factorywager-util-guide.txt';
    const url = pathToFileURL(abs);
    expect(url.href.startsWith('file://')).toBe(true);
    expect(fileURLToPath(url)).toBe(abs);
    expect(fileURLToPath(url.href)).toBe(abs);
  });

  test('import.meta helpers match native fields (caller meta)', () => {
    expect(modulePath(import.meta)).toBe(import.meta.path);
    expect(moduleDir(import.meta)).toBe(import.meta.dir);
    expect(moduleFile(import.meta)).toBe(import.meta.file);
  });
});
