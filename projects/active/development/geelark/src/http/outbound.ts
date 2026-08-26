import { isIP } from "node:net";
import {
  fetchWithPolicy,
  type OutboundEndpointPolicy,
  type OutboundExecutionOptions,
  type OutboundFetch,
  type OutboundNetworkMode,
  type OutboundReplayClass,
} from "../../../../../../lib/http/outbound-policy.ts";

const REGISTRY_ORIGIN = "https://registry.example.com";
const GEOLOCATION_ORIGIN = "http://ip-api.com";
const WEBHOOK_ORIGINS = {
  slack: "https://hooks.slack.com",
  discord: "https://discord.com",
} as const;

export interface GeelarkOutboundOptions extends OutboundExecutionOptions {
  readonly fetcher?: OutboundFetch;
  readonly networkMode?: OutboundNetworkMode;
}

function request(
  url: URL,
  init: BunFetchRequestInit,
  name: string,
  methods: readonly string[],
  replayClass: OutboundReplayClass,
  options: GeelarkOutboundOptions,
  responseByteLimit = 512_000,
): Promise<Response> {
  const { fetcher = fetch, networkMode = "online", ...execution } = options;
  const policy = {
    name,
    allowedOrigins: [url.origin],
    allowedMethods: methods,
    credentialMode: "forbid",
    redirect: "error",
    timeoutMs: 8_000,
    totalDeadlineMs: 8_000,
    responseByteLimit,
    route: { mode: "direct" },
    networkMode,
    protocol: {
      allowed: url.protocol === "http:" ? ["auto", "h1"] : ["auto", "h1", "h2"],
      default: "auto",
    },
    ipAuthority: { mode: "public-only", enforcement: "resolve-before-connect" },
    replayClass,
  } as const satisfies OutboundEndpointPolicy;
  return fetchWithPolicy(url, init, policy, fetcher, execution);
}

function packageUrl(packageName: string): URL {
  const parts = packageName.split("/");
  const valid =
    (parts.length === 1 && /^[a-z0-9][a-z0-9._-]*$/.test(parts[0] ?? "")) ||
    (parts.length === 2 && /^@[a-z0-9][a-z0-9._-]*$/.test(parts[0] ?? "") &&
      /^[a-z0-9][a-z0-9._-]*$/.test(parts[1] ?? ""));
  if (!valid) throw new TypeError("Geelark demo registry package name is invalid");
  return new URL(`/${parts.map(encodeURIComponent).join("/")}`, REGISTRY_ORIGIN);
}

export function fetchGeelarkDemoRegistryPackage(
  packageName: string,
  init: BunFetchRequestInit,
  options: GeelarkOutboundOptions = {},
): Promise<Response> {
  return request(packageUrl(packageName), init, "geelark-demo-registry-read", ["GET"], "safe", options);
}

export function fetchGeelarkDemoRegistryPublish(
  init: BunFetchRequestInit,
  options: GeelarkOutboundOptions = {},
): Promise<Response> {
  return request(
    new URL("/publish", REGISTRY_ORIGIN),
    init,
    "geelark-demo-registry-publish",
    ["POST"],
    "unsafe",
    options,
  );
}

export function fetchGeelarkGeolocation(
  ip: string,
  options: GeelarkOutboundOptions = {},
): Promise<Response> {
  if (!isIP(ip)) throw new TypeError("Geelark geolocation requires an IP address");
  const url = new URL(`/json/${encodeURIComponent(ip)}`, GEOLOCATION_ORIGIN);
  url.searchParams.set("fields", "status,message,country,countryCode,region,city,lat,lon,timezone,isp,org");
  return request(url, {}, "geelark-public-geolocation", ["GET"], "safe", options, 256_000);
}

function webhookUrl(provider: keyof typeof WEBHOOK_ORIGINS, input: string): URL {
  const url = new URL(input);
  if (url.origin !== WEBHOOK_ORIGINS[provider] || url.search || url.hash) {
    throw new TypeError(`Geelark ${provider} webhook authority is invalid`);
  }
  const validPath =
    provider === "slack"
      ? /^\/services\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+$/.test(url.pathname)
      : /^\/api\/webhooks\/[0-9]+\/[A-Za-z0-9._-]+$/.test(url.pathname);
  if (!validPath) throw new TypeError(`Geelark ${provider} webhook path is invalid`);
  return url;
}

export function fetchGeelarkWebhook(
  provider: keyof typeof WEBHOOK_ORIGINS,
  webhook: string,
  init: BunFetchRequestInit,
  options: GeelarkOutboundOptions = {},
): Promise<Response> {
  return request(webhookUrl(provider, webhook), init, `geelark-${provider}-webhook`, ["POST"], "unsafe", options);
}
