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
