/**
 * Edge health payload + plain renderer for Pages Functions.
 * Used by `/api/health`, `/health`, and `/health/pre`.
 *
 * @see functions/api/health.ts
 * @see docs/portal-foundation.md
 * @see docs/platform-routing.md
 */
import { buildEdgeEnvTable } from './portal-env-edge.ts';
import { portalOptionsResponse } from './portal-cors.ts';

export type HealthEnv = {
  ASSETS?: { fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> };
};

/** Compact Bun defaults proof slice (from defaults-proof.json). */
export type EdgeDefaultsSlice = {
  available: boolean;
  path: '/registry/defaults-proof.json';
  passed: number | null;
  total: number | null;
  status: string | null;
  bunVersion: string | null;
  proofHash: string | null;
  generated: string | null;
};

/** Compact proof-taxonomy audit slice (ops-summary or full audit). */
export type EdgeProofTaxonomySlice = {
  available: boolean;
  path: '/registry/proof-taxonomy-audit.json';
  ok: boolean | null;
  contracts: number | null;
  contractsOk: number | null;
  consistencyOk: number | null;
  consistencyTotal: number | null;
  source: 'ops-summary' | 'audit-json' | null;
};

export type EdgeHealthBody = {
  status: 'ok' | 'degraded';
  schemaVersion: 1;
  runtime: string;
  edge: true;
  checkedAt: string;
  portal: string;
  artifacts: Record<string, unknown>;
  registry: { packages: number | null; versions: number | null };
  monitoring: Record<string, unknown> | null;
  bunApiProof: Record<string, unknown>;
  defaults: EdgeDefaultsSlice;
  proofTaxonomy: EdgeProofTaxonomySlice;
  env: Record<string, unknown>;
  routeStats: Record<string, unknown>;
  toc?: Record<string, unknown> | null;
  channels?: Record<string, unknown> | null;
  loop?: Record<string, unknown> | null;
  serve: Record<string, unknown>;
};

/** @internal exported for unit tests */
export function sliceDefaults(raw: Record<string, unknown> | null): EdgeDefaultsSlice {
  const empty: EdgeDefaultsSlice = {
    available: false,
    path: '/registry/defaults-proof.json',
    passed: null,
    total: null,
    status: null,
    bunVersion: null,
    proofHash: null,
    generated: null,
  };
  if (!raw) return empty;
  const summary = (raw.summary as Record<string, unknown> | undefined) || {};
  const passed =
    typeof summary.passed === 'number'
      ? summary.passed
      : typeof raw.passed === 'number'
        ? raw.passed
        : null;
  const total =
    typeof summary.total === 'number'
      ? summary.total
      : typeof raw.total === 'number'
        ? raw.total
        : null;
  return {
    available: true,
    path: '/registry/defaults-proof.json',
    passed,
    total,
    status:
      typeof summary.status === 'string'
        ? summary.status
        : passed != null && total != null && passed === total
          ? 'pass'
          : null,
    bunVersion: typeof raw.bunVersion === 'string' ? raw.bunVersion : null,
    proofHash: typeof raw.proofHash === 'string' ? raw.proofHash : null,
    generated: typeof raw.timestamp === 'string' ? raw.timestamp : null,
  };
}

function taxonomyFromAuditShape(
  data: Record<string, unknown>,
  source: 'audit-json' | 'ops-summary'
): EdgeProofTaxonomySlice {
  const audits = Array.isArray(data.audits) ? data.audits : [];
  const consistency = Array.isArray(data.consistency) ? data.consistency : [];
  const contractsOk = audits.filter((a: { ok?: boolean }) => a && a.ok === true).length;
  const consistencyOk = consistency.filter((c: { ok?: boolean }) => c && c.ok === true).length;
  return {
    available: true,
    path: '/registry/proof-taxonomy-audit.json',
    ok: typeof data.ok === 'boolean' ? data.ok : null,
    contracts: audits.length || null,
    contractsOk: audits.length ? contractsOk : null,
    consistencyOk: consistency.length ? consistencyOk : null,
    consistencyTotal: consistency.length || null,
    source,
  };
}

/**
 * Prefer proof-taxonomy-audit.json (SSOT). Fall back to ops-summary embed
 * (full audits[] when present, else scalar fields).
 * @internal exported for unit tests
 */
