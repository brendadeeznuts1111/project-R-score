import { test, expect, afterAll } from 'bun:test';
import { hashUser, persistUsers, loadUsers } from './hash';
import { validateUser } from './index';
import { unlinkSync } from 'node:fs';

const tmpPath = '/tmp/stuff-a-test-users.json';

const alice = validateUser({
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Alice',
  email: 'alice@example.com',
  role: 'admin',
  createdAt: '2026-01-01',
});

afterAll(() => {
  try { unlinkSync(tmpPath); } catch {}
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
