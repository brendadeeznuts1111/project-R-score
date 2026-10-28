import {
  fetchWithPolicy,
  isNormalizedLoopbackHostname,
  type OutboundEndpointPolicy,
  type OutboundExecutionOptions,
  type OutboundFetch,
  type OutboundNetworkMode,
  type OutboundReplayClass,
} from "../../../../../../../lib/http/outbound-policy.ts";

export type DashboardOutboundRoute =
  | "admin-webhook"
  | "benchmark-public"
  | "bun-news"
  | "configured-head"
  | "link-check"
  | "loopback-health"
  | "play-integrity"
  | "route-benchmark"
  | "textract"
  | "urlpattern-analysis";

export interface DashboardOutboundOptions extends OutboundExecutionOptions {
  readonly fetcher?: OutboundFetch;
  readonly networkMode?: OutboundNetworkMode;
  readonly argv?: readonly string[];
}

export interface DashboardPreconnectOptions extends DashboardOutboundOptions {
  readonly preconnecter?: (url: string) => void | Promise<void>;
}

const FIXED_ORIGINS: Readonly<Record<DashboardOutboundRoute, ReadonlySet<string>>> = {
  "admin-webhook": new Set(),
  "benchmark-public": new Set([
    "https://api.github.com",
    "https://bun.sh",
    "https://registry.npmjs.org",
  ]),
  "bun-news": new Set(["https://bun.com"]),
  "configured-head": new Set(),
  "link-check": new Set(),
  "loopback-health": new Set(),
  "play-integrity": new Set(["https://playintegrity.googleapis.com"]),
  "route-benchmark": new Set(),
  "textract": new Set(),
  "urlpattern-analysis": new Set(["https://httpbin.org"]),
};

const CONFIGURED_PUBLIC_ROUTES = new Set<DashboardOutboundRoute>([
  "admin-webhook",
  "configured-head",
  "link-check",
]);
const LOOPBACK_ROUTES = new Set<DashboardOutboundRoute>([
  "loopback-health",
  "route-benchmark",
]);
const CREDENTIAL_ROUTES = new Set<DashboardOutboundRoute>([
  "play-integrity",
  "textract",
]);
const WRITE_ROUTES = new Set<DashboardOutboundRoute>([
  "admin-webhook",
  "play-integrity",
  "textract",
]);
const NETWORK_MODES = new Set<OutboundNetworkMode>([
  "online",
  "cached-only",
  "offline-no-socket",
]);
const DENIED_RUNTIME_CONTROLS = new Set([
  "--connect",
  "--experimental-http2-fetch",
  "--experimental-http3-fetch",
  "--registry",
  "-O",
  "-R",
]);

function parseNetworkMode(environment: Readonly<Record<string, string | undefined>>): OutboundNetworkMode {
  const value = environment.ENTERPRISE_DASHBOARD_NETWORK_MODE?.trim();
  if (!value) return "online";
  if (NETWORK_MODES.has(value as OutboundNetworkMode)) return value as OutboundNetworkMode;
  throw new TypeError(
    "ENTERPRISE_DASHBOARD_NETWORK_MODE must be online, cached-only, or offline-no-socket",
  );
}

function assertRuntimeControls(
  environment: Readonly<Record<string, string | undefined>>,
  argv: readonly string[],
): void {
  for (const key of ["BUN_CONFIG_REGISTRY", "NPM_CONFIG_REGISTRY", "npm_config_registry"] as const) {
    if (environment[key]?.trim()) {
      throw new Error(`Enterprise dashboard outbound registry override ${key} is denied`);
    }
  }
  if (environment.BUN_OPTIONS?.trim()) {
    throw new Error("Enterprise dashboard outbound BUN_OPTIONS overrides are denied");
  }
  for (const token of argv) {
    const spelling = token.split("=", 1)[0] ?? token;
    if (DENIED_RUNTIME_CONTROLS.has(spelling)) {
      throw new Error(`Enterprise dashboard outbound runtime override ${spelling} is denied`);
    }
  }
}

function parseUrl(input: string | URL): URL {
  let url: URL;
  try {
    url = new URL(input.toString());
  } catch {
    throw new TypeError("Enterprise dashboard outbound URL must be absolute");
  }
  if (url.username || url.password || url.hash) {
    throw new TypeError("Enterprise dashboard outbound URL credentials and fragments are denied");
  }
  return url;
}

