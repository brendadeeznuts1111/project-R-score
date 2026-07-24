/**
 * Pages Function — GET /api/env
 *
 * Prefers env slice from public/registry/monitoring.json (ops:snapshot).
 * Falls back to edge binding checklist (never 503 for shape contract).
 *
 * @see https://developers.cloudflare.com/pages/functions/
 * @see lib/http/portal-env-status.ts
 */

import {
  buildEdgeEnvStatus,
  isEnvStatusPayload,
  type EdgeEnvContext,
} from '../../lib/http/portal-env-edge.ts';

export type EnvPagesEnv = {
  ASSETS?: { fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> };
};

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'public, max-age=60, must-revalidate',
  'Access-Control-Allow-Origin': '*',
  Vary: 'Accept',
};

async function snapshotEnv(
  env: EnvPagesEnv,
  origin: string
): Promise<Record<string, unknown> | null> {
  const snapUrl = new URL('/registry/monitoring.json', origin);
  try {
    let res: Response;
    if (env.ASSETS?.fetch) {
      res = await env.ASSETS.fetch(new Request(snapUrl.toString()));
    } else {
      res = await fetch(snapUrl.toString(), { headers: { Accept: 'application/json' } });
    }
    if (!res.ok) return null;
    const monData = (await res.json()) as Record<string, unknown>;
    const slice = monData.env;
    if (!isEnvStatusPayload(slice)) return null;
    return {
      ...slice,
      source: (slice.source as string) ?? 'snapshot',
      ok: slice.ok ?? true,
    };
  } catch {
    return null;
  }
}

export async function onRequest(context: {
  request: Request;
  env: EnvPagesEnv;
}): Promise<Response> {
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Accept',
      },
    });
  }

  const origin = new URL(context.request.url).origin;
  const edgeCtx: EdgeEnvContext = { hasAssets: Boolean(context.env?.ASSETS?.fetch) };

  const fromSnapshot = await snapshotEnv(context.env, origin);
  const body =
    fromSnapshot ??
    buildEdgeEnvStatus({
      ...edgeCtx,
    });

  return Response.json(body, { headers: JSON_HEADERS });
}
