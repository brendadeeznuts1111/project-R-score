/**
 * Portal /api/env status — secret-safe env checklist for the dashboard.
 * @see lib/env-check.ts
 */
import { envCheckForHealth } from '../env-check.ts';

/** JSON body for GET /api/env (redacted). */
export function buildPortalEnvStatus(): Record<string, unknown> {
  const check = envCheckForHealth();
  return {
    ok: true,
    source: 'env-check',
    checkedAt: new Date().toISOString(),
    ...check,
  };
}
