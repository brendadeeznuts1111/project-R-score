import { bench, run } from 'mitata';
import { validateUser, safeValidateUser } from './index';
import { hashUser } from './hash';

const validInput = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Alice',
  email: 'alice@example.com',
  role: 'admin',
  createdAt: '2026-01-01',
};

const user = validateUser(validInput);

bench('validateUser (valid)', () => validateUser(validInput));
bench('safeValidateUser (valid)', () => safeValidateUser(validInput));
bench('safeValidateUser (invalid)', () => safeValidateUser({ name: '' }));
bench('hashUser', () => hashUser(user));

await run();