export function sliceProofTaxonomy(
  opsTax: Record<string, unknown> | null | undefined,
  audit: Record<string, unknown> | null
): EdgeProofTaxonomySlice {
  const empty: EdgeProofTaxonomySlice = {
    available: false,
    path: '/registry/proof-taxonomy-audit.json',
    ok: null,
    contracts: null,
    contractsOk: null,
    consistencyOk: null,
    consistencyTotal: null,
    source: null,
  };
  if (audit) return taxonomyFromAuditShape(audit, 'audit-json');
  if (opsTax && Array.isArray(opsTax.audits) && opsTax.audits.length > 0) {
    return taxonomyFromAuditShape(opsTax, 'ops-summary');
  }
  if (opsTax && opsTax.available !== false && (opsTax.ok != null || opsTax.contracts != null)) {
    return {
      available: true,
      path: '/registry/proof-taxonomy-audit.json',
      ok: typeof opsTax.ok === 'boolean' ? opsTax.ok : null,
      contracts: typeof opsTax.contracts === 'number' ? opsTax.contracts : null,
      contractsOk: typeof opsTax.contractsOk === 'number' ? opsTax.contractsOk : null,
      consistencyOk: typeof opsTax.consistencyOk === 'number' ? opsTax.consistencyOk : null,
      consistencyTotal:
        typeof opsTax.consistencyTotal === 'number' ? opsTax.consistencyTotal : null,
      source: 'ops-summary',
    };
  }
  return empty;
}

/** Degrade overall health only on SSOT audit failure — not a stale ops embed. */
export function edgeTaxonomyDegradesHealth(slice: EdgeProofTaxonomySlice): boolean {
  return slice.source === 'audit-json' && slice.ok === false;
}

async function readJsonResponse(res: Response): Promise<Record<string, unknown> | null> {
  if (!res.ok) return null;
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** ASSETS first, then origin fetch — parallel ASSETS misses are common under load. */
async function assetJson(
  env: HealthEnv,
  origin: string,
  path: string
): Promise<Record<string, unknown> | null> {
  const url = new URL(path, origin);
  if (env.ASSETS?.fetch) {
    try {
      const fromAssets = await readJsonResponse(
        await env.ASSETS.fetch(new Request(url.toString()))
      );
      if (fromAssets) return fromAssets;
    } catch {
      /* fall through to origin */
    }
  }
  try {
    return await readJsonResponse(await fetch(url.toString()));
  } catch {
    return null;
  }
}

async function sha256HexPrefix(text: string, n = 32): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, n);
}

/** Stable ETag payload — exclude per-request clock. */
export function edgeHealthETagPayload(body: EdgeHealthBody): unknown {
  const { checkedAt: _c, ...rest } = body;
  return rest;
}

export async function computeEdgeHealthETag(body: EdgeHealthBody): Promise<string> {
  const hex = await sha256HexPrefix(JSON.stringify(edgeHealthETagPayload(body)));
  return `"${hex}"`;
}

