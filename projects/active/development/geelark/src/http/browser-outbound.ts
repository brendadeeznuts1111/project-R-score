export type BrowserOutboundFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export interface BrowserOutboundOptions {
  readonly baseOrigin?: string;
  readonly bearerToken?: string;
  readonly fetcher?: BrowserOutboundFetch;
}

interface RouteGrant {
  readonly methods: readonly string[];
  readonly bearer?: boolean;
}

const SAFE_READ = { methods: ["GET"] } as const;
const UNSAFE_WRITE = { methods: ["POST"] } as const;
const AUTH_READ = { methods: ["GET"], bearer: true } as const;
const AUTH_WRITE = { methods: ["POST"], bearer: true } as const;
const CREDENTIAL_HEADERS = ["authorization", "cookie", "proxy-authorization", "x-api-key", "api-key"];
const MAX_RESPONSE_BYTES = 2_000_000;

function exactQuery(url: URL, expected: Readonly<Record<string, string | RegExp>>): boolean {
  const entries = [...url.searchParams.entries()];
  if (entries.length !== Object.keys(expected).length) return false;
  return entries.every(([key, value]) => {
    const rule = expected[key];
    return typeof rule === "string" ? value === rule : rule?.test(value) === true;
  });
}

function routeGrant(url: URL): RouteGrant | undefined {
  const path = url.pathname;
  if (!url.search && /^\/api\/alerts\/(?:active|all|stats|rules)$/.test(path)) return SAFE_READ;
  if (!url.search && /^\/api\/alerts\/resolve\/[0-9]+$/.test(path)) return UNSAFE_WRITE;
  if (!url.search && path === "/api/auth/login") return UNSAFE_WRITE;
  if (!url.search && /^\/api\/auth\/(?:validate|logout)$/.test(path)) return AUTH_WRITE;
  if (path === "/api/auth/audit" && exactQuery(url, { limit: "100" })) return AUTH_READ;
  if (!url.search && /^\/api\/geo\/(?:stats|(?:country|city)\/[^/]+)$/.test(path)) return SAFE_READ;
  if (!url.search && path === "/api/monitoring/summary") return SAFE_READ;
  const environment = path.match(/^\/api\/monitoring\/environment\/([A-Za-z0-9_-]+)$/)?.[1];
  if (environment && exactQuery(url, { env: environment })) return SAFE_READ;
  if (/^\/api\/monitoring\/(?:ips|devices)\/top$/.test(path) &&
      exactQuery(url, { env: /^[A-Za-z0-9_-]+$/, limit: "10" })) return SAFE_READ;
  if (!url.search && /^\/api\/sockets\/(?:stats|dns\/patterns|tcp\/patterns|dns\/suspicious)$/.test(path)) return SAFE_READ;
  if (!url.search && /^(?:\/api\/streams\/stats|\/api\/file-io\/metrics)$/.test(path)) return SAFE_READ;
  if (path === "/api/telemetry/alerts" && exactQuery(url, { env: /^[A-Za-z0-9_-]+$/ })) return SAFE_READ;
  if (path === "/api/telemetry/traces" &&
      (exactQuery(url, { limit: "100" }) || exactQuery(url, { method: /^.{1,128}$/, limit: "100" }))) return SAFE_READ;
  if (path === "/api/telemetry/traces/stats" &&
      (!url.search || exactQuery(url, { method: /^.{1,128}$/ }))) return SAFE_READ;
  if (path === "/api/telemetry/snapshots" && exactQuery(url, { limit: "50" })) return SAFE_READ;
  if (!url.search && path === "/api/telemetry/config") return SAFE_READ;
  if (!url.search && /^\/api\/telemetry\/alerts\/resolve\/[0-9]+$/.test(path)) return UNSAFE_WRITE;
  if (!url.search && /^\/api\/telemetry\/(?:snapshots\/take|alerts\/check)$/.test(path)) return UNSAFE_WRITE;
  if (!url.search && /^\/api\/upload\/status\/[A-Za-z0-9_-]+$/.test(path)) return SAFE_READ;
  if (!url.search && /^\/api\/upload\/(?:initiate|cancel\/[A-Za-z0-9_-]+)$/.test(path)) return UNSAFE_WRITE;
  if (!url.search && /^(?:\/api\/flags\/merged|\/api\/build\/configs|\/api\/metrics|\/api\/health|\/api\/info|\/health)$/.test(path)) return SAFE_READ;
  if (!url.search && /^(?:\/api\/build\/trigger|\/api\/logs)$/.test(path)) return UNSAFE_WRITE;
  return undefined;
}

