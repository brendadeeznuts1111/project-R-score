/**
 * Shared Pages / Bun-only Function helpers (edge-safe — no bun:sqlite).
 *
 * @see functions/api/telegram/webhook/[[tenant]].ts
 * @see functions-bun-only/api/_shared/pages-env.ts
 */
import type { RegistryPagesEnv } from './r2-types.ts';

export type PagesContext = {
  request: Request;
  env: RegistryPagesEnv;
  params?: Record<string, string | string[] | undefined>;
  /** Cloudflare Pages / Workers — extend background work past response. */
  waitUntil?: (promise: Promise<unknown>) => void;
};

export function jsonResponse(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}

export function requireBucket(
  env: RegistryPagesEnv
): NonNullable<RegistryPagesEnv['REGISTRY_BUCKET']> {
  const bucket = env.REGISTRY_BUCKET;
  if (!bucket || typeof bucket.get !== 'function') {
    throw new Response(JSON.stringify({ error: 'Registry binding unavailable' }), {
      status: 503,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  }
  return bucket;
}

export function requireSessionSecret(env: RegistryPagesEnv): string {
  const secret = env.SESSION_SECRET;
  if (!secret) {
    throw new Response(JSON.stringify({ error: 'Session not configured' }), {
      status: 503,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  }
  return secret;
}

export async function readJsonBody<T>(request: Request): Promise<T> {
  return (await request.json()) as T;
}
