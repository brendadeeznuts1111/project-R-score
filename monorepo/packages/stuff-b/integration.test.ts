import { test, expect, afterAll } from 'bun:test';
import { generateUser } from 'stuff-a/generate';
import { validateUser } from 'stuff-a';
import { createDB } from './db';

const db = createDB(':memory:');

afterAll(() => db.close());

test('roundtrip: generate → insert → search → validate shape', () => {
  const raw = generateUser({ role: 'viewer' });
  const user = validateUser(raw);
  db.insert(user);

  const results = db.search({ search: user.name, sort: 'created_at', order: 'desc', limit: 10, offset: 0 });
  expect(results.length).toBeGreaterThanOrEqual(1);

  const found = results.find(u => u.id === user.id);
  expect(found).toBeDefined();
  expect(found!.name).toBe(user.name);
  expect(found!.email).toBe(user.email);
  expect(found!.role).toBe('viewer');
  expect(found!.createdAt).toBeInstanceOf(Date);
});