export async function collectEdgeHealth(env: HealthEnv, origin: string): Promise<EdgeHealthBody> {
  const [
    ops,
    monitoring,
    staticSnap,
    registry,
    proof,
    defaultsRaw,
    taxonomyAudit,
    complianceBoard,
  ] = await Promise.all([
    assetJson(env, origin, '/registry/ops-summary.json'),
    assetJson(env, origin, '/registry/monitoring.json'),
    assetJson(env, origin, '/registry/static.json'),
    assetJson(env, origin, '/registry/registry.json'),
    assetJson(env, origin, '/tools/bun-api-coverage-proof.json'),
    assetJson(env, origin, '/registry/defaults-proof.json'),
    assetJson(env, origin, '/registry/proof-taxonomy-audit.json'),
    assetJson(env, origin, '/registry/compliance-board.json'),
  ]);

  const defaults = sliceDefaults(defaultsRaw);
  const proofTaxonomy = sliceProofTaxonomy(
    ops?.proofTaxonomy as Record<string, unknown> | undefined,
    taxonomyAudit
  );

  let bunApiProof: Record<string, unknown> = { available: false };
  if (proof) {
    bunApiProof = {
      available: true,
      generated: proof.generated ?? null,
      bunVersion: proof.bunVersion ?? null,
      summary: proof.summary ?? null,
    };
  } else {
    try {
      const res = await fetch(
        'https://raw.githubusercontent.com/brendadeeznuts1111/project-R-score/main/tools/bun-api-coverage-proof.json'
      );
      if (res.ok) {
        const p = (await res.json()) as Record<string, unknown>;
        bunApiProof = {
          available: true,
          generated: p.generated ?? null,
          bunVersion: p.bunVersion ?? null,
          summary: p.summary ?? null,
          source: 'github-raw',
        };
      }
    } catch {
      /* ignore */
    }
  }

  const packages =
    registry && typeof registry.packages === 'object' && registry.packages
      ? Object.keys(registry.packages as object).length
      : ((monitoring?.packageCount as number | undefined) ?? null);

  const versions =
    registry && typeof registry.packages === 'object' && registry.packages
      ? Object.values(registry.packages as Record<string, { versions?: string[] }>).reduce(
          (n, p) => n + (p.versions?.length ?? 0),
          0
        )
      : null;

  const envTable = buildEdgeEnvTable({
    hasAssets: Boolean(env?.ASSETS?.fetch),
  });

  const defaultsFail =
    defaults.available &&
    ((defaults.status != null && defaults.status !== 'pass') ||
      (defaults.passed != null && defaults.total != null && defaults.passed < defaults.total));
  const taxonomyFail = edgeTaxonomyDegradesHealth(proofTaxonomy);

  const enh = complianceBoard?.enhancements as
    | { passed?: number; total?: number; signature?: string }
    | undefined;
  const shadow = complianceBoard?.shadow as
    | { summary?: { mismatches?: number; allow?: number; block?: number } }
    | undefined;
  const complianceExists = Boolean(complianceBoard?.schemaVersion === 1);
  const complianceOk =
    complianceExists &&
    (enh?.passed ?? 0) === (enh?.total ?? 0) &&
    (shadow?.summary?.mismatches ?? 0) === 0;
  // Missing bake does not degrade edge health (optional plane); mismatches do.
  const complianceFail = complianceExists && !complianceOk;

  const status: 'ok' | 'degraded' =
    defaultsFail || taxonomyFail || complianceFail ? 'degraded' : 'ok';

  return {
    status,
    schemaVersion: 1,
    runtime: 'cloudflare-pages',
    edge: true,
    checkedAt: new Date().toISOString(),
    portal: '/portal/health/',
    artifacts: {
      opsSummary: {
        exists: Boolean(ops),
        generated: (ops?.generated as string) ?? null,
        source: ops?.source ?? null,
      },
      staticAggregate: { exists: Boolean(staticSnap) },
      monitoring: { exists: Boolean(monitoring) },
      tocOps: { exists: Boolean(ops?.toc) },
      defaultsProof: { exists: Boolean(defaultsRaw) },
      proofTaxonomyAudit: { exists: Boolean(taxonomyAudit) },
      complianceBoard: {
        exists: complianceExists,
        ok: complianceOk,
        generated: (complianceBoard?.generatedAt as string) ?? null,
        enhancements: enh ? `${enh.passed ?? 0}/${enh.total ?? 0}` : null,
        shadowMismatches: shadow?.summary?.mismatches ?? null,
        path: '/registry/compliance-board.json',
        portal: '/portal/compliance/',
      },
    },
    registry: {
      packages,
      versions,
    },
    monitoring: monitoring
      ? {
          packageCount: monitoring.packageCount,
          dodQueue: monitoring.dodQueue,
          timestamp: monitoring.timestamp,
        }
      : null,
    bunApiProof,
    defaults,
    proofTaxonomy,
    toc: (ops?.toc as Record<string, unknown> | undefined) ?? null,
    channels: (ops?.channels as Record<string, unknown> | undefined) ?? null,
    loop: (ops?.loop as Record<string, unknown> | undefined) ?? null,
    env: {
      summary: {
        total: envTable.length,
        ok: envTable.filter(
          r => r.Status === 'set' || r.Status === 'binding' || r.Status === 'edge-n/a'
        ).length,
        missing: envTable.filter(r => r.Status === 'missing').length,
        placeholder: 0,
        requiredMissing: envTable.filter(r => r.Status === 'missing').length,
        note: 'Full secret checklist runs on origin: bun run env:check',
      },
      table: envTable,
      requiredMissingKeys: envTable.filter(r => r.Status === 'missing').map(r => r.Key),
    },
    routeStats: ops?.routing
      ? {
          note: 'from last ops snapshot routing slice (edge has no in-process static cache)',
          routing: ops.routing,
        }
      : {
          note: 'route hit counters require origin serve-public; edge serves ASSETS only',
        },
    serve: {
      strategies: {
        static: 'Pages ASSETS + optional R2 for registry keys',
        file: 'large artifacts via R2/ASSETS stream',
      },
      etagScope: 'shared edge snapshot across /api/health · /health · /health/pre (Vary: Accept)',
    },
  };
}

