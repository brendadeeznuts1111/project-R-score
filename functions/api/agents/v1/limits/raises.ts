/**
 * Pages agent limit-raise API — snapshot only (no bun:sqlite on edge).
 *
 * GET /api/agents/v1/limits/raises?node_id=partner-42&hours=24
 *   → filter public/registry/limit-raises.json from ASSETS / origin
 *
 * Live SQLite enrichment: local serve-public (handleLimitRaiseAgentRequest).
 *
 * @see public/registry/limit-raises.json
 * @see lib/operations/partner-analytics-repo.ts exportLimitRaisesSnapshot
 * @see docs/platform-routing.md
 */

export type PagesEnv = {
  ASSETS?: { fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> };
};

type SnapshotRaise = Record<string, unknown>;
type LimitRaisesSnapshot = {
  schemaVersion?: number;
  generatedAt?: string;
  lookbackHours?: number;
  byNode?: Record<string, { node_id?: string; raises?: SnapshotRaise[] }>; // brand-ok — partner slug keys
};

async function loadSnapshot(
  env: PagesEnv,
  origin: string
): Promise<LimitRaisesSnapshot | null> {
  const url = new URL('/registry/limit-raises.json', origin);
  try {
    let res: Response;
    if (env.ASSETS?.fetch) {
      res = await env.ASSETS.fetch(new Request(url.toString()));
    } else {
      res = await fetch(url.toString());
    }
    if (!res.ok) return null;
    return (await res.json()) as LimitRaisesSnapshot;
  } catch {
    return null;
  }
}

function json(data: object, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': status === 200 ? 'public, max-age=60' : 'no-store',
    },
  });
}

export const onRequestGet: PagesFunction<PagesEnv> = async context => {
  const url = new URL(context.request.url);
  const nodeId = (url.searchParams.get('node_id') ?? url.searchParams.get('nodeId') ?? '').trim();
  if (!nodeId) {
    return json(
      {
        error: 'node_id is required',
        example: '/api/agents/v1/limits/raises?node_id=partner-42&hours=24',
        mode: 'snapshot',
      },
      400
    );
  }

  const origin = url.origin;
  const snapshot = await loadSnapshot(context.env, origin);
  if (!snapshot?.byNode) {
    return json(
      {
        ok: false,
        mode: 'snapshot',
        error: 'limit-raises snapshot missing — run bun run ops:snapshot',
        links: {
          bake: 'bun run ops:snapshot',
          portal: '/portal/limits/',
          registry: '/registry/limit-raises.json',
        },
      },
      503
    );
  }

  const bucket = snapshot.byNode[nodeId];
  const raises = bucket?.raises ?? [];
  let hours = 24;
  const rawHours = url.searchParams.get('hours');
  if (rawHours != null && rawHours.trim() !== '') {
    const n = Number(rawHours);
    if (Number.isFinite(n) && n > 0) hours = Math.min(24 * 30, n);
  }
  const sinceTimestamp = Math.floor(Date.now() / 1000) - Math.round(hours * 3600);
  const filtered = raises.filter(r => {
    const at = Number((r as { increased_at?: number }).increased_at ?? 0);
    return !at || at >= sinceTimestamp;
  });

  return json({
    ok: true,
    mode: 'snapshot',
    readOnly: true,
    schemaVersion: 1,
    node_id: nodeId,
    lookback_hours: hours,
    since_timestamp: sinceTimestamp,
    generatedAt: snapshot.generatedAt ?? null,
    snapshotLookbackHours: snapshot.lookbackHours ?? null,
    raises: filtered,
    links: {
      portal: '/portal/limits/',
      registry: '/registry/limit-raises.json',
      live: 'local serve-public for SQLite-backed raises',
    },
  });
};

export const onRequestPost: PagesFunction = async () =>
  json(
    {
      ok: false,
      error: 'Mutations not available on Pages — use local ops:limits:check',
    },
    503
  );