function parseOrigin(input: string): string {
  const url = new URL(input);
  if (!/^https?:$/.test(url.protocol) || url.origin !== input || url.username || url.password) {
    throw new TypeError("Geelark browser base origin must be a canonical HTTP origin");
  }
  return url.origin;
}

function boundedResponse(response: Response): Response {
  const declared = response.headers.get("content-length");
  if (declared !== null && Number(declared) > MAX_RESPONSE_BYTES) {
    void response.body?.cancel();
    throw new Error("Geelark browser response exceeds its byte limit");
  }
  if (!response.body) return response;
  let observed = 0;
  const body = response.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      observed += chunk.byteLength;
      if (observed > MAX_RESPONSE_BYTES) return controller.error(new Error("Geelark browser response exceeds its byte limit"));
      controller.enqueue(chunk);
    },
  }));
  return new Response(body, response);
}

export async function fetchBrowserSameOrigin(
  route: string,
  init: RequestInit = {},
  options: BrowserOutboundOptions = {},
): Promise<Response> {
  if (!route.startsWith("/") || route.startsWith("//")) throw new TypeError("Geelark browser route must be origin-relative");
  const runtimeOrigin = options.baseOrigin ?? globalThis.location?.origin;
  if (!runtimeOrigin) throw new Error("Geelark browser origin is unavailable");
  const origin = parseOrigin(runtimeOrigin);
  const url = new URL(route, origin);
  if (url.origin !== origin || url.username || url.password || url.hash) throw new Error("Geelark browser route escapes same-origin authority");
  const grant = routeGrant(url);
  if (!grant) throw new Error("Geelark browser route is not allowlisted");
  const method = (init.method ?? "GET").toUpperCase();
  if (!grant.methods.includes(method)) throw new Error(`Geelark browser method ${method} is not allowed`);
  if (init.redirect && init.redirect !== "error") throw new Error("Geelark browser redirect override is denied");
  if (init.mode && init.mode !== "same-origin") throw new Error("Geelark browser mode override is denied");
  if (init.credentials && init.credentials !== "omit") throw new Error("Geelark browser ambient credentials are denied");
  const headers = new Headers(init.headers);
  if (CREDENTIAL_HEADERS.some(header => headers.has(header))) throw new Error("Geelark browser credential headers require typed authority");
  if (options.bearerToken !== undefined) {
    if (!grant.bearer || !/^[A-Za-z0-9._~-]{1,4096}$/.test(options.bearerToken)) throw new Error("Geelark browser bearer authority is invalid");
    headers.set("Authorization", `Bearer ${options.bearerToken}`);
  } else if (grant.bearer) throw new Error("Geelark browser route requires bearer authority");
  const signal = init.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(10_000)]) : AbortSignal.timeout(10_000);
  const fetcher = options.fetcher ?? globalThis.fetch.bind(globalThis);
  const response = await fetcher(url, { ...init, method, headers, credentials: "omit", redirect: "error", mode: "same-origin", signal });
  return boundedResponse(response);
}

/** Server-style helpers share the same relative route catalog and injected Web transport seam. */
export function fetchGeelarkServiceApi(
  route: string,
  init: RequestInit = {},
  options: BrowserOutboundOptions = {},
): Promise<Response> {
  return fetchBrowserSameOrigin(route, init, options);
}
