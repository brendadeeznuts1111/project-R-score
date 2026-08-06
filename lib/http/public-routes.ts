// @see https://bun.com/docs/runtime/color#flexible-input — Bun.color
// @see https://bun.com/blog/bun-v1.3.4#urlpattern-api — URLPattern
/**
 * Public route catalog for serve-public + portal dashboards.
 *
 * Mirrors `scripts/serve-public.ts` `buildPublicRoutes()` + fetch-handler paths
 * and hot-preloaded static assets. Used by:
 *   - tools/verify-networking.ts --routes
 *   - ops / health dashboards that list endpoint inventory
 *
 * Kind legend:
 *   simd-route   — Bun.serve `routes` exact match (SIMD)
 *   fetch-handler — `fetch` fallback (path prefix / static file)
 *   hot-static   — preloaded memory ETag asset (hotByUrl)
 *   file-static  — disk / respondAuto (portal HTML, large JSON)
 */

export type PublicRouteKind = 'simd-route' | 'fetch-handler' | 'hot-static' | 'file-static';

export type PublicRouteCategory =
  'ready' | 'health' | 'api' | 'portal' | 'registry' | 'proof' | 'monitoring';

export type PublicRouteDef = {
  path: string;
  name: string;
  category: PublicRouteCategory;
  kind: PublicRouteKind;
  /** Fail suite if this path is not reachable. */
  critical?: boolean;
  method?: 'GET' | 'HEAD';
  /** HTTP statuses that count as reachable for this route. */
  okStatuses?: number[];
  note?: string;
};

/**
 * Exact SIMD routes registered in `buildPublicRoutes()` (plus known portal file routes).
 * Keep in sync when adding handlers in scripts/serve-public.ts.
 */
export const SIMD_ROUTES: PublicRouteDef[] = [
  {
    path: '/ready',
    name: 'Ready',
    category: 'ready',
    kind: 'simd-route',
    critical: true,
    okStatuses: [200],
  },
  {
    path: '/health',
    name: 'Health JSON',
    category: 'health',
    kind: 'simd-route',
    critical: true,
    okStatuses: [200],
    note: 'Pages: functions/health/index.ts · origin: serve-public health()',
  },
  {
    path: '/health/pre',
    name: 'Health plain',
    category: 'health',
    kind: 'simd-route',
    critical: true,
    okStatuses: [200],
    note: 'text/plain · shared data ETag with /health (Vary: Accept) · Pages: functions/health/pre.ts',
  },
  {
    path: '/api/health',
    name: 'Health API (portal)',
    category: 'health',
    kind: 'simd-route',
    critical: true,
    okStatuses: [200],
  },
  {
    path: '/',
    name: 'Home landing',
    category: 'portal',
    kind: 'simd-route',
    okStatuses: [200],
  },
  {
    path: '/api/proof',
    name: 'API proof',
    category: 'proof',
    kind: 'simd-route',
    okStatuses: [200],
  },
  {
    path: '/api/monitoring',
    name: 'Monitoring API',
    category: 'api',
    kind: 'simd-route',
    critical: true,
    okStatuses: [200],
  },
  {
    path: '/api/operations/summary',
    name: 'Ops summary API',
    category: 'api',
    kind: 'simd-route',
    critical: true,
    okStatuses: [200],
  },
  {
    path: '/api/catalog',
    name: 'Catalog API',
    category: 'api',
    kind: 'simd-route',
    okStatuses: [200],
  },
  {
    path: '/api/dod',
    name: 'DOD API',
    category: 'api',
    kind: 'simd-route',
    okStatuses: [200],
  },
  {
    path: '/api/skills',
    name: 'Skills catalog API',
    category: 'api',
    kind: 'simd-route',
    okStatuses: [200],
  },
  {
    path: '/api/channels/events',
    name: 'Channels events',
    category: 'api',
    kind: 'simd-route',
    okStatuses: [200, 401],
    note: 'production requires read auth; development may expose the local feed',
  },
  {
    path: '/api/registry',
    name: 'Registry index',
    category: 'registry',
    kind: 'simd-route',
    critical: true,
    okStatuses: [200],
  },
  {
    path: '/api/registry/static',
    name: 'Registry static aggregate',
    category: 'registry',
    kind: 'simd-route',
    okStatuses: [200],
  },
  {
    path: '/api/registry/search',
    name: 'Registry search',
    category: 'registry',
    kind: 'simd-route',
    okStatuses: [200],
    note: 'empty q may still 200 with empty hits',
  },
  {
    path: '/monitoring',
    name: 'Monitoring page',
    category: 'monitoring',
    kind: 'simd-route',
    okStatuses: [200],
  },
  {
    path: '/portal',
    name: 'Portal index',
    category: 'portal',
    kind: 'simd-route',
    critical: true,
    okStatuses: [200],
  },
  {
    path: '/portal/',
    name: 'Portal index /',
    category: 'portal',
    kind: 'simd-route',
    okStatuses: [200],
  },
];

