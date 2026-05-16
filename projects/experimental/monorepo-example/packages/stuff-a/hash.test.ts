import { test, expect, afterAll } from 'bun:test';
import { hashUser, hashUserSHA256, checksumFile, persistUsers, loadUsers, loadUsersFromStream } from './hash';
import { validateUser } from './index';

const tmpPath = '/tmp/stuff-a-test-users.json';

const alice = validateUser({
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Alice',
  email: 'alice@example.com',
  role: 'admin',
  createdAt: '2026-01-01',
});

afterAll(async () => {
  if (await Bun.file(tmpPath).exists()) {
    await Bun.$`rm -f ${tmpPath}`.quiet();
  }
});

test('hashUser produces stable hex hash', () => {
  const h1 = hashUser(alice);
  const h2 = hashUser(alice);
  expect(h1).toBe(h2);
  expect(h1).toMatch(/^[0-9a-f]{8}$/);
});

test('different users produce different hashes', () => {
  const bob = validateUser({
    id: '660e8400-e29b-41d4-a716-446655440000',
    name: 'Bob',
    email: 'bob@example.com',
    role: 'user',
    createdAt: '2026-02-01',
  });
  expect(hashUser(alice)).not.toBe(hashUser(bob));
});

test('persist and load round-trips users', async () => {
  await persistUsers([alice], tmpPath);
  const loaded = await loadUsers(tmpPath);
  expect(loaded).toHaveLength(1);
  expect(loaded[0].name).toBe('Alice');
  expect(loaded[0].email).toBe('alice@example.com');
});

test('loadUsers returns empty for missing file', async () => {
  const loaded = await loadUsers('/tmp/nonexistent-stuff-a.json');
  expect(loaded).toEqual([]);
});

test('hashUserSHA256 produces stable 64-char hex', () => {
  const h1 = hashUserSHA256(alice);
  const h2 = hashUserSHA256(alice);
  expect(h1).toBe(h2);
  expect(h1).toMatch(/^[0-9a-f]{64}$/);
});

test('different users produce different SHA256 hashes', () => {
  const bob = validateUser({
    id: '660e8400-e29b-41d4-a716-446655440000',
    name: 'Bob',
    email: 'bob@example.com',
    role: 'user',
    createdAt: '2026-02-01',
  });
  expect(hashUserSHA256(alice)).not.toBe(hashUserSHA256(bob));
});

test('checksumFile returns consistent hash for same content', async () => {
  const testFile = '/tmp/stuff-a-checksum-test.txt';
  await Bun.write(testFile, 'hello world');
  const h1 = await checksumFile(testFile);
  const h2 = await checksumFile(testFile);
  expect(h1).toBe(h2);
  expect(h1).toMatch(/^[0-9a-f]{64}$/);
  await Bun.$`rm -f ${testFile}`.quiet();
});

test('checksumFile of non-existent file throws', async () => {
  expect(checksumFile('/tmp/nonexistent-checksum-file.dat')).rejects.toThrow();
});

test('loadUsersFromStream round-trips through ReadableStream', async () => {
  const data = JSON.stringify([{
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Alice',
    email: 'alice@example.com',
    role: 'admin',
    createdAt: '2026-01-01',
  }]);
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(data));
      controller.close();
    },
  });
  const users = await loadUsersFromStream(stream);
  expect(users).toHaveLength(1);
  expect(users[0].name).toBe('Alice');
});
