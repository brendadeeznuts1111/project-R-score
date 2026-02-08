import type { User } from './index';

const FIRST_NAMES = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Hank', 'Ivy', 'Jack'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Lopez', 'Wilson'];
const DOMAINS = ['example.com', 'test.io', 'demo.dev', 'local.net'];
const ROLES: User['role'][] = ['admin', 'user', 'viewer'];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateUser(overrides: Partial<User> = {}): User {
  const first = pick(FIRST_NAMES);
  const last = pick(LAST_NAMES);
  const domain = pick(DOMAINS);

  return {
    id: crypto.randomUUID(),
    name: `${first} ${last}`,
    email: `${first.toLowerCase()}.${last.toLowerCase()}@${domain}`,
    role: pick(ROLES),
    createdAt: new Date(),
    ...overrides,
  };
}

export function generateUsers(count: number, overrides: Partial<User> = {}): User[] {
  return Array.from({ length: count }, (_, i) => {
    const user = generateUser(overrides);
    // Ensure unique emails by appending index
    const [local, domain] = user.email.split('@');
    return { ...user, email: `${local}+${i}@${domain}` };
  });
}
