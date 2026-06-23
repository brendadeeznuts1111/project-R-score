import { readFile, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

export const ENDPOINT_DOCS = "https://swagger.io/specification/";

export type EndpointEntry = {
  path: string;
  method: string;
  summary?: string;
  tags: string[];
  kind: "health" | "metrics" | "proxy" | "api";
};

export type EndpointCatalog = {
  source: string;
  title?: string;
  version?: string;
  total: number;
  health_count: number;
  by_tag: Record<string, number>;
  by_kind: Record<string, number>;
  health_routes: EndpointEntry[];
  entries: EndpointEntry[];
};

export type HealthProbe = {
  url: string;
  ok: boolean;
  status: number;
  latency_ms: number;
  body?: Record<string, unknown>;
  error?: string;
};

export type HealthReport = {
  probed: boolean;
  base_url: string;
  overall: "healthy" | "degraded" | "unreachable";
  probes: HealthProbe[];
};

const HEALTH_PATH_RE = /^\/api\/health|^\/health/i;

export function classifyEndpoint(path: string, tags: string[]): EndpointEntry["kind"] {
  const p = path.toLowerCase();
  if (HEALTH_PATH_RE.test(p) || tags.some((t) => t.toLowerCase() === "system" && p.includes("health"))) {
    return "health";
  }
  if (p.includes("/metrics") || tags.some((t) => t.toLowerCase() === "metrics")) {
    return "metrics";
  }
  if (p.includes("/proxy") || tags.some((t) => t.toLowerCase() === "auth")) {
    return "proxy";
  }
  return "api";
}

export function parseOpenApiDoc(doc: Record<string, unknown>, source: string): EndpointCatalog {
  const info = (doc.info ?? {}) as Record<string, unknown>;
  const paths = (doc.paths ?? {}) as Record<string, Record<string, unknown>>;
  const entries: EndpointEntry[] = [];

  for (const [path, methods] of Object.entries(paths)) {
    for (const [method, spec] of Object.entries(methods)) {
      if (!["get", "post", "put", "patch", "delete", "head", "options"].includes(method)) continue;
      const row = spec as Record<string, unknown>;
      const tags = Array.isArray(row.tags) ? row.tags.map(String) : ["untagged"];
      const kind = classifyEndpoint(path.startsWith("/api") ? path : `/api${path}`, tags);
      entries.push({
        path: path.startsWith("/api") ? path : `/api${path}`,
        method: method.toUpperCase(),
        summary: typeof row.summary === "string" ? row.summary : undefined,
        tags,
        kind,
      });
    }
  }

  entries.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));

  const by_tag: Record<string, number> = {};
  const by_kind: Record<string, number> = {};
  for (const e of entries) {
    for (const t of e.tags) by_tag[t] = (by_tag[t] ?? 0) + 1;
    by_kind[e.kind] = (by_kind[e.kind] ?? 0) + 1;
  }

  const health_routes = entries.filter((e) => e.kind === "health");

  return {
    source,
    title: typeof info.title === "string" ? info.title : undefined,
    version: typeof info.version === "string" ? info.version : undefined,
    total: entries.length,
    health_count: health_routes.length,
    by_tag,
    by_kind,
    health_routes,
    entries,
  };
}

export async function loadOpenApiCatalog(openapiPath: string): Promise<EndpointCatalog> {
  const abs = resolve(openapiPath);
  const raw = JSON.parse(await readFile(abs, "utf8")) as Record<string, unknown>;
  return parseOpenApiDoc(raw, abs);
}

/** Walk up from scan path looking for openapi.json */
export async function discoverOpenApi(scanPath: string, repo: string): Promise<string | null> {
  const candidates = [
    join(resolve(repo, scanPath), "openapi.json"),
    join(resolve(repo, scanPath), "..", "openapi.json"),
    join(resolve(repo, scanPath), "../..", "openapi.json"),
    join(resolve(repo, scanPath), "../../..", "openapi.json"),
  ];
  for (const c of candidates) {
    try {
      const s = await stat(c);
      if (s.isFile()) return c;
    } catch {
      // continue
    }
  }
  return null;
}

