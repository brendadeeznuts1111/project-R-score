#!/usr/bin/env bun
// @bun

// lib/path-bun.ts
function normalizePath(path) {
  const isAbs = path.startsWith("/");
  const out = [];
  for (const seg of path.split("/")) {
    if (seg === "" || seg === ".")
      continue;
    if (seg === "..") {
      if (out.length > 0)
        out.pop();
      continue;
    }
    out.push(seg);
  }
  const body = out.join("/");
  if (isAbs)
    return `/${body}`;
  return body || ".";
}
function joinPath(...parts) {
  return normalizePath(parts.filter((p) => p != null && String(p) !== "").join("/"));
}

// lib/http/fetch-preconnect.ts
var {dns } = globalThis.Bun;
var BUN_DNS_PREFETCHING_DOCS = "https://bun.com/docs/runtime/networking/fetch#dns-prefetching";
var BUN_DNS_PREFETCH_DOCS = "https://bun.com/docs/runtime/networking/dns#dns-prefetch";
var BUN_DNS_CACHE_STATS_DOCS = "https://bun.com/docs/runtime/networking/dns#dns-getcachestats";
var BUN_FETCH_PRECONNECT_DOCS = "https://bun.com/docs/runtime/networking/fetch#preconnect-to-a-host";
var BUN_FETCH_PRECONNECT_STARTUP_DOCS = "https://bun.com/docs/runtime/networking/fetch#preconnect-at-startup";
function defaultPortForUrl(url) {
  if (url.port !== "")
    return Number(url.port);
  if (url.protocol === "https:")
    return 443;
  if (url.protocol === "http:")
    return 80;
  return 443;
}
function dnsPrefetchHost(hostname, port) {
  const host = hostname.trim();
  if (!host) {
    return { host, port, ok: false, note: "empty hostname" };
  }
  try {
    if (port !== undefined && Number.isFinite(port) && port > 0) {
      dns.prefetch(host, port);
      return { host, port, ok: true };
    }
    dns.prefetch(host);
    return { host, ok: true };
  } catch (err) {
    return {
      host,
      port,
      ok: false,
      note: err instanceof Error ? err.message : String(err)
    };
  }
}
function dnsPrefetchOrigin(originOrUrl) {
  try {
    const u = new URL(originOrUrl.includes("://") ? originOrUrl : `https://${originOrUrl}`);
    return dnsPrefetchHost(u.hostname, defaultPortForUrl(u));
  } catch {
    return { host: originOrUrl, ok: false, note: "invalid URL" };
  }
}
function dnsCacheStats() {
  return dns.getCacheStats();
}
function preconnectCliUrl(originOrUrl) {
  const u = new URL(originOrUrl.includes("://") ? originOrUrl : `https://${originOrUrl}`);
  if (u.protocol === "https:" && (u.port === "" || u.port === "443")) {
    return `https://${u.hostname}:443`;
  }
  if (u.protocol === "http:" && (u.port === "" || u.port === "80")) {
    return `http://${u.hostname}:80`;
  }
  return u.origin;
}
function preconnectOrigin(originOrUrl) {
  let host = originOrUrl;
  let origin = originOrUrl;
  let port;
  try {
    const u2 = new URL(originOrUrl.includes("://") ? originOrUrl : `http://${originOrUrl}`);
    host = u2.hostname;
    origin = u2.origin;
    port = defaultPortForUrl(u2);
  } catch {
    return {
      origin: originOrUrl,
      host: originOrUrl,
      dnsPrefetch: false,
      fetchPreconnect: false,
      note: "invalid URL"
    };
  }
  const dnsResult = dnsPrefetchHost(host, port);
  const dnsPrefetch = dnsResult.ok;
  let fetchPreconnect = false;
  let note = dnsResult.note;
  const u = new URL(origin);
  if (u.protocol === "https:") {
    note = `fetch.preconnect HTTPS throws Invalid port \u2014 use CLI: bun --fetch-preconnect ${preconnectCliUrl(origin)} ./app.ts (dns.prefetch host+port still applied)`;
    return { origin, host, port, dnsPrefetch, fetchPreconnect, note };
  }
  const target = u.port !== "" ? origin : `http://${u.hostname}:80`;
  try {
    fetch.preconnect(target);
    fetchPreconnect = true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    note = note ? `${note}; ${msg}` : msg;
  }
  return { origin, host, port, dnsPrefetch, fetchPreconnect, note };
}

