import { afterAll, describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import {
  bunFileMeta,
  mimeFromBunFile,
  openBunFile,
  resolveUnderRoot,
  respondBunFile,
  writeAndRespondBunFile,
} from '../lib/operator-research/http/bun-file.ts';
import { FIXTURES_DIR, ROOT } from '../lib/operator-research/paths.ts';

const tmpDir = join(import.meta.dir, '.tmp-operator-bun-file');

afterAll(async () => {
  try {
    await Bun.$`rm -rf ${tmpDir}`.quiet();
  } catch {
    /* ignore */
  }
});

describe('operator-research Bun.file + MIME', () => {
  test('mimeFromBunFile uses BunFile.type for known extensions', () => {
    const png = openBunFile(join(FIXTURES_DIR, 'placeholder.png'));
    expect(mimeFromBunFile(png)).toContain('image/png');

    const html = openBunFile(join(FIXTURES_DIR, 'hardrock.html'));
    expect(mimeFromBunFile(html)).toContain('text/html');

    const json = openBunFile(join(FIXTURES_DIR, 'odds/hardrock.json'));
    expect(mimeFromBunFile(json)).toContain('application/json');

    const toml = openBunFile(join(ROOT, 'config/operator-research/alerts.toml'));
    expect(mimeFromBunFile(toml)).toContain('toml');
  });

  test('respondBunFile sets Content-Type from file.type and x-bun-file-type', async () => {
    const res = await respondBunFile(join(FIXTURES_DIR, 'placeholder.png'));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('image/png');
    expect(res.headers.get('x-bun-file-type')).toContain('image/png');
    expect(res.headers.get('last-modified')).toBeTruthy();
  });

  test('respondBunFile 404 for missing', async () => {
    const res = await respondBunFile(join(FIXTURES_DIR, 'does-not-exist-xyz.html'));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('not found');
  });

  test('writeAndRespondBunFile persists then serves with MIME', async () => {
    await Bun.write(join(tmpDir, '.gitkeep'), '');
    const path = join(tmpDir, 'sample.csv');
    const res = await writeAndRespondBunFile(path, 'a,b\n1,2\n', {
      type: 'text/csv;charset=utf-8',
      downloadAs: 'sample.csv',
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/csv');
    expect(res.headers.get('content-disposition')).toContain('sample.csv');
    expect(await Bun.file(path).text()).toContain('a,b');
    expect((await bunFileMeta(path))?.type).toContain('text/csv');
  });

  test('resolveUnderRoot blocks traversal', () => {
    const root = join(ROOT, 'public/portal');
    expect(resolveUnderRoot(root, 'agent-odds/dashboard-v1.05.html')).toContain('agent-odds');
    expect(resolveUnderRoot(root, '../package.json')).toBeNull();
    expect(resolveUnderRoot(root, '..%2f..%2fetc/passwd'.replace(/%2f/gi, '/'))).toBeNull();
    expect(resolveUnderRoot(root, '')).toBeNull();
  });
});
