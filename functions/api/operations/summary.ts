/**
 * Operations summary for Cloudflare Pages — edge-safe (no bun:sqlite).
 *
 * Serves `public/registry/ops-summary.json` produced by `bun run ops:snapshot`.
 * Local Bun/self-hosted can still use the same static path, or hit this handler
 * via ASSETS / origin fetch.
 *
 * Live SQLite summaries are intentionally not built into Pages Functions
 * (Workers cannot resolve bun:sqlite). Use:
 *   bun run ops:snapshot   # write public/registry/ops-summary.json
 *   bun run cloudflare:deploy
 *
 * @see public/registry/ops-summary.json
 * @see lib/operations/ops-summary.ts
 * @see https://developers.cloudflare.com/pages/functions/api-reference/
 */

import { getOnly } from '../_get-only.ts';

export type PagesSummaryEnv = {
  /** Cloudflare Pages static asset binding (when present). */
  ASSETS?: { fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> };
};

export type PagesSummaryContext = {
  request: Request;
  env: PagesSummaryEnv;
};

/**
 * Prefer ASSETS binding; fall back to same-origin fetch of the snapshot path.
 */
export async function onRequest(context: PagesSummaryContext): Promise<Response> {
  const blocked = getOnly(context.request);
  if (blocked) return blocked;
  const url = new URL(context.request.url);
  const snapshotUrl = new URL('/registry/ops-summary.json', url.origin);

  try {
    let res: Response;
    if (context.env?.ASSETS?.fetch) {
      res = await context.env.ASSETS.fetch(new Request(snapshotUrl.toString()));
    } else {
      res = await fetch(snapshotUrl.toString(), {
        headers: { Accept: 'application/json' },
      });
    }

    if (!res.ok) {
      return Response.json(
        {
          error: 'ops-summary snapshot missing',
          hint: 'Run bun run ops:snapshot and redeploy public/',
          source: 'none',
          status: res.status,
        },
        { status: 503, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const data = (await res.json()) as Record<string, unknown>;
    return Response.json(
      { ...data, source: data.source ?? 'snapshot' },
      {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=60',
        },
      }
    );
  } catch (err) {
    return Response.json(
      {
        error: 'Failed to load ops-summary snapshot',
        detail: err instanceof Error ? err.message : String(err),
        source: 'none',
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
