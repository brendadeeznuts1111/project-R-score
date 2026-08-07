// @see https://bun.com/docs/runtime/hashing#bun-password — Bun.password
// @see https://bun.com/docs/guides/util/hash-a-password — hash a password
/**
 * FactoryWager password-hash defaults for `Bun.password`.
 *
 * Bun's built-in argon2id default is already `m=65536,t=2,p=1`. We pin an
 * explicit OWASP-aligned production profile (`m=65536` KiB = 64 MiB, `t=3`)
 * so callers never rely on silent runtime defaults, and bump iterations one
 * step above Bun's default.
 *
 * Bun's API does not expose Argon2 parallelism (`p`); PHC always reports `p=1`.
 */

/** OWASP-aligned argon2id params (memoryCost is kibibytes). */
export const ARGON2ID_OWASP_DEFAULTS = {
  algorithm: 'argon2id',
  memoryCost: 65_536,
  timeCost: 3,
} as const satisfies Bun.Password.Argon2Algorithm;

/** OWASP-recommended bcrypt cost (log2 rounds). */
export const BCRYPT_OWASP_COST = 12 as const;

export type PasswordHashOptions = NonNullable<Parameters<typeof Bun.password.hash>[1]>;

/**
 * Resolve hash options: omitted → OWASP argon2id; argon2 partials fill memory/time;
 * explicit bcrypt keeps/fills cost.
 */
export function resolvePasswordHashOptions(options?: PasswordHashOptions): PasswordHashOptions {
  if (options == null) return { ...ARGON2ID_OWASP_DEFAULTS };

  if (typeof options === 'string') {
    if (options === 'bcrypt') {
      return { algorithm: 'bcrypt', cost: BCRYPT_OWASP_COST };
    }
    // algorithm label only — argon2 family
    return { ...ARGON2ID_OWASP_DEFAULTS, algorithm: options };
  }

  if (options.algorithm === 'bcrypt') {
    return {
      algorithm: 'bcrypt',
      cost: options.cost ?? BCRYPT_OWASP_COST,
    };
  }

  // argon2id | argon2i | argon2d | undefined algorithm
  const algorithm =
    options.algorithm === 'argon2i' || options.algorithm === 'argon2d'
      ? options.algorithm
      : 'argon2id';

  return {
    algorithm,
    memoryCost: options.memoryCost ?? ARGON2ID_OWASP_DEFAULTS.memoryCost,
    timeCost: options.timeCost ?? ARGON2ID_OWASP_DEFAULTS.timeCost,
  };
}

/** Hash with Factory OWASP defaults (async). */
export async function hashPassword(
  password: string,
  options?: PasswordHashOptions
): Promise<string> {
  return Bun.password.hash(password, resolvePasswordHashOptions(options));
}

/** Hash with Factory OWASP defaults (sync). */
export function hashPasswordSync(password: string, options?: PasswordHashOptions): string {
  return Bun.password.hashSync(password, resolvePasswordHashOptions(options));
}
