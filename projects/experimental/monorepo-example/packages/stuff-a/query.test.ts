import { test, expect } from 'bun:test';
import { UserQuerySchema, parseQuery } from './query';

test('defaults are applied', () => {
  const result = UserQuerySchema.parse({});
  expect(result.sort).toBe('created_at');
  expect(result.order).toBe('desc');
  expect(result.limit).toBe(20);
  expect(result.offset).toBe(0);
});

test('coerces string numbers for limit/offset', () => {
  const result = UserQuerySchema.parse({ limit: '10', offset: '5' });
  expect(result.limit).toBe(10);
  expect(result.offset).toBe(5);
});

test('rejects invalid sort column', () => {
  expect(() => UserQuerySchema.parse({ sort: 'password' })).toThrow();
});

test('rejects invalid role', () => {
  expect(() => UserQuerySchema.parse({ role: 'superadmin' })).toThrow();
});

test('parseQuery extracts from URLSearchParams', () => {
  const params = new URLSearchParams('search=alice&role=admin&limit=5');
  const query = parseQuery(params);
  expect(query.search).toBe('alice');
  expect(query.role).toBe('admin');
  expect(query.limit).toBe(5);
  expect(query.sort).toBe('created_at');
});

test('parseQuery handles empty params', () => {
  const query = parseQuery(new URLSearchParams());
  expect(query.search).toBeUndefined();
  expect(query.role).toBeUndefined();
  expect(query.limit).toBe(20);
});

test('rejects limit=0', () => {
  expect(() => UserQuerySchema.parse({ limit: 0 })).toThrow();
});

test('rejects limit=101', () => {
  expect(() => UserQuerySchema.parse({ limit: 101 })).toThrow();
});

test('rejects offset=-1', () => {
  expect(() => UserQuerySchema.parse({ offset: -1 })).toThrow();
});
