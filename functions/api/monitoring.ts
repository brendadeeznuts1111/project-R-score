/**
 * Pages monitoring API — edge-safe snapshot only (no bun:sqlite).
 * Serve public/registry/monitoring.json from `bun run ops:snapshot` / collect.
 *
 * @see lib/monitoring/collect.ts
 */
export type PagesEnv = {
  ASSETS?: { fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> };
};

export async function onRequest(context: {
  request: Request;
  env: PagesEnv;
}): Promise<Response> {
  const url = new URL(context.request.url);
  const snapUrl = new URL('/registry/monitoring.json', url.origin);

  try {
    let res: Response;
    if (context.env?.ASSETS?.fetch) {
      res = await context.env.ASSETS.fetch(new Request(snapUrl.toString()));
    } else {
      res = await fetch(snapUrl.toString(), { headers: { Accept: 'application/json' } });
    }
    if (!res.ok) {
      return Response.json(
        {
          error: 'monitoring snapshot missing',
          hint: 'Run bun run ops:snapshot (writes public/registry/monitoring.json)',
          source: 'none',
        },
        { status: 503 }
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
        error: 'Failed to load monitoring snapshot',
        detail: err instanceof Error ? err.message : String(err),
        source: 'none',
      },
      { status: 503 }
    );
  }
}
