/**
 * Response provenance for live API vs baked registry fallback.
 *
 * Boards and monitoring can read `X-Data-Source` without parsing the body.
 * Values:
 *   live         — served from SQLite / live computation
 *   stale-cache  — served from last good `/registry/*.json` bake
 *   none         — no live data and no bake available
 */
export type DataSourceKind = 'live' | 'stale-cache' | 'none';

export const DATA_SOURCE_HEADER = 'X-Data-Source' as const;

export function dataSourceHeaders(
  source: DataSourceKind,
  extra?: HeadersInit
): Record<string, string> {
  const base: Record<string, string> = {
    [DATA_SOURCE_HEADER]: source,
  };
  if (!extra) return base;
  if (extra instanceof Headers) {
    extra.forEach((v, k) => {
      base[k] = v;
    });
    return base;
  }
  if (Array.isArray(extra)) {
    for (const [k, v] of extra) base[k] = v;
    return base;
  }
  return { ...base, ...(extra as Record<string, string>) };
}

/** Clone a Response and set X-Data-Source (preserves status/body/other headers). */
export function withDataSource(res: Response, source: DataSourceKind): Response {
  const headers = new Headers(res.headers);
  headers.set(DATA_SOURCE_HEADER, source);
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}

/** JSON response with explicit data-source provenance. */
export function jsonWithDataSource(
  data: object,
  source: DataSourceKind,
  opts?: { status?: number; cache?: string }
): Response {
  return Response.json(data, {
    status: opts?.status ?? 200,
    headers: dataSourceHeaders(source, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': opts?.cache ?? 'no-store',
    }),
  });
}