/** Portal dashboard HTML surfaces (file/static via fetch or directory index). */
export const PORTAL_DASHBOARD_ROUTES: PublicRouteDef[] = [
  {
    path: '/portal/',
    name: 'Registry portal',
    category: 'portal',
    kind: 'file-static',
    critical: true,
    okStatuses: [200],
    note: 'app.js · static /registry/registry.json fallback',
  },
  {
    path: '/portal/ops/',
    name: 'Ops dashboard',
    category: 'portal',
    kind: 'file-static',
    critical: true,
    okStatuses: [200],
    note: 'operations-dashboard.js · routing proof widgets',
  },
  {
    path: '/portal/health/',
    name: 'Health dashboard',
    category: 'portal',
    kind: 'file-static',
    critical: true,
    okStatuses: [200],
  },
  {
    path: '/portal/env/',
    name: 'Env checklist',
    category: 'portal',
    kind: 'file-static',
    okStatuses: [200],
    note: 'vault-map · portal-cli secret map',
  },
  {
    path: '/portal/vault/',
    name: 'Vault health board',
    category: 'portal',
    kind: 'file-static',
    okStatuses: [200],
    note: 'live bake · gate: portal-cli vault health',
  },
  {
    path: '/portal/tools/',
    name: 'CLI tools hub',
    category: 'portal',
    kind: 'file-static',
    okStatuses: [200],
    note: 'portal-cli surface map · pm · snapshot · secret',
  },
  {
    path: '/portal/failures/',
    name: 'Test failures board',
    category: 'portal',
    kind: 'file-static',
    okStatuses: [200],
    note: 'failures:bake · junit',
  },
  {
    path: '/portal/install-hygiene/',
    name: 'Install hygiene board',
    category: 'portal',
    kind: 'file-static',
    okStatuses: [200],
    note: 'bake:install-hygiene · install-hygiene-report.json · cache/npm/verify',
  },
  {
    path: '/registry/install-hygiene-report.json',
    name: 'Install hygiene bake',
    category: 'registry',
    kind: 'file-static',
    okStatuses: [200, 404],
    note: 'optional plane · bun run bake:install-hygiene',
  },
  {
    path: '/portal/dod/',
    name: 'DOD portal',
    category: 'portal',
    kind: 'file-static',
    okStatuses: [200],
  },
  {
    path: '/portal/compliance/',
    name: 'Compliance portal',
    category: 'portal',
    kind: 'file-static',
    okStatuses: [200],
    critical: true,
    note: 'compliance-dashboard.js · /registry/compliance-board.json · /api/compliance',
  },
  {
    path: '/portal/limits/',
    name: 'Partner limits portal',
    category: 'portal',
    kind: 'file-static',
    okStatuses: [200],
    critical: true,
    note: 'multi-factor raises · ops-summary.limitChanges · /api/agents/v1/limits/raises',
  },
  {
    path: '/portal/agent-odds/',
    name: 'Agent odds dashboard',
    category: 'portal',
    kind: 'file-static',
    okStatuses: [200],
    note: 'partner-adjacent trading desk · static on Pages · live APIs via serve:public (same-origin) or agent:odds-dashboard',
  },
  {
    path: '/portal/partner/',
    name: 'Partner health portal',
    category: 'portal',
    kind: 'file-static',
    okStatuses: [200],
    critical: true,
    note: 'partner domain health · profile alignment · per-out checks · /registry/partner-health.json',
  },
  {
    path: '/portal/partners/',
    name: 'Partners desk portal',
    category: 'portal',
    kind: 'file-static',
    okStatuses: [200],
    critical: true,
    note: 'telegram-handshake · seat-capital-desk · accounting topic · deposit rails',
  },
  {
    path: '/portal/bookmakers/',
    name: 'Bookmakers registry portal',
    category: 'portal',
    kind: 'file-static',
    okStatuses: [200],
    note: '@factorywager/bookmakers v0.4 public catalog · /registry/bookmakers.json · bookmakers:bake',
  },
  {
    path: '/registry/bookmakers.json',
    name: 'Bookmakers registry bake',
    category: 'registry',
    kind: 'file-static',
    okStatuses: [200],
    note: 'v0.4 Pages-safe public catalog (schemaVersion 2 · no apiKeyEnv/balance)',
  },
  {
    path: '/registry/bookmakers-desk-coverage.json',
    name: 'Bookmakers seat desk coverage',
    category: 'registry',
    kind: 'file-static',
    okStatuses: [200, 404],
    note: 'bookmakers:desk-coverage bake · matched/placeholder/unmatched desk books',
  },
  {
    path: '/portal/account/',
    name: 'Account dossier portal',
    category: 'portal',
    kind: 'file-static',
    okStatuses: [200],
    note: 'single TreeNodeId dossier · tree · location · telemetry · betlog',
  },
  {
    path: '/portal/partner-history/',
    name: 'Partner history portal',
    category: 'portal',
    kind: 'file-static',
    okStatuses: [200],
    note: 'per-partner limit history · links /portal/limits/',
  },
  {
    path: '/registry/limit-raises.json',
    name: 'Limit raises multi-factor bake',
    category: 'registry',
    kind: 'file-static',
    okStatuses: [200, 404],
    note: 'ops:snapshot companion · PartnerAnalyticsRepository',
  },
  {
    path: '/registry/compliance-board.json',
    name: 'Compliance board fixture',
    category: 'registry',
    kind: 'file-static',
    okStatuses: [200],
    critical: true,
    note: 'ops:snapshot companion bake · bun run compliance:bake',
  },
  {
    path: '/api/compliance',
    name: 'Compliance board API',
    category: 'api',
    kind: 'fetch-handler',
    okStatuses: [200, 503],
    critical: true,
    note: 'snapshot from compliance-board.json; 503 if missing bake',
  },
  {
    path: '/api/agents/v1/limits/raises',
    name: 'Agent limit-raise context API',
    category: 'api',
    kind: 'simd-route',
    okStatuses: [200, 400, 401, 503],
    note: 'local SQLite + Pages snapshot; node_id required; ?format=table; 503 if bake missing',
  },
  {
    path: '/api/agents/v1/limits/record',
    name: 'Limit record API',
    category: 'api',
    kind: 'simd-route',
    okStatuses: [201, 400, 405, 503],
    note: 'POST local SQLite; Pages stub 503 — auto-detects raises and enqueues alerts',
  },
  {
    path: '/api/limits/summary',
    name: 'Limit summary API',
    category: 'api',
    kind: 'simd-route',
    okStatuses: [200, 503],
    note: 'public aggregate 48h; ?format=table; Pages from limit-raises.json',
  },
  {
    path: '/api/limits/analyze',
    name: 'Limit granular analyze API',
    category: 'api',
    kind: 'simd-route',
    okStatuses: [200, 500, 503],
    note: 'local SQLite — book/sport/market + regulatory; Pages stub 503',
  },
  {
    path: '/api/limits/predictions',
    name: 'Limit prediction accuracy API',
    category: 'api',
    kind: 'simd-route',
    okStatuses: [200, 500, 503],
    note: 'GET accuracy · POST cycle local; Pages stub 503',
  },
  {
    path: '/api/limits/analyze',
    name: 'Limit granular analysis API',
    category: 'api',
    kind: 'simd-route',
    okStatuses: [200],
    note: 'public — granular breakdown by book/sport/market + regulatory correlation',
  },
  {
    path: '/api/limits/predictions',
    name: 'Limit predictions API',
    category: 'api',
    kind: 'simd-route',
    okStatuses: [200],
    note: 'GET returns accuracy; POST runs prediction cycle',
  },
  {
    path: '/portal/toc/',
    name: 'TOC Ops portal',
    category: 'portal',
    kind: 'file-static',
    okStatuses: [200],
    note: 'toc-dashboard.js · /registry/toc-ops.json · /api/toc',
  },
  {
    path: '/registry/toc-ops.json',
    name: 'TOC Ops fixture',
    category: 'registry',
    kind: 'file-static',
    okStatuses: [200],
  },
  {
    path: '/registry/toc-ops-bake-proof.json',
    name: 'TOC Ops bake proof',
    category: 'registry',
    kind: 'file-static',
    okStatuses: [200],
    note: 'operate-lite gates · T/I/OE · R_P evidence',
  },
  {
    path: '/api/toc',
    name: 'TOC Ops API',
    category: 'api',
    kind: 'fetch-handler',
    okStatuses: [200, 401, 404],
    note: 'Pages Function ASSETS snapshot; local production may require read auth; POST → 503',
  },
  {
    path: '/api/toc/proof',
    name: 'TOC Ops bake proof API',
    category: 'api',
    kind: 'fetch-handler',
    okStatuses: [200, 401, 404],
    note: 'local production may require read auth',
  },
  {
    path: '/portal/catalog/',
    name: 'Catalog portal',
    category: 'portal',
    kind: 'file-static',
    okStatuses: [200],
  },
  {
    path: '/portal/skills/',
    name: 'Skills registry',
    category: 'portal',
    kind: 'file-static',
    okStatuses: [200],
    note: '/api/skills JSON · *.skill package downloads under /skills/',
  },
  {
    path: '/portal/brands/',
    name: 'Brand keymap',
    category: 'portal',
    kind: 'file-static',
    okStatuses: [200],
    note: '/registry/brand-keymap.json · constructor glossary · project adoption',
  },
  {
    path: '/portal/glossary/',
    name: 'Domain glossary',
    category: 'portal',
    kind: 'file-static',
    okStatuses: [200],
    note: '/registry/domain-glossary.json schema v3 · sections[] hash/domId/conceptId · URLPattern.hash deep links',
  },
  {
    path: '/portal/issues/',
    name: 'GitHub issue taxonomy',
    category: 'portal',
    kind: 'file-static',
    okStatuses: [200],
    note: '/registry/github-issue-taxonomy.json · credential-free ownership and drift board',
  },
  {
    path: '/portal/lanes/',
    name: 'Workspace lane crosswalk',
    category: 'portal',
    kind: 'file-static',
    okStatuses: [200],
    note: '/registry/workspace-lane-map.json · session · chrome · concept correlations',
  },
  {
    path: '/registry/workspace-lane-map.json',
    name: 'Workspace lane map projection',
    category: 'registry',
    kind: 'file-static',
    okStatuses: [200],
    note: 'session archive lanes correlated with chrome Domain and ConceptDomain',
  },
  {
    path: '/registry/partner-surface-inventory.json',
    name: 'Partner surface inventory projection',
    category: 'registry',
    kind: 'file-static',
    okStatuses: [200],
    note: 'map-before-rename · taxonomy · boards · brands · wire traps · docs',
  },
  {
    path: '/registry/github-issue-taxonomy.json',
    name: 'GitHub issue taxonomy projection',
    category: 'registry',
    kind: 'file-static',
    okStatuses: [200],
    note: 'deterministic semantic dimensions · provider labels · public color projection',
  },

  {
    path: '/portal/concepts/',
    name: 'Concepts inventory',
    category: 'portal',
    kind: 'file-static',
    okStatuses: [200],
    note: 'concepts:bake · /registry/concepts-state.json · graph board at /portal/concepts/graph/',
  },
  {
    path: '/registry/domain-glossary.json',
    name: 'Domain glossary projection',
    category: 'registry',
    kind: 'file-static',
    okStatuses: [200],
    note: 'domain + portal semantic authorities · typed UI roles · Bun.color category tokens',
  },
  {
    path: '/portal/dashboard/',
    name: 'Executive dashboard',
    category: 'portal',
    kind: 'file-static',
    okStatuses: [200],
    note: 'dashboard.js · monitoring + ops-summary + defaults command center',
  },
  {
    path: '/monitoring/',
    name: 'Monitoring page',
    category: 'portal',
    kind: 'file-static',
    okStatuses: [200],
    note: 'static HTML · /api/monitoring JSON',
  },
  {
    path: '/portal/bunfig/',
    name: 'Bunfig status board',
    category: 'portal',
    kind: 'file-static',
    okStatuses: [200],
    note: 'bunfig-state.json · portal:doctor bunfig group',
  },
  {
    path: '/portal/console-format/',
    name: 'Console format board',
    category: 'portal',
    kind: 'file-static',
    okStatuses: [200],
    note: 'console-format-state.json · lint-console-format ratchet',
  },
  {
    path: '/portal/doctor/',
    name: 'Portal doctor board',
    category: 'portal',
    kind: 'file-static',
    okStatuses: [200],
    note: 'doctor-state.json · portal:doctor groups',
  },
  {
    path: '/portal/factory/',
    name: 'Factory registry board',
    category: 'portal',
    kind: 'file-static',
    okStatuses: [200],
    note: 'factory registry JSON',
  },
  {
    path: '/portal/identity/',
    name: 'Identity board',
    category: 'portal',
    kind: 'file-static',
    okStatuses: [200],
    note: 'lib/identity phase boards',
  },
  {
    path: '/portal/limits-lab/',
    name: 'Limit forecast lab',
    category: 'portal',
    kind: 'file-static',
    okStatuses: [200],
    note: 'page.limitForecastLab · ops:limits:predict',
  },
  {
    path: '/portal/science/',
    name: 'Science board',
    category: 'portal',
    kind: 'file-static',
    okStatuses: [200],
    note: 'page.science · research/program artifacts',
  },
  {
    path: '/portal/surfaces/',
    name: 'Surfaces board',
    category: 'portal',
    kind: 'file-static',
    okStatuses: [200],
    note: 'surfaces-state.json · surfaces:bake',
  },
  {
    path: '/portal/tennis/',
    name: 'Tennis HQ board',
    category: 'portal',
    kind: 'file-static',
    okStatuses: [200],
    note: 'page.tennis · tennis-hq registry',
  },
  {
    path: '/portal/packages/',
    name: 'Packages board',
    category: 'portal',
    kind: 'file-static',
    okStatuses: [200],
    note: 'page.packages · packages/workspaces docs index',
  },
];

