import { validateUser, safeValidateUser, type User } from 'stuff-a';

export interface UserService {
  create(input: unknown): User;
  list(): User[];
}

export function createUserService(): UserService {
  const users: User[] = [];

  return {
    create(input: unknown): User {
      const user = validateUser(input);
      users.push(user);
      return user;
    },
    list(): User[] {
      return [...users];
    },
  };
}

export function bulkValidate(inputs: unknown[]): { valid: User[]; errors: number } {
  const valid: User[] = [];
  let errors = 0;
  for (const input of inputs) {
    const result = safeValidateUser(input);
    if (result.success) {
      valid.push(result.data);
    } else {
      errors++;
    }
  }
  return { valid, errors };
}
