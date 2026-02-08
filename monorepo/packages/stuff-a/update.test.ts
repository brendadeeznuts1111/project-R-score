import { test, expect } from 'bun:test';
import { UserUpdateSchema } from './update';

test('accepts partial name update', () => {
  const result = UserUpdateSchema.parse({ name: 'New Name' });
  expect(result.name).toBe('New Name');
});

test('accepts partial email update', () => {
  const result = UserUpdateSchema.parse({ email: 'new@example.com' });
  expect(result.email).toBe('new@example.com');
});

test('accepts multiple fields', () => {
  const result = UserUpdateSchema.parse({ name: 'New', role: 'admin' });
  expect(result.name).toBe('New');
  expect(result.role).toBe('admin');
});

test('rejects empty object', () => {
  expect(() => UserUpdateSchema.parse({})).toThrow();
});

test('rejects invalid email', () => {
  expect(() => UserUpdateSchema.parse({ email: 'not-an-email' })).toThrow();
});

test('rejects invalid role superadmin', () => {
  expect(() => UserUpdateSchema.parse({ role: 'superadmin' })).toThrow();
});