/** Env status API (fetch-handler in serve-public). */
export const FETCH_HANDLER_ROUTES: PublicRouteDef[] = [
  {
    path: '/api/env',
    name: 'Env status API',
    category: 'api',
    kind: 'simd-route',
    okStatuses: [200],
    note: 'registered on routes (SIMD); also available via fetch fallback',
  },
  {
    path: '/llms.txt',
    name: 'llms.txt index',
    category: 'ready',
    kind: 'simd-route',
    okStatuses: [200],
    note: 'static Response route (docs zero-alloc pattern)',
  },
  {
    path: '/site.webmanifest',
    name: 'FactoryWager web manifest',
    category: 'portal',
    kind: 'file-static',
    critical: true,
    okStatuses: [200],
    note: 'brand install metadata · public with read auth enabled',
  },
  {
    path: '/icons/factory/mark-32.webp',
    name: 'FactoryWager portal mark',
    category: 'portal',
    kind: 'file-static',
    critical: true,
    okStatuses: [200],
    note: 'shared header mark · public with read auth enabled',
  },
];

/**
 * Typical hot-preloaded paths (subset of health.serve.hotPreloaded).
 * Live list is merged at probe time from GET /health.
 */
export const HOT_STATIC_ROUTES: PublicRouteDef[] = [
  {
    path: '/registry/ops-summary.json',
    name: 'Ops summary artifact',
    category: 'registry',
    kind: 'hot-static',
    critical: true,
    okStatuses: [200],
  },
  {
    path: '/registry/static.json',
    name: 'Static aggregate',
    category: 'registry',
    kind: 'hot-static',
    okStatuses: [200],
  },
  {
    path: '/registry/monitoring.json',
    name: 'Monitoring artifact',
    category: 'registry',
    kind: 'hot-static',
    okStatuses: [200],
  },
  {
    path: '/registry/skills-catalog.json',
    name: 'Skills catalog artifact',
    category: 'registry',
    kind: 'hot-static',
    okStatuses: [200],
    note: 'origin scan via ops:snapshot · /api/skills on Pages',
  },
  {
    path: '/registry/dod-queue.json',
    name: 'DOD queue snapshot',
    category: 'registry',
    kind: 'hot-static',
    okStatuses: [200],
    note: 'exported by ops:snapshot · /api/dod on Pages',
  },
  {
    path: '/registry/portal-weave.json',
    name: 'Portal weave index',
    category: 'registry',
    kind: 'hot-static',
    okStatuses: [200],
    note: 'cross-surface links + operator scripts from ops:snapshot',
  },
  {
    path: '/registry/registry.json',
    name: 'Registry index file',
    category: 'registry',
    kind: 'hot-static',
    critical: true,
    okStatuses: [200],
  },
  {
    path: '/registry/prediction/report/',
    name: 'Prediction report',
    category: 'registry',
    kind: 'file-static',
    critical: true,
    okStatuses: [200],
    note: 'directory index — Cloudflare pretty URL',
  },
  {
    path: '/registry/prediction/report.html',
    name: 'Prediction report (legacy alias)',
    category: 'registry',
    kind: 'file-static',
    okStatuses: [200],
    note: 'stub → /registry/prediction/report/ (Pages _redirects 301)',
  },
  {
    path: '/registry/prediction/report/summary.json',
    name: 'Prediction report summary',
    category: 'registry',
    kind: 'file-static',
    okStatuses: [200],
    note: 'machine-readable coverage backtest diagnostics',
  },
  {
    path: '/registry/@factorywager/routing-test/latest.json',
    name: 'Routing-test proof',
    category: 'proof',
    kind: 'hot-static',
    okStatuses: [200],
  },
  {
    path: '/registry/@factorywager/bun-utils-test/latest.json',
    name: 'Bun-utils proof',
    category: 'proof',
    kind: 'hot-static',
    okStatuses: [200],
  },
  {
    path: '/registry/@factorywager/registry-snapshot/latest.json',
    name: 'Registry snapshot',
    category: 'proof',
    kind: 'hot-static',
    okStatuses: [200],
  },
  {
    path: '/tools/bun-api-coverage-proof.json',
    name: 'API coverage proof',
    category: 'proof',
    kind: 'hot-static',
    okStatuses: [200, 401],
    note: 'tool-source proof may require read auth; public mirror lives under /registry/',
  },
];

