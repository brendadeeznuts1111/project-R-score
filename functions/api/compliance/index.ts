/**
 * Pages compliance API — snapshot only (no bun:sqlite / no mock server on edge).
 *
 * GET /api/compliance → compliance-board.json from ASSETS / origin
 *
 * Live checks: local `bun run ops:compliance:mock` or functions-bun-only.
 *
 * @see public/registry/compliance-board.json
 * @see docs/platform-routing.md
 */
export type PagesEnv = {
  ASSETS?: { fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> };
};

async function loadBoard(
  env: PagesEnv,
  origin: string
): Promise<Record<string, unknown> | null> {
  const url = new URL('/registry/compliance-board.json', origin);
  try {
    let res: Response;
    if (env.ASSETS?.fetch) {
      res = await env.ASSETS.fetch(new Request(url.toString()));
    } else {
      res = await fetch(url.toString());
    }
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export const onRequestGet: PagesFunction<PagesEnv> = async context => {
  const origin = new URL(context.request.url).origin;
  const board = await loadBoard(context.env, origin);
  if (!board) {
    return Response.json(
      {
        ok: false,
        error: 'compliance-board snapshot missing — run bun run compliance:bake',
        links: {
          portal: '/portal/compliance/',
          bake: 'bun run compliance:bake',
        },
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
  return Response.json(
    { ok: true, mode: 'snapshot', readOnly: true, ...board },
    {
      headers: {
        'Cache-Control': 'public, max-age=60',
        'Content-Type': 'application/json; charset=utf-8',
      },
    }
  );
};

export const onRequestPost: PagesFunction = async () =>
  Response.json(
    {
      ok: false,
      error: 'Mutations not available on Pages — use local mock / bun serve',
    },
    { status: 503, headers: { 'Cache-Control': 'no-store' } }
  );
