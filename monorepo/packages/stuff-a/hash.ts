import { UserSchema, type User } from './index';

export function hashUser(user: User): string {
  const canonical = JSON.stringify(user, Object.keys(user).sort());
  return Bun.hash.crc32(canonical).toString(16).padStart(8, '0');
}

export async function persistUsers(users: User[], path: string): Promise<number> {
  const data = JSON.stringify(users, null, 2);
  await Bun.write(path, data);
  return users.length;
}

export async function loadUsers(path: string): Promise<User[]> {
  const file = Bun.file(path);
  if (!(await file.exists())) return [];
  const raw = await file.json();
  return (raw as unknown[]).map((u) => UserSchema.parse(u));
}