// lib/http/public-routes.ts
var SIMD_ROUTES = [
  {
    path: "/ready",
    name: "Ready",
    category: "ready",
    kind: "simd-route",
    critical: true,
    okStatuses: [200]
  },
  {
    path: "/health",
    name: "Health JSON",
    category: "health",
    kind: "simd-route",
    critical: true,
    okStatuses: [200]
  },
  {
    path: "/health/pre",
    name: "Health plain",
    category: "health",
    kind: "simd-route",
    critical: true,
    okStatuses: [200],
    note: "shared data ETag with /health (Vary: Accept)"
  },
  {
    path: "/api/proof",
    name: "API proof",
    category: "proof",
    kind: "simd-route",
    okStatuses: [200]
  },
  {
    path: "/api/monitoring",
    name: "Monitoring API",
    category: "api",
    kind: "simd-route",
    critical: true,
    okStatuses: [200]
  },
  {
    path: "/api/operations/summary",
    name: "Ops summary API",
    category: "api",
    kind: "simd-route",
    critical: true,
    okStatuses: [200]
  },
  {
    path: "/api/catalog",
    name: "Catalog API",
    category: "api",
    kind: "simd-route",
    okStatuses: [200]
  },
  {
    path: "/api/dod",
    name: "DOD API",
    category: "api",
    kind: "simd-route",
    okStatuses: [200]
  },
  {
    path: "/api/channels/events",
    name: "Channels events",
    category: "api",
    kind: "simd-route",
    okStatuses: [200]
  },
  {
    path: "/api/registry",
    name: "Registry index",
    category: "registry",
    kind: "simd-route",
    critical: true,
    okStatuses: [200]
  },
  {
    path: "/api/registry/static",
    name: "Registry static aggregate",
    category: "registry",
    kind: "simd-route",
    okStatuses: [200]
  },
  {
    path: "/api/registry/search",
    name: "Registry search",
    category: "registry",
    kind: "simd-route",
    okStatuses: [200],
    note: "empty q may still 200 with empty hits"
  },
  {
    path: "/monitoring",
    name: "Monitoring page",
    category: "monitoring",
    kind: "simd-route",
    okStatuses: [200]
  },
  {
    path: "/portal",
    name: "Portal index",
    category: "portal",
    kind: "simd-route",
    critical: true,
    okStatuses: [200]
  },
  {
    path: "/portal/",
    name: "Portal index /",
    category: "portal",
    kind: "simd-route",
    okStatuses: [200]
  }
];
var PORTAL_DASHBOARD_ROUTES = [
  {
    path: "/portal/ops/",
    name: "Ops dashboard",
    category: "portal",
    kind: "file-static",
    critical: true,
    okStatuses: [200],
    note: "operations-dashboard.js \xB7 routing proof widgets"
  },
  {
    path: "/portal/health/",
    name: "Health dashboard",
    category: "portal",
    kind: "file-static",
    critical: true,
    okStatuses: [200]
  },
  {
    path: "/portal/env/",
    name: "Env checklist",
    category: "portal",
    kind: "file-static",
    okStatuses: [200]
  },
  {
    path: "/portal/dod/",
    name: "DOD portal",
    category: "portal",
    kind: "file-static",
    okStatuses: [200]
  },
  {
    path: "/portal/catalog/",
    name: "Catalog portal",
    category: "portal",
    kind: "file-static",
    okStatuses: [200]
  }
];
var FETCH_HANDLER_ROUTES = [
  {
    path: "/api/env",
    name: "Env status API",
    category: "api",
    kind: "simd-route",
    okStatuses: [200],
    note: "registered on routes (SIMD); also available via fetch fallback"
  },
  {
    path: "/llms.txt",
    name: "llms.txt index",
    category: "ready",
    kind: "simd-route",
    okStatuses: [200],
    note: "static Response route (docs zero-alloc pattern)"
  }
];
var HOT_STATIC_ROUTES = [
  {
    path: "/registry/ops-summary.json",
    name: "Ops summary artifact",
    category: "registry",
    kind: "hot-static",
    critical: true,
    okStatuses: [200]
  },
  {
    path: "/registry/static.json",
    name: "Static aggregate",
    category: "registry",
    kind: "hot-static",
    okStatuses: [200]
  },
  {
    path: "/registry/monitoring.json",
    name: "Monitoring artifact",
    category: "registry",
    kind: "hot-static",
    okStatuses: [200]
  },
  {
    path: "/registry/registry.json",
    name: "Registry index file",
    category: "registry",
    kind: "hot-static",
    critical: true,
    okStatuses: [200]
  },
  {
    path: "/registry/prediction/report.html",
    name: "Prediction report",
    category: "registry",
    kind: "file-static",
    critical: true,
    okStatuses: [200]
  },
  {
    path: "/registry/@factorywager/routing-test/latest.json",
    name: "Routing-test proof",
    category: "proof",
    kind: "hot-static",
    okStatuses: [200]
  },
  {
    path: "/registry/@factorywager/bun-utils-test/latest.json",
    name: "Bun-utils proof",
    category: "proof",
    kind: "hot-static",
    okStatuses: [200]
  },
  {
    path: "/registry/@factorywager/registry-snapshot/latest.json",
    name: "Registry snapshot",
    category: "proof",
    kind: "hot-static",
    okStatuses: [200]
  },
  {
    path: "/tools/bun-api-coverage-proof.json",
    name: "API coverage proof",
    category: "proof",
    kind: "hot-static",
    okStatuses: [200]
  }
];
function publicRouteCatalog() {
  const seen = new Set;
  const out = [];
  for (const r of [
    ...SIMD_ROUTES,
    ...PORTAL_DASHBOARD_ROUTES,
    ...FETCH_HANDLER_ROUTES,
    ...HOT_STATIC_ROUTES
  ]) {
    if (seen.has(r.path))
      continue;
    seen.add(r.path);
    out.push(r);
  }
  return out;
}
function mergeHotFromHealth(catalog, health) {
  const hot = health?.serve?.hotPreloaded ?? [];
  if (!hot.length)
    return catalog;
  const seen = new Set(catalog.map((r) => r.path));
  const extra = [];
  for (const path of hot) {
    if (seen.has(path))
      continue;
    seen.add(path);
    extra.push({
      path,
      name: path,
      category: path.startsWith("/api/") ? "api" : path.startsWith("/registry/") ? "registry" : "proof",
      kind: "hot-static",
      okStatuses: [200],
      note: "from health.serve.hotPreloaded"
    });
  }
  return [...catalog, ...extra];
}

// lib/console-depth.ts
function shouldColor() {
  if (Bun.env.FORCE_COLOR && Bun.env.FORCE_COLOR !== "0")
    return true;
  if (Bun.env.NO_COLOR)
    return false;
  return process.stdout.isTTY === true;
}
var inspectCustom = Bun.inspect.custom;
function widthOf(text, options = {}) {
  return Bun.stringWidth(text, options);
}
function padEndWidth(text, width, fill = " ") {
  const missing = width - Bun.stringWidth(text);
  return missing > 0 ? text + fill.repeat(missing) : text;
}

