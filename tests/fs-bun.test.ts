// @see https://bun.com/docs/runtime/file-io
// @see https://bun.com/docs/test — bun:test
import { describe, expect, test, beforeAll, afterAll } from 'bun:test';
import {
  bunFile,
  copyFile,
  deleteFile,
  fileExists,
  fileSize,
  listFilesSync,
  readJson,
  readText,
  resolvePath,
  writeJson,
  writeText,
} from '../scripts/lib/fs-bun';

const ROOT = resolvePath(import.meta.dir, '..');
const TMP = resolvePath(`/tmp/fs-bun-test-${process.pid}`);

describe('fs-bun (Bun.file / Bun.write)', () => {
  beforeAll(async () => {
    await writeText(resolvePath(TMP, 'nested', 'hello.txt'), 'hello-bun');
    await writeJson(resolvePath(TMP, 'nested', 'meta.json'), { ok: true, n: 1 });
  });

  afterAll(async () => {
    try {
      await deleteFile(resolvePath(TMP, 'nested', 'hello.txt'));
      await deleteFile(resolvePath(TMP, 'nested', 'meta.json'));
      await deleteFile(resolvePath(TMP, 'nested', 'copy.txt'));
    } catch {
      /* best-effort cleanup */
    }
  });

  test('resolvePath joins under cwd', () => {
    expect(resolvePath('scripts', 'lib', 'fs-bun.ts')).toBe(
      resolvePath(ROOT, 'scripts', 'lib', 'fs-bun.ts')
    );
  });

  test('writeText creates parents; readText / exists / size', async () => {
    const p = resolvePath(TMP, 'nested', 'hello.txt');
    expect(await fileExists(p)).toBe(true);
    expect(await readText(p)).toBe('hello-bun');
    expect(fileSize(p)).toBeGreaterThan(0);
    expect(bunFile(p).type).toContain('text');
  });

  test('writeJson / readJson', async () => {
    const p = resolvePath(TMP, 'nested', 'meta.json');
    const data = await readJson<{ ok: boolean; n: number }>(p);
    expect(data.ok).toBe(true);
    expect(data.n).toBe(1);
  });

  test('copyFile via Bun.write(BunFile, BunFile)', async () => {
    const from = resolvePath(TMP, 'nested', 'hello.txt');
    const to = resolvePath(TMP, 'nested', 'copy.txt');
    await copyFile(from, to);
    expect(await readText(to)).toBe('hello-bun');
  });

  test('listFilesSync Glob', () => {
    const files = listFilesSync('scripts/lib/fs-bun.ts', { cwd: ROOT });
    expect(files.some(f => f.endsWith('fs-bun.ts') || f === 'scripts/lib/fs-bun.ts')).toBe(true);
  });

  test('missing file exists() is false', async () => {
    expect(await fileExists(resolvePath(TMP, 'no-such-file.bin'))).toBe(false);
  });
});
