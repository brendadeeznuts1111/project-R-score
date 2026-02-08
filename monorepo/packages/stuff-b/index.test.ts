import { test, expect } from 'bun:test';
import { createUserService, bulkValidate } from './index';

const validUser = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Alice',
  email: 'alice@example.com',
  role: 'admin',
  createdAt: '2026-01-01',
};

test('createUserService creates and lists users', () => {
  const svc = createUserService();
  const user = svc.create(validUser);
  expect(user.name).toBe('Alice');
  expect(svc.list()).toHaveLength(1);
});

test('createUserService rejects invalid input', () => {
  const svc = createUserService();
  expect(() => svc.create({ name: '' })).toThrow();
  expect(svc.list()).toHaveLength(0);
});

test('bulkValidate separates valid and invalid', () => {
  const result = bulkValidate([
    validUser,
    { ...validUser, id: '660e8400-e29b-41d4-a716-446655440000', email: 'bad' },
    { ...validUser, id: '770e8400-e29b-41d4-a716-446655440000', name: 'Bob' },
  ]);
  expect(result.valid).toHaveLength(2);
  expect(result.errors).toBe(1);
});
