// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Fail-closed publish auth for local registry surfaces (serve-public).
 * Same secret plane as lib/factory/server.ts:
 *   FACTORY_WAGER_TOKEN || REGISTRY_SECRET
 */

export function configuredPublishToken(
  env: { FACTORY_WAGER_TOKEN?: string; REGISTRY_SECRET?: string } = Bun.env
): string {
  return (env.FACTORY_WAGER_TOKEN || env.REGISTRY_SECRET || '').trim();
}

export function bearerToken(req: Request): string {
  const authorization = req.headers.get('Authorization') ?? req.headers.get('authorization') ?? '';
  return authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
}

/** Hash-then-XOR compare — length-independent. */
export async function tokenMatches(provided: string, expected: string): Promise<boolean> {
  if (!provided || !expected) return false;
  const encoder = new TextEncoder();
  const [providedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(provided)),
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
  ]);
  const left = new Uint8Array(providedHash);
  const right = new Uint8Array(expectedHash);
  let mismatch = 0;
  for (let i = 0; i < left.length; i++) mismatch |= left[i]! ^ right[i]!;
  return mismatch === 0;
}

export type PublishAuthDecision =
  | { ok: true }
  | { ok: false; status: 401 | 503; error: string; hint?: string };

/** Pure decision — wire layer maps to Response. */
export async function decidePublishAuth(
  req: Request,
  env: { FACTORY_WAGER_TOKEN?: string; REGISTRY_SECRET?: string } = Bun.env
): Promise<PublishAuthDecision> {
  const expected = configuredPublishToken(env);
  if (!expected) {
    return {
      ok: false,
      status: 503,
      error: 'Registry publishing is not configured',
      hint: 'Set REGISTRY_SECRET or FACTORY_WAGER_TOKEN',
    };
  }
  if (!(await tokenMatches(bearerToken(req), expected))) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }
  return { ok: true };
}