/** Plain-text diagnostics for GET /health/pre (curl / Accept: text/plain). */
export function renderEdgeHealthPlain(data: EdgeHealthBody): string {
  const proof = data.bunApiProof || {};
  const proofSum = (proof.summary as Record<string, number> | undefined) || {};
  const routing = (data.routeStats?.routing as Record<string, unknown> | undefined) || null;
  const toc = data.toc;
  const channels = data.channels;
  const envSum = (data.env?.summary as Record<string, unknown> | undefined) || {};
  const arts = (data.artifacts?.opsSummary as Record<string, unknown> | undefined) || {};

  const lines: string[] = [
    '╔══════════════════════════════════════════╗',
    '║     FactoryWager · Health Diagnostics    ║',
    '╚══════════════════════════════════════════╝',
    '',
    `  Status:    ${data.status}`,
    `  Runtime:   ${data.runtime} (edge)`,
    `  Portal:    ${data.portal}`,
    `  Checked:   ${data.checkedAt}`,
    '',
    '── Registry ──────────────────────────────',
    `  Packages:  ${data.registry.packages ?? '?'}`,
    `  Versions:  ${data.registry.versions ?? '?'}`,
    '',
    '── Artifacts ─────────────────────────────',
    `  Ops summary: ${arts.exists ? 'yes' : 'no'}`,
    `  Generated:   ${arts.generated ?? '—'}`,
    `  Source:      ${arts.source ?? '—'}`,
    '',
    '── Bun API Proof ─────────────────────────',
  ];

  if (proof.available) {
    lines.push(`  Generated:   ${proof.generated ?? '—'}`);
    lines.push(`  Demos:       ${proofSum.demosPassed ?? '?'}/${proofSum.demos ?? '?'} passed`);
    lines.push(`  APIs:        ${proofSum.apisVerified ?? '?'}/${proofSum.apis ?? '?'} verified`);
    if (proof.bunVersion) lines.push(`  Bun:         ${proof.bunVersion}`);
  } else {
    lines.push('  Not available on edge artifacts');
  }

  lines.push('', '── Routing proof ─────────────────────────');
  if (routing) {
    lines.push(`  Pass:        ${routing.passed}/${routing.total}`);
    lines.push(`  Critical fail: ${routing.criticalFailed ?? 0}`);
    lines.push(`  Latency:     mean ${routing.meanMs ?? '—'}ms · p95 ${routing.p95Ms ?? '—'}ms`);
    lines.push(`  Base:        ${routing.baseUrl ?? '—'}`);
    lines.push(`  Hash:        ${String(routing.proofHash ?? '—').slice(0, 16)}…`);
  } else {
    lines.push(`  ${(data.routeStats?.note as string) || 'unavailable'}`);
  }

  lines.push('', '── TOC Ops ───────────────────────────────');
  if (toc && toc.available) {
    lines.push(`  Warmed:      ${toc.warmed ?? 0}`);
    lines.push(
      `  Flow:        ${toc.warming ?? 0} warming · ${toc.onboarding ?? 0} onboarding · ${toc.confirmedRails ?? 0} rails`
    );
    lines.push(
      `  Bottlenecks: ${toc.openBottlenecks ?? 0} open · ${toc.criticalBottlenecks ?? 0} critical`
    );
    if (toc.enforcementFocus) {
      lines.push(
        `  Focus:       ${toc.enforcementFocus} · ${toc.enforcementFailed ?? 0} fails · ${toc.enforcementCritical ?? 0} critical`
      );
    }
    if (toc.throughputT != null) {
      lines.push(`  T/I/OE:      ${toc.throughputT} / ${toc.throughputI} / ${toc.throughputOE}`);
    }
    if (toc.topRankedProcess || toc.avgRP != null) {
      lines.push(
        `  Next:        ${toc.topRankedProcess ?? '—'}${toc.avgRP != null ? ` · avg R_P ${Number(toc.avgRP).toFixed(3)}` : ''}`
      );
    }
    if (toc.principalOutstandingTotal != null) {
      lines.push(`  Principal:   $${Math.round(toc.principalOutstandingTotal)}`);
    }
  } else {
    lines.push('  Fixture missing — bun run ops:seed:toc');
  }

  if (channels) {
    lines.push('', '── Channels ──────────────────────────────');
    lines.push(`  Sent:        ${channels.sent ?? 0}`);
    lines.push(`  Pending:     ${channels.pending ?? 0}`);
    lines.push(`  Failed:      ${channels.failed ?? 0}`);
    if (typeof channels.failRate === 'number') {
      lines.push(`  Fail rate:   ${Math.round(channels.failRate * 100)}%`);
    }
  }

  const def = data.defaults;
  lines.push('', '── Bun defaults ──────────────────────────');
  if (def?.available) {
    lines.push(`  Proof:       ${def.passed ?? '?'}/${def.total ?? '?'} · ${def.status ?? '—'}`);
    lines.push(`  Bun:         ${def.bunVersion ?? '—'}`);
    if (def.proofHash) lines.push(`  Hash:        ${String(def.proofHash).slice(0, 16)}…`);
    if (def.generated) lines.push(`  Generated:   ${def.generated}`);
    lines.push(`  Artifact:    ${def.path}`);
  } else {
    lines.push('  Missing — bun run verify:defaults:save');
  }

  const tax = data.proofTaxonomy;
  lines.push('', '── Proof taxonomy audit ──────────────────');
  if (tax?.available) {
    lines.push(`  Contracts:   ${tax.contractsOk ?? '?'}/${tax.contracts ?? '?'} · ok=${tax.ok}`);
    if (tax.consistencyTotal != null) {
      lines.push(`  Consistency: ${tax.consistencyOk ?? '?'}/${tax.consistencyTotal}`);
    }
    lines.push(`  Source:      ${tax.source ?? '—'}`);
    lines.push(`  Artifact:    ${tax.path}`);
  } else {
    lines.push('  Missing — bun run verify:proof-taxonomy:save');
  }

  lines.push(
    '',
    '── Environment ───────────────────────────',
    `  Checklist:    ${envSum.ok ?? '—'}/${envSum.total ?? '—'} ok`,
    `  Required gaps:${envSum.requiredMissing ?? 0}`,
    `  Note:         ${envSum.note ?? '—'}`,
    '',
    '── Links ─────────────────────────────────',
    '  JSON:     GET /api/health  ·  GET /health',
    '  Plain:    GET /health/pre',
    '  Defaults: GET /api/defaults  ·  /registry/defaults-proof.json',
    '  Audit:    GET /registry/proof-taxonomy-audit.json',
    '  UI:       GET /portal/health/',
    '  OPTIONS:  Allow GET, HEAD, OPTIONS (If-None-Match, Accept, Content-Type)',
    ''
  );

  return lines.join('\n');
}

