import {
  fetchPublicResource,
  type PublicResourceOptions,
} from "../../../../../../lib/http/public-resource-client.ts";
import {
  fetchWithPolicy,
  type OutboundEndpointPolicy,
} from "../../../../../../lib/http/outbound-policy.ts";

const BUILT_IN_PUBLIC_ORIGINS = new Set([
  "https://api.example.com",
  "https://bun.com",
  "https://pub-a471e86af24446498311933a2eca2454.r2.dev",
]);
const LOOPBACK_ORIGINS = new Set([
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3137",
  "http://localhost:3138",
]);

export interface ConfiguredOutboundOptions extends PublicResourceOptions {
  readonly environment?: Readonly<Record<string, string | undefined>>;
}

function parseUrl(input: string | URL, label: string): URL {
  let url: URL;
  try {
    url = new URL(input.toString());
  } catch {
    throw new TypeError(`${label} must be a valid URL`);
  }
  if (url.username || url.password)
    throw new TypeError(`${label} must not contain credentials`);
  if (url.hash) throw new TypeError(`${label} must not contain a fragment`);
  return url;
}

function configuredOrigins(
  environment: Readonly<Record<string, string | undefined>>,
): Set<string> {
  const origins = new Set(BUILT_IN_PUBLIC_ORIGINS);
  for (const item of (environment.TOML_OUTBOUND_ORIGINS ?? "").split(",")) {
    const value = item.trim();
    if (!value) continue;
    const url = parseUrl(value, "Configured outbound origin");
    if (url.protocol !== "https:" || url.pathname !== "/" || url.search)
      throw new TypeError("Configured outbound entries must be exact HTTPS origins");
    origins.add(url.origin);
  }
  return origins;
}

export function fetchTomlConfigured(
  input: string | URL,
  init: BunFetchRequestInit = {},
  options: ConfiguredOutboundOptions = {},
): Promise<Response> {
  const url = parseUrl(input, "TOML outbound endpoint");
  const environment = options.environment ?? process.env;
  if (!configuredOrigins(environment).has(url.origin))
    throw new TypeError(`TOML outbound origin is not configured: ${url.origin}`);
  return fetchPublicResource(url, init, {
    ...options,
    environment,
    responseByteLimit: options.responseByteLimit ?? 16_000_000,
    timeoutMs: options.timeoutMs ?? 10_000,
  });
}

export function fetchTomlLoopback(
  input: string | URL,
  init: BunFetchRequestInit = {},
  options: ConfiguredOutboundOptions = {},
): Promise<Response> {
  const url = parseUrl(input, "TOML loopback endpoint");
  if (!LOOPBACK_ORIGINS.has(url.origin))
    throw new TypeError(`TOML loopback origin is not allowed: ${url.origin}`);
  const policy: OutboundEndpointPolicy = {
    name: "toml-loopback-read",
    allowedOrigins: [url.origin],
    allowedMethods: ["GET", "HEAD"],
    credentialMode: "forbid",
    redirect: "error",
    timeoutMs: options.timeoutMs ?? 5_000,
    totalDeadlineMs: options.timeoutMs ?? 5_000,
    responseByteLimit: options.responseByteLimit ?? 2_000_000,
    route: { mode: "direct" },
    networkMode: options.networkMode ?? "online",
    protocol: { allowed: ["auto"], default: "auto" },
    ipAuthority: { mode: "allow-non-public", enforcement: "resolve-before-connect" },
    replayClass: "safe",
  };
  return fetchWithPolicy(url, init, policy, options.fetcher, {
    resolver: options.resolver,
    environment: options.environment ?? process.env,
  });
}
