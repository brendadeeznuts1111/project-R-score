import { validateUser, safeValidateUser, type User } from 'stuff-a';
import { hashUser, persistUsers, loadUsers } from 'stuff-a/hash';
import { generateUser, generateUsers } from 'stuff-a/generate';
import { ROUTES, HEADERS } from 'stuff-a/config';
import { createUserService, bulkValidate } from 'stuff-b';
import { createDB, UserDB } from 'stuff-b/db';

export { validateUser, safeValidateUser, hashUser, persistUsers, loadUsers };
export { generateUser, generateUsers };
export { createUserService, bulkValidate };
export { createDB, UserDB };
export type { User };

export async function healthCheck(serverUrl: string): Promise<{ ok: boolean; latencyMs: number }> {
  const t0 = Bun.nanoseconds();
  try {
    const res = await fetch(`${serverUrl}${ROUTES.HEALTH}`);
    const latencyMs = (Bun.nanoseconds() - t0) / 1e6;
    return { ok: res.status === 200, latencyMs };
  } catch {
    const latencyMs = (Bun.nanoseconds() - t0) / 1e6;
    return { ok: false, latencyMs };
  }
}

export async function seedUsers(serverUrl: string, count: number): Promise<{ created: number; errors: number; durationMs: number }> {
  const t0 = Bun.nanoseconds();
  const users = generateUsers(count);

  const res = await fetch(`${serverUrl}/users/bulk`, {
    method: 'POST',
    headers: HEADERS.JSON,
    body: JSON.stringify(users.map(u => ({ ...u, createdAt: u.createdAt.toISOString() }))),
  });
  const result = await res.json() as { created: number; errors: number };
  const durationMs = (Bun.nanoseconds() - t0) / 1e6;
  return { ...result, durationMs };
}