/** Full catalog (deduped by path, first wins). */
export function publicRouteCatalog(): PublicRouteDef[] {
  const seen = new Set<string>();
  const out: PublicRouteDef[] = [];
  for (const r of [
    ...SIMD_ROUTES,
    ...PORTAL_DASHBOARD_ROUTES,
    ...FETCH_HANDLER_ROUTES,
    ...HOT_STATIC_ROUTES,
  ]) {
    if (seen.has(r.path)) continue;
    seen.add(r.path);
    out.push(r);
  }
  return out;
}

/** Group catalog for dashboards / inspect.table sections. */
export function publicRoutesByCategory(): Record<PublicRouteCategory, PublicRouteDef[]> {
  const cats = {} as Record<PublicRouteCategory, PublicRouteDef[]>;
  for (const r of publicRouteCatalog()) {
    (cats[r.category] ??= []).push(r);
  }
  return cats;
}

/** Shape expected from GET /health for route objects. */
export type HealthRouteObjects = {
  routeStats?: {
    staticRoutes?: number;
    fileRoutes?: number;
    totalMemoryUsed?: number;
    staticHits?: number;
    fileHits?: number;
    notModified304?: number;
    decision?: { rule?: string; staticMaxBytes?: number; hotMaxBytes?: number };
  };
  serve?: {
    strategies?: Record<string, string>;
    etagScope?: string;
    hotPreloaded?: string[];
  };
  status?: string;
  bun?: string;
};

export function mergeHotFromHealth(
  catalog: PublicRouteDef[],
  health: HealthRouteObjects | null
): PublicRouteDef[] {
  const hot = health?.serve?.hotPreloaded ?? [];
  if (!hot.length) return catalog;
  const seen = new Set(catalog.map(r => r.path));
  const extra: PublicRouteDef[] = [];
  for (const path of hot) {
    if (seen.has(path)) continue;
    seen.add(path);
    extra.push({
      path,
      name: path,
      category: path.startsWith('/api/')
        ? 'api'
        : path.startsWith('/registry/')
          ? 'registry'
          : 'proof',
      kind: 'hot-static',
      okStatuses: [200],
      note: 'from health.serve.hotPreloaded',
    });
  }
  return [...catalog, ...extra];
}
