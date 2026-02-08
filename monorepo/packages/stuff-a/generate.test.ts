import { test, expect } from 'bun:test';
import { generateUser, generateUsers } from './generate';
import { safeValidateUser } from './index';

test('generateUser creates a valid user', () => {
  const user = generateUser();
  const result = safeValidateUser(user);
  expect(result.success).toBe(true);
});

test('generateUser accepts overrides', () => {
  const user = generateUser({ name: 'Custom Name', role: 'admin' });
  expect(user.name).toBe('Custom Name');
  expect(user.role).toBe('admin');
});

test('generateUsers creates N unique users', () => {
  const users = generateUsers(10);
  expect(users).toHaveLength(10);

  const emails = new Set(users.map(u => u.email));
  expect(emails.size).toBe(10); // all unique emails

  const ids = new Set(users.map(u => u.id));
  expect(ids.size).toBe(10); // all unique ids
});

test('all generated users pass validation', () => {
  const users = generateUsers(20);
  for (const user of users) {
    const result = safeValidateUser(user);
    expect(result.success).toBe(true);
  }
});
