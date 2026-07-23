// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/environment-variables — Bun.env
/**
 * Secret resolution policy — fail-closed outside development.
 *
 * A known-string fallback secret (e.g. 'dod-dev-secret') lets anyone forge
 * HMAC-signed artifacts on a misconfigured deploy. Policy:
 *   - secret set → use it
 *   - NODE_ENV=production + unset → throw (fail closed)
 *   - otherwise → dev fallback + one loud warning
 */

export function requireSecret(envKey: string, devFallback: string): string {
  const value = Bun.env[envKey]?.trim();
  if (value) return value;
  if (Bun.env.NODE_ENV === 'production') {
    throw new Error(`${envKey} is required in production (fail-closed secret policy)`);
  }
  console.warn(`⚠️  ${envKey} unset — using dev fallback secret. NEVER deploy this way.`);
  return devFallback;
}
