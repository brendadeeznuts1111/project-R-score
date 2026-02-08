import { test, expect, afterAll } from 'bun:test';
import { createDB } from './db';

const db = createDB(':memory:');

afterAll(() => db.close());

const validUser = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Alice',
  email: 'alice@example.com',
  role: 'admin' as const,
  createdAt: new Date('2026-01-01'),
};

test('insert and get user', () => {
  const user = db.insert(validUser);
  expect(user.name).toBe('Alice');

  const fetched = db.get(validUser.id);
  expect(fetched).not.toBeNull();
  expect(fetched!.email).toBe('alice@example.com');
});

test('list returns users', () => {
  const users = db.list();
  expect(users.length).toBeGreaterThanOrEqual(1);
});

test('count returns correct number', () => {
  expect(db.count()).toBeGreaterThanOrEqual(1);
});

test('insertMany batch inserts', () => {
  const users = [
    { ...validUser, id: '660e8400-e29b-41d4-a716-446655440000', email: 'bob@example.com', name: 'Bob' },
    { ...validUser, id: '770e8400-e29b-41d4-a716-446655440000', email: 'charlie@example.com', name: 'Charlie' },
  ];
  const count = db.insertMany(users);
  expect(count).toBe(2);
});

test('delete removes user', () => {
  const deleted = db.delete('660e8400-e29b-41d4-a716-446655440000');
  expect(deleted).toBe(true);
  expect(db.get('660e8400-e29b-41d4-a716-446655440000')).toBeNull();
});

test('delete returns false for missing user', () => {
  expect(db.delete('nonexistent')).toBe(false);
});

test('stats returns db info', () => {
  const stats = db.stats();
  expect(stats.count).toBeGreaterThanOrEqual(2);
  expect(stats.sizeBytes).toBeGreaterThan(0);
});

test('insertMany ignores duplicates', () => {
  const dupes = [
    { ...validUser, id: '770e8400-e29b-41d4-a716-446655440000', email: 'charlie@example.com', name: 'Charlie' },
  ];
  const count = db.insertMany(dupes);
  expect(count).toBe(0); // already exists
});

test('search by name', () => {
  const results = db.search({ search: 'Alice', sort: 'created_at', order: 'desc', limit: 20, offset: 0 });
  expect(results.length).toBeGreaterThanOrEqual(1);
  expect(results[0].name).toBe('Alice');
});

test('search by role', () => {
  const results = db.search({ role: 'admin', sort: 'created_at', order: 'desc', limit: 20, offset: 0 });
  expect(results.every(u => u.role === 'admin')).toBe(true);
});

test('search with limit', () => {
  const results = db.search({ sort: 'created_at', order: 'desc', limit: 1, offset: 0 });
  expect(results.length).toBeLessThanOrEqual(1);
});

test('search with no matches', () => {
  const results = db.search({ search: 'zzz_no_match_zzz', sort: 'created_at', order: 'desc', limit: 20, offset: 0 });
  expect(results.length).toBe(0);
});

test('update name', () => {
  const updated = db.update(validUser.id, { name: 'Alice Updated' });
  expect(updated).not.toBeNull();
  expect(updated!.name).toBe('Alice Updated');
});

test('update returns null for missing user', () => {
  const updated = db.update('nonexistent-id', { name: 'Test' });
  expect(updated).toBeNull();
});

test('countFiltered with role filter', () => {
  const count = db.countFiltered({ role: 'admin', sort: 'created_at', order: 'desc', limit: 20, offset: 0 });
  expect(count).toBeGreaterThanOrEqual(1);
});

test('updateMany updates existing users', () => {
  const result = db.updateMany([
    { id: validUser.id, name: 'Alice Bulk Updated' },
  ]);
  expect(result.updated).toBe(1);
  expect(result.notFound).toHaveLength(0);
  expect(db.get(validUser.id)!.name).toBe('Alice Bulk Updated');
});

test('updateMany reports notFound for missing IDs', () => {
  const result = db.updateMany([
    { id: '990e8400-e29b-41d4-a716-446655440000', name: 'Ghost' },
  ]);
  expect(result.updated).toBe(0);
  expect(result.notFound).toContain('990e8400-e29b-41d4-a716-446655440000');
});

test('search with SQL special chars is safe', () => {
  const results = db.search({ search: "'; DROP TABLE users; --", sort: 'created_at', order: 'desc', limit: 20, offset: 0 });
  expect(Array.isArray(results)).toBe(true);
  // Table should still be intact
  expect(db.count()).toBeGreaterThanOrEqual(1);
});

test('search empty string returns all', () => {
  const all = db.search({ search: '', sort: 'created_at', order: 'desc', limit: 100, offset: 0 });
  const noSearch = db.search({ sort: 'created_at', order: 'desc', limit: 100, offset: 0 });
  expect(all.length).toBe(noSearch.length);
});
