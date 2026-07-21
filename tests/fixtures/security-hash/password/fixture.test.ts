/**
 * Bun.password hash/verify roundtrip (async + sync).
 * Agents invent bcrypt/argon2 packages; migrate rewrites to Bun.password.
 *
 * @see https://bun.com/docs/runtime/hashing#bun-password — Bun.password
 */
import { describe, expect, test } from 'bun:test';

const SECRET = 'harness-boundary-secret';

describe('bun-password hash/verify', () => {
  test('async hash then verify succeeds; wrong password fails', async () => {
    const hash = await Bun.password.hash(SECRET);
    expect(await Bun.password.verify(SECRET, hash)).toBe(true);
    expect(await Bun.password.verify('wrong-secret', hash)).toBe(false);
  });

  test('sync hash then verify succeeds; wrong password fails', () => {
    const hash = Bun.password.hashSync(SECRET);
    expect(Bun.password.verifySync(SECRET, hash)).toBe(true);
    expect(Bun.password.verifySync('wrong-secret', hash)).toBe(false);
  });
});
