import { test, expect } from 'bun:test';
import { validateUser, safeValidateUser } from './index';

test('validateUser accepts valid input', () => {
  const user = validateUser({
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Alice',
    email: 'alice@example.com',
    role: 'admin',
    createdAt: '2026-01-01',
  });
  expect(user.name).toBe('Alice');
  expect(user.role).toBe('admin');
});

test('validateUser rejects invalid email', () => {
  expect(() =>
    validateUser({
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Bob',
      email: 'not-an-email',
      role: 'user',
      createdAt: '2026-01-01',
    }),
  ).toThrow();
});

test('safeValidateUser returns error for bad role', () => {
  const result = safeValidateUser({
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Carol',
    email: 'carol@example.com',
    role: 'superadmin',
    createdAt: '2026-01-01',
  });
  expect(result.success).toBe(false);
});