// lib/docs/bun-site-url.ts
var BunComSite = {
  protocol: "https",
  hostname: "bun.com"
};
var MdnSite = {
  protocol: "https",
  hostname: "developer.mozilla.org"
};
var BunDocsPattern = new URLPattern({
  protocol: BunComSite.protocol,
  hostname: "(bun\\.com|bun\\.sh)",
  pathname: "/docs/:path*"
});
var BunBlogIndexPattern = new URLPattern({
  protocol: BunComSite.protocol,
  hostname: "(bun\\.com|bun\\.sh)",
  pathname: "/blog"
});
var BunBlogPattern = new URLPattern({
  protocol: BunComSite.protocol,
  hostname: "(bun\\.com|bun\\.sh)",
  pathname: "/blog/:slug"
});
var BunReferencePattern = new URLPattern({
  protocol: BunComSite.protocol,
  hostname: "(bun\\.com|bun\\.sh)",
  pathname: "/reference/:path*"
});
var CANONICAL_SOURCES = {
  blog: { ...BunComSite, pathname: "/blog" },
  docs: { ...BunComSite, pathname: "/docs" },
  reference: { ...BunComSite, pathname: "/reference" },
  llms: { ...BunComSite, pathname: "/docs/llms.txt" }
};
var MdnWebApiPattern = new URLPattern({
  protocol: MdnSite.protocol,
  hostname: MdnSite.hostname,
  pathname: "/en-US/docs/Web/API/:name(.*)"
});
function hrefFromInit(init) {
  const u = new URL("http://localhost");
  const protocol = (init.protocol ?? "https").replace(/:$/, "");
  u.protocol = `${protocol}:`;
  if (init.hostname != null && init.hostname !== "*")
    u.hostname = init.hostname;
  if (init.port != null && init.port !== "*" && init.port !== "")
    u.port = init.port;
  if (init.username != null && init.username !== "*")
    u.username = init.username;
  if (init.password != null && init.password !== "*")
    u.password = init.password;
  let pathname = init.pathname ?? "/";
  if (pathname !== "*" && !pathname.startsWith("/"))
    pathname = `/${pathname}`;
  if (pathname !== "*")
    u.pathname = pathname;
  if (init.search != null && init.search !== "*") {
    u.search = init.search.startsWith("?") ? init.search.slice(1) : init.search;
  }
  if (init.hash != null && init.hash !== "*") {
    u.hash = init.hash.startsWith("#") ? init.hash.slice(1) : init.hash;
  }
  return u.href;
}
function normalizePath2(path) {
  return path.replace(/^\/+/, "").replace(/\.md$/i, "");
}
function stripHash(hash) {
  if (hash == null || hash === "")
    return;
  return hash.replace(/^#/, "");
}
function splitHash(path, hash) {
  if (hash != null)
    return { path, hash: stripHash(hash) };
  const i = path.indexOf("#");
  if (i < 0)
    return { path };
  return { path: path.slice(0, i), hash: path.slice(i + 1) };
}
function bunDocs(path, hash) {
  const parts = splitHash(path, hash);
  return hrefFromInit({
    ...BunComSite,
    pathname: `/docs/${normalizePath2(parts.path)}`,
    hash: parts.hash
  });
}

// lib/deep-equals.ts
var BUN_DEEP_EQUALS_DOCS = bunDocs("runtime/utils", "bun-deepequals");
function deepEquals(a, b, strict = true) {
  return Bun.deepEquals(a, b, strict);
}

// lib/http/networking-report.ts
var BUN_STRING_WIDTH_DOCS = "https://bun.com/docs/runtime/utils#bun-stringwidth";
var ROUTE_PROBE_TABLE_PROPERTIES = [
  "path",
  "kind",
  "status",
  "ms",
  "crit",
  "pass"
];
var ROUTE_STATS_TABLE_PROPERTIES = ["field", "value"];
var HOT_PRELOADED_TABLE_PROPERTIES = ["i", "path"];
var STRATEGIES_TABLE_PROPERTIES = ["strategy", "rule"];
function projectTableRows(rows, properties) {
  return rows.map((row) => {
    const out = {};
    for (const p of properties)
      out[p] = row[p];
    return out;
  });
}
function tableColumnWidths(rows, properties) {
  const widths = {};
  for (const prop of properties) {
    let max = widthOf(String(prop));
    for (const row of rows) {
      const cell = row[prop];
      max = Math.max(max, widthOf(cell == null ? "" : String(cell)));
    }
    widths[prop] = max;
  }
  return widths;
}
function proveInspectTable(rows, properties) {
  const projected = projectTableRows(rows, properties);
  const render = () => Bun.inspect.table(projected, [...properties], { colors: false });
  const r1 = render();
  const r2 = render();
  return {
    properties,
    rowCount: rows.length,
    columnWidths: tableColumnWidths(projected, properties),
    renderIdempotent: deepEquals(r1, r2),
    rowsStable: deepEquals(projectTableRows(rows, properties), projectTableRows(rows, properties))
  };
}
function inspectTable(rows, properties, opts = {}) {
  if (!rows.length)
    return "(empty)";
  const colors = opts.colors ?? shouldColor();
  if (!properties?.length) {
    return Bun.inspect.table(rows, { colors });
  }
  const projected = projectTableRows(rows, properties);
  const stable = Bun.inspect.table(projected, [...properties], { colors: false });
  if (!deepEquals(stable, Bun.inspect.table(projected, [...properties], { colors: false }))) {
    throw new Error("inspectTable: Bun.inspect.table render not idempotent (deepEquals)");
  }
  return Bun.inspect.table(projected, [...properties], { colors });
}
function routeStatsRows(health) {
  const rs = health?.routeStats;
  if (!rs)
    return [{ field: "(no /health)", value: "serve-public down?" }];
  return [
    { field: "staticRoutes", value: rs.staticRoutes ?? "\u2014" },
    { field: "fileRoutes", value: rs.fileRoutes ?? "\u2014" },
    { field: "staticHits", value: rs.staticHits ?? "\u2014" },
    { field: "fileHits", value: rs.fileHits ?? "\u2014" },
    { field: "notModified304", value: rs.notModified304 ?? "\u2014" },
    {
      field: "totalMemoryUsed",
      value: rs.totalMemoryUsed != null ? `${Math.round(rs.totalMemoryUsed / 1024)} KiB` : "\u2014"
    },
    { field: "decision.rule", value: rs.decision?.rule ?? "\u2014" }
  ];
}
function routeProbeTableRow(r) {
  return {
    path: r.path,
    name: r.name,
    category: r.category,
    kind: r.kind,
    status: r.status,
    ms: r.ms,
    crit: r.critical ? "Y" : "",
    pass: r.pass ? "PASS" : "FAIL"
  };
}
function probeRows(rows) {
  return rows.map(routeProbeTableRow);
}

class RouteProbeReport {
  base;
  health;
  rows;
  summary;
  constructor(probe) {
    this.base = probe.base;
    this.health = probe.health;
    this.rows = probe.rows;
    this.summary = probe.summary;
  }
  slices() {
    const serve = this.health?.serve;
    const routeStats = routeStatsRows(this.health);
    const hotPreloaded = (serve?.hotPreloaded ?? []).map((p, i) => ({ i, path: p }));
    const strategies = Object.entries(serve?.strategies ?? {}).map(([k, v]) => ({
      strategy: k,
      rule: v
    }));
    const routes = probeRows(this.rows);
    const byCategory = {};
    for (const r of this.rows) {
      const row = routeProbeTableRow(r);
      (byCategory[r.category] ??= []).push(projectTableRows([row], ROUTE_PROBE_TABLE_PROPERTIES)[0]);
    }
    return { routeStats, hotPreloaded, strategies, routes, byCategory };
  }
  tableProof() {
    const s = this.slices();
    const byCategory = {};
    for (const [c, slice] of Object.entries(s.byCategory)) {
      byCategory[c] = proveInspectTable(slice, ROUTE_PROBE_TABLE_PROPERTIES);
    }
    return {
      routes: proveInspectTable(s.routes, ROUTE_PROBE_TABLE_PROPERTIES),
      routeStats: proveInspectTable(s.routeStats, ROUTE_STATS_TABLE_PROPERTIES),
      ...s.hotPreloaded.length ? { hotPreloaded: proveInspectTable(s.hotPreloaded, HOT_PRELOADED_TABLE_PROPERTIES) } : {},
      ...s.strategies.length ? { strategies: proveInspectTable(s.strategies, STRATEGIES_TABLE_PROPERTIES) } : {},
      byCategory
    };
  }
  render(opts = {}) {
    const colors = opts.colors ?? shouldColor();
    const s = this.slices();
    const byCategory = {};
    for (const [c, slice] of Object.entries(s.byCategory)) {
      byCategory[c] = inspectTable(slice, ROUTE_PROBE_TABLE_PROPERTIES, { colors });
    }
    return {
      routeStats: inspectTable(s.routeStats, ROUTE_STATS_TABLE_PROPERTIES, { colors }),
      hotPreloaded: s.hotPreloaded.length ? inspectTable(s.hotPreloaded, HOT_PRELOADED_TABLE_PROPERTIES, { colors }) : "(none)",
      strategies: s.strategies.length ? inspectTable(s.strategies, STRATEGIES_TABLE_PROPERTIES, { colors }) : "(none)",
      routes: inspectTable(s.routes, ROUTE_PROBE_TABLE_PROPERTIES, { colors }),
      byCategory
    };
  }
  toJSON() {
    const s = this.slices();
    const proof = this.tableProof();
    if (!proof.routes.renderIdempotent || !proof.routes.rowsStable) {
      throw new Error("RouteProbeReport: routes table proof failed (deepEquals)");
    }
    return {
      base: this.base,
      summary: this.summary,
      health: this.health,
      ...s,
      rendered: this.render({ colors: false }),
      tableProof: proof
    };
  }
  [inspectCustom](_depth, options) {
    const colors = options?.colors ?? shouldColor();
    const r = this.render({ colors });
    const serve = this.health?.serve;
    const parts = [
      `RouteProbeReport \xB7 ${this.base} \xB7 ${this.summary.passed}/${this.summary.total} pass \xB7 critFail=${this.summary.criticalFailed}`,
      "",
      "\u2500\u2500 ROUTE OBJECTS (/health.routeStats) \u2500\u2500",
      r.routeStats
    ];
    if (this.health?.serve?.hotPreloaded?.length) {
      parts.push("", "\u2500\u2500 HOT PRELOADED (serve.hotPreloaded) \u2500\u2500", r.hotPreloaded);
    }
    if (serve?.etagScope) {
      parts.push(`ETag scope: ${serve.etagScope}`);
    }
    if (Object.keys(serve?.strategies ?? {}).length) {
      parts.push("", "\u2500\u2500 STRATEGIES \u2500\u2500", r.strategies);
    }
    parts.push("", "\u2500\u2500 PUBLIC ROUTE CATALOG (all paths) \u2500\u2500", r.routes);
    parts.push("", "\u2500\u2500 BY CATEGORY \u2500\u2500");
    for (const [c, table] of Object.entries(r.byCategory)) {
      parts.push("", `  \xB7 ${c}`, table);
    }
    return parts.join(`
`);
  }
}
var NET_OPTIMIZATION_TYPES = [
  "dns-prefetch",
  "dns-cache",
  "preconnect",
  "cold-fetch",
  "warm-fetch",
  "response-text",
  "response-json",
  "response-formdata",
  "response-bytes",
  "response-arraybuffer",
  "response-blob",
  "disk-write"
];
var NET_OPTIMIZATION_LABELS = {
  "dns-prefetch": "DNS Prefetch",
  "dns-cache": "DNS Cache",
  preconnect: "Preconnect",
  "cold-fetch": "Cold Fetch",
  "warm-fetch": "Warm Fetch",
  "response-text": "response.text()",
  "response-json": "response.json()",
  "response-formdata": "response.formData()",
  "response-bytes": "response.bytes()",
  "response-arraybuffer": "response.arrayBuffer()",
  "response-blob": "response.blob()",
  "disk-write": "Disk Write"
};
function netCheckRow(partial) {
  return {
    ...partial,
    optimization: partial.optimization ?? NET_OPTIMIZATION_LABELS[partial.type]
  };
}
function countStatus(rows) {
  let passed = 0;
  let failed = 0;
  let info = 0;
  let skipped = 0;
  for (const r of rows) {
    if (r.status === "PASS")
      passed++;
    else if (r.status === "FAIL")
      failed++;
    else if (r.status === "INFO")
      info++;
    else if (r.status === "SKIP")
      skipped++;
  }
  return { total: rows.length, passed, failed, info, skipped };
}
function tableRowsFromChecks(rows) {
  return rows.map((r) => ({
    target: r.target,
    category: r.category,
    type: r.type,
    optimization: r.optimization,
    metric: r.metric,
    status: r.status
  }));
}

class NetworkingChecksReport {
  rows;
  meta;
  constructor(rows, meta = {}) {
    this.rows = rows;
    this.meta = {
      base: meta.base ?? "",
      bun: meta.bun ?? Bun.version,
      revision: meta.revision ?? (Bun.revision || "unknown")
    };
  }
  byType() {
    const out = {};
    for (const t of NET_OPTIMIZATION_TYPES)
      out[t] = [];
    for (const r of this.rows) {
      (out[r.type] ??= []).push(r);
    }
    return out;
  }
  byCategory() {
    const out = {};
    for (const r of this.rows) {
      (out[r.category] ??= []).push(r);
    }
    return out;
  }
  summary() {
    const overall = countStatus(this.rows);
    const byTypeMap = this.byType();
    const byType = NET_OPTIMIZATION_TYPES.map((type) => {
      const slice = byTypeMap[type] ?? [];
      const c = countStatus(slice);
      return {
        type,
        label: NET_OPTIMIZATION_LABELS[type],
        total: c.total,
        passed: c.passed,
        failed: c.failed,
        info: c.info,
        skipped: c.skipped
      };
    }).filter((s) => s.total > 0);
    const byCategory = Object.entries(this.byCategory()).map(([category, slice]) => {
      const c = countStatus(slice);
      return {
        category,
        total: c.total,
        passed: c.passed,
        failed: c.failed
      };
    });
    return { ...overall, byType, byCategory };
  }
  slices() {
    const byType = this.byType();
    const byCategory = this.byCategory();
    const summary = this.summary();
    const tablesByType = {};
    for (const [type, slice] of Object.entries(byType)) {
      if (!slice.length)
        continue;
      tablesByType[type] = tableRowsFromChecks(slice);
    }
    const tablesByCategory = {};
    for (const [cat, slice] of Object.entries(byCategory)) {
      tablesByCategory[cat] = tableRowsFromChecks(slice);
    }
    return {
      summary,
      byType,
      byCategory,
      tables: {
        all: tableRowsFromChecks(this.rows),
        byType: tablesByType,
        byCategory: tablesByCategory,
        typeSummary: summary.byType.map((s) => ({
          type: s.type,
          label: s.label,
          total: s.total,
          passed: s.passed,
          failed: s.failed,
          info: s.info,
          skipped: s.skipped
        }))
      }
    };
  }
  render(opts = {}) {
    const colors = opts.colors ?? shouldColor();
    const { tables } = this.slices();
    const cols = ["target", "type", "optimization", "metric", "status"];
    const byType = {};
    for (const [type, slice] of Object.entries(tables.byType)) {
      byType[type] = inspectTable(slice, [...cols], { colors });
    }
    const byCategory = {};
    for (const [cat, slice] of Object.entries(tables.byCategory)) {
      byCategory[cat] = inspectTable(slice, [...cols], { colors });
    }
    return {
      all: tables.all.length ? inspectTable(tables.all, [...cols], { colors }) : "(no multi-target checks)",
      byType,
      byCategory,
      typeSummary: tables.typeSummary.length ? inspectTable(tables.typeSummary, ["type", "label", "total", "passed", "failed", "info", "skipped"], { colors }) : "(none)"
    };
  }
  toJSON() {
    const s = this.slices();
    return {
      meta: this.meta,
      rows: this.rows,
      ...s,
      rendered: this.render({ colors: false })
    };
  }
  [inspectCustom](_depth, options) {
    const colors = options?.colors ?? shouldColor();
    const summary = this.summary();
    const rendered = this.render({ colors });
    const rev = this.meta.revision.slice(0, 8);
    const parts = [
      `NetworkingChecksReport \xB7 ${this.meta.base || "multi-target"} \xB7 Bun ${this.meta.bun}/${rev}`,
      `  ${summary.passed}/${summary.total} pass \xB7 ${summary.failed} fail \xB7 ${summary.info} info \xB7 ${summary.skipped} skip`,
      "",
      "\u2500\u2500 BY TYPE (summary) \u2500\u2500",
      rendered.typeSummary,
      "",
      "\u2500\u2500 ALL CHECKS \u2500\u2500",
      rendered.all,
      "",
      "\u2500\u2500 BY TYPE \u2500\u2500"
    ];
    for (const t of NET_OPTIMIZATION_TYPES) {
      const table = rendered.byType[t];
      if (!table)
        continue;
      const label = NET_OPTIMIZATION_LABELS[t];
      const ts = summary.byType.find((s) => s.type === t);
      parts.push("", `  \xB7 ${t} (${label})${ts ? ` \xB7 ${ts.passed}/${ts.total}` : ""}`, table);
    }
    parts.push("", "\u2500\u2500 BY CATEGORY \u2500\u2500");
    for (const [cat, table] of Object.entries(rendered.byCategory)) {
      const cs = summary.byCategory.find((s) => s.category === cat);
      parts.push("", `  \xB7 ${cat}${cs ? ` \xB7 ${cs.passed}/${cs.total}` : ""}`, table);
    }
    return parts.join(`
`);
  }
}

// tools/verify-networking.ts
var CANONICAL = {
  dnsPrefetching: BUN_DNS_PREFETCHING_DOCS,
  dnsPrefetch: BUN_DNS_PREFETCH_DOCS,
  dnsCacheStats: BUN_DNS_CACHE_STATS_DOCS,
  preconnect: BUN_FETCH_PRECONNECT_DOCS,
  preconnectStartup: BUN_FETCH_PRECONNECT_STARTUP_DOCS,
  keepalive: "https://bun.com/docs/runtime/networking/fetch#connection-pooling-http-keep-alive",
  responseBuffering: "https://bun.com/docs/runtime/networking/fetch#response-buffering",
  write: "https://bun.com/docs/runtime/file-io#writing-files-bun-write",
  nanoseconds: "https://bun.com/docs/runtime/utils#bun-nanoseconds",
  inspectTable: "https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options",
  stringWidth: BUN_STRING_WIDTH_DOCS,
  deepEquals: BUN_DEEP_EQUALS_DOCS,
  env: "https://bun.com/docs/runtime/utils#bun-env",
  server: "https://bun.com/docs/runtime/http/server#reference",
  serverReload: "https://bun.com/docs/runtime/http/server#server-reload",
  serverStop: "https://bun.com/docs/runtime/http/server#server-stop",
  websockets: "https://bun.com/docs/runtime/http/websockets#start-a-websocket-server",
  tls: "https://bun.com/docs/runtime/http/tls"
};
var args = process.argv.slice(2);
var has = (n) => args.includes(`--${n}`);
var flag = (n) => {
  const hit = args.find((a) => a.startsWith(`--${n}=`));
  return hit?.slice(n.length + 3);
};
var LOCAL_BASE = flag("base") || Bun.env.HEALTH_URL || Bun.env.BASE_URL || "http://127.0.0.1:3000";
var LOCAL_ONLY = has("local-only");
var ROUTES = has("routes") || has("routes-only") || has("local-only");
var ROUTES_ONLY = has("routes-only");
var SKIP_WRITE = has("skip-write");
var AS_JSON = has("json");
var TIMEOUT_MS = Number(flag("timeout-ms") ?? 1e4);
var BOX_INNER = 62;
function boxLine(text) {
  return `\u2551  ${padEndWidth(text, BOX_INNER)}\u2551`;
}
function buildTargets() {
  const local = LOCAL_BASE.replace(/\/$/, "");
  const out = [
    {
      name: "Health",
      url: `${local}/health`,
      category: "ops",
      method: "GET",
      okStatuses: [200]
    },
    {
      name: "Prediction report",
      url: `${local}/registry/prediction/report.html`,
      category: "registry",
      method: "GET",
      okStatuses: [200]
    }
  ];
  if (LOCAL_ONLY)
    return out;
  out.push({
    name: "CF Dashboard",
    url: "https://dash.cloudflare.com",
    category: "dashboard",
    method: "HEAD",
    okStatuses: [200, 301, 302, 303, 307, 308, 401, 403],
    skipBuffer: true
  }, {
    name: "Registry (Pages)",
    url: "https://registry.factory-wager.com/",
    category: "pages",
    method: "HEAD",
    okStatuses: [200, 301, 302, 303, 307, 308],
    skipBuffer: true
  }, {
    name: "Kalshi exchange",
    url: "https://api.elections.kalshi.com/trade-api/v2/exchange/status",
    category: "trading",
    method: "GET",
    okStatuses: [200]
  }, {
    name: "Bun docs",
    url: "https://bun.com/docs",
    category: "control",
    method: "HEAD",
    okStatuses: [200, 301, 302],
    skipBuffer: true
  });
  const tg = Bun.env.TELEGRAM_BOT_TOKEN?.trim();
  if (tg) {
    out.push({
      name: "Telegram getMe",
      url: `https://api.telegram.org/bot${tg}/getMe`,
      category: "messaging",
      method: "GET",
      okStatuses: [200],
      skipBuffer: true
    });
  }
  const r2 = Bun.env.R2_PUBLIC_BASE?.trim() || Bun.env.R2_PUBLIC_URL?.trim();
  if (r2) {
    out.push({
      name: "R2 public",
      url: r2,
      category: "storage",
      method: "HEAD",
      okStatuses: [200, 301, 302, 403, 404],
      skipBuffer: true
    });
  }
  return out;
}
function row(target, category, type, metric, status, detail) {
  return netCheckRow({ target, category, type, metric, status, detail });
}
function ms(ns0) {
  return (Bun.nanoseconds() - ns0) / 1e6;
}
function statusOk(status, ok) {
  if (ok?.length)
    return ok.includes(status);
  return status >= 200 && status < 400;
}
async function fetchTimed(url, init) {
  const t0 = Bun.nanoseconds();
  try {
    const res = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      keepalive: true
    });
    return { res, elapsedMs: ms(t0) };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : String(err),
      elapsedMs: ms(t0)
    };
  }
}
async function verifyTarget(target, opts = {}) {
  const rows = [];
  const u = new URL(target.url);
  const cat = target.category;
  const name = target.name;
  const tPrefetch = Bun.nanoseconds();
  const dns2 = dnsPrefetchOrigin(target.url);
  rows.push(row(name, cat, "dns-prefetch", `${ms(tPrefetch).toFixed(3)}ms`, dns2.ok ? "PASS" : "FAIL", dns2.ok ? `dns.prefetch("${dns2.host}"${dns2.port != null ? `, ${dns2.port}` : ""})` : dns2.note));
  const stats = dnsCacheStats();
  rows.push(row(name, cat, "dns-cache", `size=${stats.size} total=${stats.totalCount}`, stats.size > 0 || stats.totalCount > 0 ? "PASS" : "INFO", `hits=${stats.cacheHitsCompleted} miss=${stats.cacheMisses} err=${stats.errors}`));
  const warm = preconnectOrigin(target.url);
  rows.push(row(name, cat, "preconnect", warm.fetchPreconnect ? "tcp" : warm.dnsPrefetch ? "dns-only" : "skip", warm.fetchPreconnect || warm.dnsPrefetch ? "PASS" : "FAIL", warm.fetchPreconnect ? `fetch.preconnect(${warm.origin})` : warm.note ?? `CLI: bun --fetch-preconnect ${preconnectCliUrl(target.url)} ./app.ts`));
  const method = target.method ?? "GET";
  const cold = await fetchTimed(target.url, { method });
  if ("error" in cold) {
    rows.push(row(name, cat, "cold-fetch", `${cold.elapsedMs.toFixed(1)}ms`, "FAIL", cold.error));
    return rows;
  }
  if (method !== "HEAD")
    await cold.res.arrayBuffer().catch(() => {});
  else
    await cold.res.body?.cancel().catch(() => {});
  const coldOk = statusOk(cold.res.status, target.okStatuses);
  rows.push(row(name, cat, "cold-fetch", `${cold.elapsedMs.toFixed(1)}ms (${cold.res.status})`, coldOk ? "PASS" : "FAIL"));
  const warmFetch = await fetchTimed(target.url, { method });
  if ("error" in warmFetch) {
    rows.push(row(name, cat, "warm-fetch", `${warmFetch.elapsedMs.toFixed(1)}ms`, "FAIL", warmFetch.error));
    return rows;
  }
  if (method !== "HEAD")
    await warmFetch.res.arrayBuffer().catch(() => {});
  else
    await warmFetch.res.body?.cancel().catch(() => {});
  const warmOk = statusOk(warmFetch.res.status, target.okStatuses);
  const pooled = warmOk && warmFetch.elapsedMs <= cold.elapsedMs * 0.95 && warmFetch.elapsedMs < cold.elapsedMs;
  rows.push(row(name, cat, "warm-fetch", `${warmFetch.elapsedMs.toFixed(1)}ms (${warmFetch.res.status})`, warmOk ? "PASS" : "FAIL", pooled ? "faster than cold (likely reuse)" : "timing only \u2014 not a pool guarantee"));
  if (target.skipBuffer)
    return rows;
  const tBuf = Bun.nanoseconds();
  const get = await fetchTimed(target.url, { method: "GET" });
  if ("error" in get) {
    rows.push(row(name, cat, "response-bytes", `${get.elapsedMs.toFixed(1)}ms`, "FAIL", get.error));
    return rows;
  }
  try {
    const bytes = await get.res.bytes();
    rows.push(row(name, cat, "response-bytes", `${ms(tBuf).toFixed(1)}ms (${bytes.byteLength} B)`, get.res.ok || statusOk(get.res.status, target.okStatuses) ? "PASS" : "FAIL"));
    if (!opts.skipWrite && bytes.byteLength > 0 && bytes.byteLength < 1e6) {
      const path = joinPath(Bun.env.TMPDIR || Bun.env.TMP || "/tmp", `bun-net-${cat}-${Date.now()}.bin`);
      const tW = Bun.nanoseconds();
      try {
        await Bun.write(path, bytes);
        const exists = await Bun.file(path).exists();
        rows.push(row(name, cat, "disk-write", `${ms(tW).toFixed(1)}ms`, exists ? "PASS" : "FAIL", path));
      } finally {
        try {
          await Bun.$`rm -f ${path}`.quiet();
        } catch {}
      }
    }
  } catch (err) {
    rows.push(row(name, cat, "response-bytes", `${ms(tBuf).toFixed(1)}ms`, "FAIL", err instanceof Error ? err.message : String(err)));
  }
  return rows;
}
async function runNetworkingSuite(opts = {}) {
  const targets = opts.targets ?? buildTargets();
  const rows = [];
  for (const t of targets) {
    rows.push(...await verifyTarget(t, { skipWrite: opts.skipWrite }));
  }
  return { rows, targets };
}
async function fetchHealthRouteObjects(base) {
  try {
    const res = await fetch(new URL("/health", base.endsWith("/") ? base : `${base}/`), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
    if (!res.ok)
      return null;
    return await res.json();
  } catch {
    return null;
  }
}
async function probePublicRoutes(base, opts = {}) {
  const origin = base.replace(/\/$/, "");
  const health = await fetchHealthRouteObjects(origin);
  const catalog = mergeHotFromHealth(opts.catalog ?? publicRouteCatalog(), health);
  const rows = [];
  preconnectOrigin(origin);
  for (const route of catalog) {
    const url = `${origin}${route.path.startsWith("/") ? route.path : `/${route.path}`}`;
    const method = route.method ?? "GET";
    const t0 = Bun.nanoseconds();
    try {
      const res = await fetch(url, {
        method,
        keepalive: true,
        signal: AbortSignal.timeout(TIMEOUT_MS)
      });
      if (method === "GET")
        await res.arrayBuffer().catch(() => {});
      else
        await res.body?.cancel().catch(() => {});
      const elapsed = ms(t0);
      const okList = route.okStatuses ?? [200];
      const pass = okList.includes(res.status);
      rows.push({
        path: route.path,
        name: route.name,
        category: route.category,
        kind: route.kind,
        status: res.status,
        ms: Number(elapsed.toFixed(1)),
        pass,
        critical: Boolean(route.critical),
        note: route.note
      });
    } catch (err) {
      rows.push({
        path: route.path,
        name: route.name,
        category: route.category,
        kind: route.kind,
        status: "ERR",
        ms: Number(ms(t0).toFixed(1)),
        pass: false,
        critical: Boolean(route.critical),
        note: err instanceof Error ? err.message : String(err)
      });
    }
  }
  const failed = rows.filter((r) => !r.pass);
  return {
    base: origin,
    health,
    catalog,
    rows,
    summary: {
      total: rows.length,
      passed: rows.filter((r) => r.pass).length,
      failed: failed.length,
      criticalFailed: failed.filter((r) => r.critical).length
    }
  };
}
async function main() {
  const t0 = Bun.nanoseconds();
  let rows = [];
  let targets = [];
  if (!ROUTES_ONLY) {
    const suite = await runNetworkingSuite({ skipWrite: SKIP_WRITE });
    rows = suite.rows;
    targets = suite.targets;
  }
  let routeProbe = null;
  let routeReport = null;
  if (ROUTES || ROUTES_ONLY) {
    routeProbe = await probePublicRoutes(LOCAL_BASE);
    routeReport = new RouteProbeReport(routeProbe);
  }
  const netReport = rows.length > 0 ? new NetworkingChecksReport(rows, {
    base: LOCAL_BASE,
    bun: Bun.version,
    revision: Bun.revision || "unknown"
  }) : null;
  const elapsed = ms(t0);
  const hard = rows.filter((r) => r.status === "PASS" || r.status === "FAIL");
  const passed = hard.filter((r) => r.status === "PASS").length;
  const failed = hard.filter((r) => r.status === "FAIL").length;
  const routeFailed = routeProbe?.summary.failed ?? 0;
  const routeCritFailed = routeProbe?.summary.criticalFailed ?? 0;
  const finalDns = dnsCacheStats();
  if (AS_JSON) {
    const routeJson = routeReport?.toJSON() ?? null;
    console.log(JSON.stringify({
      bun: Bun.version,
      revision: Bun.revision,
      base: LOCAL_BASE,
      elapsedMs: elapsed,
      summary: {
        passed,
        failed,
        total: hard.length,
        targets: targets.length,
        routes: routeProbe?.summary ?? null
      },
      dns: finalDns,
      maxHttpRequests: Bun.env.BUN_CONFIG_MAX_HTTP_REQUESTS ?? "256 (default)",
      networking: netReport?.toJSON() ?? null,
      routeProbe,
      tables: routeJson ? {
        routeStats: routeJson.routeStats,
        hotPreloaded: routeJson.hotPreloaded,
        strategies: routeJson.strategies,
        routes: routeJson.routes,
        byCategory: routeJson.byCategory,
        rendered: routeJson.rendered,
        tableProof: routeJson.tableProof
      } : null,
      routeReport: routeJson,
      routeCatalog: publicRouteCatalog(),
      canonical: CANONICAL
    }, null, 2));
  } else {
    console.log("\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557");
    console.log("\u2551  Bun Networking Optimization \u2014 Multi-Target + Routes                 \u2551");
    console.log(boxLine(`Bun:  ${Bun.version} / ${(Bun.revision || "unknown").slice(0, 8)}`));
    console.log(boxLine(`Base: ${LOCAL_BASE.slice(0, BOX_INNER - 6)}`));
    console.log(boxLine(`Targets: ${targets.length}`));
    console.log(boxLine(`Routes:  ${routeProbe?.catalog.length ?? 0}`));
    console.log("\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D");
    if (netReport) {
      console.log("");
      console.log(netReport);
      console.log(`
${passed}/${hard.length} network checks passed \xB7 ${failed} failed \xB7 ${elapsed.toFixed(1)}ms`);
    }
    if (routeReport) {
      console.log("");
      console.log(routeReport);
    }
    console.log(`
DNS cache: size=${finalDns.size} total=${finalDns.totalCount} hits=${finalDns.cacheHitsCompleted} miss=${finalDns.cacheMisses} err=${finalDns.errors}`);
    console.log(`HTTP request limit: ${Bun.env.BUN_CONFIG_MAX_HTTP_REQUESTS ?? "256 (default)"} \xB7 BUN_CONFIG_MAX_HTTP_REQUESTS`);
    if (!ROUTES_ONLY && !Bun.env.TELEGRAM_BOT_TOKEN) {
      console.log("(Telegram skipped \u2014 set TELEGRAM_BOT_TOKEN to include messaging)");
    }
    if (!ROUTES_ONLY && !Bun.env.R2_PUBLIC_BASE && !Bun.env.R2_PUBLIC_URL) {
      console.log("(R2 skipped \u2014 set R2_PUBLIC_BASE to a public object/URL)");
    }
    console.log(`
Canonical API references (bun.com):`);
    for (const [k, url] of Object.entries(CANONICAL)) {
      console.log(`  \u2022 ${k.padEnd(18)} ${url}`);
    }
    console.log(`
Tip: console.log(report) uses Bun.inspect.custom \u2192 inspect.table(properties) + stringWidth + deepEquals.`);
    console.log("     JSON: --json  \u2192  .tables.rendered.routes  (or omit --json for live tables)");
  }
  if (failed > 0 || routeCritFailed > 0)
    process.exit(1);
  if (routeFailed > 0 && has("strict-routes"))
    process.exit(1);
}
if (import.meta.main) {
  main().catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
  });
}
async function runNetworkingVerification(opts) {
  const { rows } = await runNetworkingSuite({ skipWrite: !opts.saveProof });
  const checksPassed = rows.filter((r) => r.status === "PASS").length;
  const checksTotal = rows.length;
  const proofObj = { global: { checksPassed, checksTotal } };
  const h = new Bun.CryptoHasher("sha256");
  h.update(JSON.stringify(proofObj));
  return { ok: checksPassed === checksTotal, proofHash: h.digest("hex"), proofObj };
}
export {
  verifyTarget,
  runNetworkingVerification,
  runNetworkingSuite,
  probePublicRoutes,
  fetchHealthRouteObjects
};