function isLoopback(url: URL): boolean {
  return (
    (url.protocol === "http:" || url.protocol === "https:") &&
    isNormalizedLoopbackHostname(url.hostname.replace(/^\[|\]$/g, ""))
  );
}

function assertRouteAuthority(route: DashboardOutboundRoute, url: URL): "public" | "loopback" {
  if (LOOPBACK_ROUTES.has(route)) {
    if (!isLoopback(url)) throw new Error(`Enterprise dashboard ${route} authority must be loopback`);
    return "loopback";
  }
  if (url.protocol !== "https:" || isLoopback(url)) {
    throw new Error(`Enterprise dashboard ${route} authority must use public HTTPS`);
  }
  if (route === "textract" && !/^textract\.[a-z0-9-]+\.amazonaws\.com$/.test(url.hostname)) {
    throw new Error("Enterprise dashboard textract authority is not allowlisted");
  }
  const fixed = FIXED_ORIGINS[route];
  if (!CONFIGURED_PUBLIC_ROUTES.has(route) && route !== "textract" && !fixed.has(url.origin)) {
    throw new Error(`Enterprise dashboard ${route} authority is not allowlisted`);
  }
  return "public";
}

function allowedMethods(route: DashboardOutboundRoute): readonly string[] {
  if (WRITE_ROUTES.has(route)) return ["POST"];
  if (route === "route-benchmark") return ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"];
  return ["GET", "HEAD"];
}

export function fetchEnterpriseDashboardOutbound(
  route: DashboardOutboundRoute,
  input: string | URL,
  init: BunFetchRequestInit = {},
  options: DashboardOutboundOptions = {},
): Promise<Response> {
  const url = parseUrl(input);
  const authority = assertRouteAuthority(route, url);
  const environment = options.environment ?? process.env;
  assertRuntimeControls(environment, options.argv ?? Bun.argv.slice(2));
  const networkMode = options.networkMode ?? parseNetworkMode(environment);
  const method = (init.method ?? "GET").toUpperCase();
  const replayClass: OutboundReplayClass =
    method === "GET" || method === "HEAD" ? "safe" : "unsafe";
  const credentialHeaders = CREDENTIAL_ROUTES.has(route) ? ["authorization"] : undefined;
  const policy: OutboundEndpointPolicy = {
    name: `enterprise-dashboard-${route}`,
    allowedOrigins: [url.origin],
    allowedMethods: allowedMethods(route),
    credentialMode: credentialHeaders ? "scoped" : "forbid",
    credentialHeaders,
    redirect: "error",
    timeoutMs: route === "loopback-health" ? 1_000 : 10_000,
    totalDeadlineMs: route === "loopback-health" ? 1_000 : 10_000,
    responseByteLimit: route === "link-check" || method === "HEAD" ? 64_000 : 4_000_000,
    route: { mode: "direct" },
    networkMode,
    protocol: { allowed: ["auto"], default: "auto" },
    ipAuthority: {
      mode: authority === "loopback" ? "allow-non-public" : "public-only",
      enforcement: "resolve-before-connect",
    },
    replayClass,
  };
  return fetchWithPolicy(url, init, policy, options.fetcher ?? fetch, {
    resolver: options.resolver,
    environment,
  });
}

export async function preconnectEnterpriseDashboardOutbound(
  route: "benchmark-public" | "configured-head",
  input: string | URL,
  options: DashboardPreconnectOptions = {},
): Promise<void> {
  const url = parseUrl(input);
  assertRouteAuthority(route, url);
  const environment = options.environment ?? process.env;
  assertRuntimeControls(environment, options.argv ?? Bun.argv.slice(2));
  const networkMode = options.networkMode ?? parseNetworkMode(environment);
  if (networkMode !== "online") {
    throw new Error(`Enterprise dashboard ${networkMode} policy forbids network preconnect`);
  }
  if ((environment.HTTPS_PROXY || environment.https_proxy)?.trim()) {
    throw new Error("Enterprise dashboard direct preconnect is blocked by active proxy environment");
  }
  const preconnecter = options.preconnecter ?? fetch.preconnect;
  if (!preconnecter) throw new Error("Enterprise dashboard preconnect transport is unavailable");
  await preconnecter(url.origin);
}