export function edgeHealthOptionsResponse(): Response {
  return portalOptionsResponse();
}

export async function respondEdgeHealthJson(
  request: Request,
  body: EdgeHealthBody
): Promise<Response> {
  const etag = await computeEdgeHealthETag(body);
  const inm = request.headers.get('If-None-Match');
  if (inm && inm.includes(etag.replace(/"/g, ''))) {
    return new Response(null, {
      status: 304,
      headers: {
        ETag: etag,
        Vary: 'Accept',
        'Cache-Control': 'public, max-age=15, must-revalidate',
        'Access-Control-Allow-Origin': '*',
        'X-ETag-Scope': 'health-edge-snapshot',
      },
    });
  }
  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ETag: etag,
      Vary: 'Accept',
      'Cache-Control': 'public, max-age=15, must-revalidate',
      'Access-Control-Allow-Origin': '*',
      'X-ETag-Scope': 'health-edge-snapshot',
    },
  });
}

export async function respondEdgeHealthPlain(
  request: Request,
  body: EdgeHealthBody
): Promise<Response> {
  const etag = await computeEdgeHealthETag(body);
  const inm = request.headers.get('If-None-Match');
  if (inm && inm.includes(etag.replace(/"/g, ''))) {
    return new Response(null, {
      status: 304,
      headers: {
        ETag: etag,
        Vary: 'Accept',
        'Cache-Control': 'public, max-age=15, must-revalidate',
        'Access-Control-Allow-Origin': '*',
        'X-ETag-Scope': 'health-edge-snapshot',
      },
    });
  }
  return new Response(renderEdgeHealthPlain(body), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      ETag: etag,
      Vary: 'Accept',
      'Cache-Control': 'public, max-age=15, must-revalidate',
      'Access-Control-Allow-Origin': '*',
      'X-ETag-Scope': 'health-edge-snapshot',
    },
  });
}