export const DEFAULT_HEALTH_PATHS = [
  "/api/health",
  "/api/health/ready",
  "/api/health/live",
  "/api/health/detailed",
] as const;

export async function probeHealth(
  baseUrl: string,
  paths: readonly string[] = DEFAULT_HEALTH_PATHS,
  timeoutMs = 5000,
): Promise<HealthReport> {
  const base = baseUrl.replace(/\/$/, "");
  const probes: HealthProbe[] = [];
  let anyOk = false;
  let anyReachable = false;

  for (const path of paths) {
    const url = `${base}${path}`;
    const started = performance.now();
    try {
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), timeoutMs);
      const res = await fetch(url, { signal: ac.signal, headers: { accept: "application/json" } });
      clearTimeout(timer);
      const latency_ms = Math.round(performance.now() - started);
      let body: Record<string, unknown> | undefined;
      try {
        body = await res.json() as Record<string, unknown>;
      } catch {
        body = undefined;
      }
      const ok = res.ok;
      if (res.status < 500) anyReachable = true;
      if (ok) anyOk = true;
      probes.push({ url, ok, status: res.status, latency_ms, body });
    } catch (e) {
      probes.push({
        url,
        ok: false,
        status: 0,
        latency_ms: Math.round(performance.now() - started),
        error: String(e),
      });
    }
  }

  const overall: HealthReport["overall"] = !anyReachable
    ? "unreachable"
    : anyOk
      ? "healthy"
      : "degraded";

  return { probed: true, base_url: base, overall, probes };
}

export function buildEndpointMarkdown(catalog: EndpointCatalog, health?: HealthReport): string {
  const lines: string[] = [
    "# API Endpoint Catalog",
    "",
    `- **source:** ${catalog.source}`,
  ];
  if (catalog.title) lines.push(`- **title:** ${catalog.title}`);
  if (catalog.version) lines.push(`- **version:** ${catalog.version}`);
  lines.push(
    `- **endpoints:** ${catalog.total}`,
    `- **health routes:** ${catalog.health_count}`,
  );

  if (health?.probed) {
    lines.push(
      "",
      "## Live health",
      "",
      `- **base:** ${health.base_url}`,
      `- **overall:** ${health.overall}`,
      "",
      "| Probe | Status | Latency | Result |",
      "| --- | ---: | ---: | --- |",
    );
    for (const p of health.probes) {
      const result = p.error
        ? p.error
        : (p.body?.status as string | undefined) ?? (p.ok ? "ok" : "fail");
      lines.push(`| \`${p.url.replace(health.base_url, "")}\` | ${p.status || "—"} | ${p.latency_ms}ms | ${result} |`);
    }
  }

  if (catalog.health_routes.length) {
    lines.push("", "## Health endpoints (catalog)", "", "| Method | Path | Summary |", "| --- | --- | --- |");
    for (const r of catalog.health_routes) {
      lines.push(`| ${r.method} | \`${r.path}\` | ${r.summary ?? ""} |`);
    }
  }

  const tags = Object.entries(catalog.by_tag).sort(([, a], [, b]) => b - a).slice(0, 12);
  if (tags.length) {
    lines.push("", "## By tag", "", "| Tag | Count |", "| --- | ---: |");
    for (const [tag, count] of tags) lines.push(`| ${tag} | ${count} |`);
  }

  const kinds = Object.entries(catalog.by_kind).sort(([, a], [, b]) => b - a);
  if (kinds.length) {
    lines.push("", "## By kind", "", "| Kind | Count |", "| --- | ---: |");
    for (const [kind, count] of kinds) lines.push(`| \`${kind}\` | ${count} |`);
  }

  return `${lines.join("\n")}\n`;
}

export function mergeEndpointSections(
  networkMd: string,
  catalog?: EndpointCatalog,
  health?: HealthReport,
): string {
  if (!catalog) return networkMd;
  const endpointMd = buildEndpointMarkdown(catalog, health);
  return `${networkMd.trimEnd()}\n\n${endpointMd}`;
}