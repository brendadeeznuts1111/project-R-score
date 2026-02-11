import { describe, test, expect, afterEach } from 'bun:test';
import { AtomicFileOperations } from '../lib/core/atomic-file-operations';
import { join } from 'path';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { rmSync } from 'fs';

let tmpDir: string;

function setup() {
  tmpDir = mkdtempSync(join(tmpdir(), 'atomic-test-'));
}

function cleanup() {
  try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}
}

afterEach(cleanup);

describe('AtomicFileOperations', () => {
  test('writeAtomic + readSafe round-trip', async () => {
    setup();
    const filePath = join(tmpDir, 'test.txt');
    await AtomicFileOperations.writeAtomic(filePath, 'hello world');
    const content = await AtomicFileOperations.readSafe(filePath);
    expect(content).toBe('hello world');
  });

  test('readSafe throws for non-existent file', async () => {
    setup();
    const filePath = join(tmpDir, 'missing.txt');
    await expect(AtomicFileOperations.readSafe(filePath)).rejects.toThrow('does not exist');
  });

  test('appendAtomic appends to existing file', async () => {
    setup();
    const filePath = join(tmpDir, 'append.txt');
    await AtomicFileOperations.writeAtomic(filePath, 'line1\n');
    await AtomicFileOperations.appendAtomic(filePath, 'line2\n');
    const content = await AtomicFileOperations.readSafe(filePath);
    expect(content).toBe('line1\nline2\n');
  });

  test('appendAtomic creates file if it does not exist', async () => {
    setup();
    const filePath = join(tmpDir, 'new-append.txt');
    await AtomicFileOperations.appendAtomic(filePath, 'first');
    const content = await AtomicFileOperations.readSafe(filePath);
    expect(content).toBe('first');
  });

  test('deleteSafe removes existing file', async () => {
    setup();
    const filePath = join(tmpDir, 'delete-me.txt');
    await AtomicFileOperations.writeAtomic(filePath, 'bye');
    await AtomicFileOperations.deleteSafe(filePath);
    await expect(AtomicFileOperations.readSafe(filePath)).rejects.toThrow();
  });

  test('deleteSafe is a no-op for non-existent file', async () => {
    setup();
    const filePath = join(tmpDir, 'already-gone.txt');
    // Should not throw
    await AtomicFileOperations.deleteSafe(filePath);
  });

  test('writeSafe wraps errors with file path context', async () => {
    setup();
    // Write to an invalid path (directory that doesn't exist)
    const filePath = join(tmpDir, 'nodir', 'deep', 'file.txt');
    await expect(AtomicFileOperations.writeSafe(filePath)).rejects.toThrow('Failed to write file');
  });
});
