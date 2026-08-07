/**
 * Bun.password hash/verify roundtrip (async + sync) + Factory OWASP defaults.
 * Agents invent bcrypt/argon2 packages; migrate rewrites to Bun.password.
 *
 * @see https://bun.com/docs/runtime/hashing#bun-password — Bun.password
 * @see https://bun.com/docs/guides/util/hash-a-password — hash a password
 */
import { describe, expect, test } from 'bun:test';
import {
  ARGON2ID_OWASP_DEFAULTS,
  BCRYPT_OWASP_COST,
  hashPassword,
  hashPasswordSync,
  resolvePasswordHashOptions,
} from '../../../../lib/security/password-hash.ts';
import { SecurityUtils } from '../../../../lib/security/index.ts';

const SECRET = 'harness-boundary-secret';

function phcParams(hash: string): { m: number; t: number } {
  // $argon2id$v=19$m=65536,t=3,p=1$...
  const m = hash.match(/\$m=(\d+)/)?.[1];
  const t = hash.match(/,t=(\d+)/)?.[1];
  if (!m || !t) throw new Error(`expected PHC argon2 params in ${hash.slice(0, 48)}`);
  return { m: Number(m), t: Number(t) };
}

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

describe('Factory OWASP password-hash defaults (#4)', () => {
  test('resolvePasswordHashOptions pins argon2id 64MiB / t=3 when omitted', () => {
    expect(resolvePasswordHashOptions()).toEqual({ ...ARGON2ID_OWASP_DEFAULTS });
    expect(ARGON2ID_OWASP_DEFAULTS.memoryCost).toBe(65_536);
    expect(ARGON2ID_OWASP_DEFAULTS.timeCost).toBe(3);
    expect(BCRYPT_OWASP_COST).toBe(12);
  });

  test('hashPassword emits PHC m=65536,t=3 and verifies', async () => {
    const hash = await hashPassword(SECRET);
    expect(hash.startsWith('$argon2id$')).toBe(true);
    expect(phcParams(hash)).toEqual({ m: 65_536, t: 3 });
    expect(await Bun.password.verify(SECRET, hash)).toBe(true);
  });

  test('SecurityUtils.hashPassword uses the same OWASP profile', async () => {
    const hash = await SecurityUtils.hashPassword(SECRET);
    expect(phcParams(hash)).toEqual({ m: 65_536, t: 3 });
    expect(await SecurityUtils.verifyPassword(SECRET, hash)).toBe(true);
  });

  test('hashPasswordSync + bcrypt cost default', () => {
    const argon = hashPasswordSync(SECRET);
    expect(phcParams(argon)).toEqual({ m: 65_536, t: 3 });
    const bcrypt = hashPasswordSync(SECRET, 'bcrypt');
    expect(bcrypt.startsWith('$2')).toBe(true);
    // Modular Crypt Format: $2b$12$...
    expect(bcrypt.split('$')[2]).toBe(String(BCRYPT_OWASP_COST));
  });

  test('explicit caller overrides win over defaults', async () => {
    const hash = await hashPassword(SECRET, {
      algorithm: 'argon2id',
      memoryCost: 16_384,
      timeCost: 2,
    });
    expect(phcParams(hash)).toEqual({ m: 16_384, t: 2 });
  });
});
