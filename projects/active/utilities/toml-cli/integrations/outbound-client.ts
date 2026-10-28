import {
  fetchWithPolicy,
  isNormalizedLoopbackHostname,
  type OutboundEndpointPolicy,
  type OutboundExecutionOptions,
  type OutboundFetch,
  type OutboundNetworkMode,
  type OutboundReplayClass,
} from "../../../../../lib/http/outbound-policy.ts";

export interface TomlOutboundOptions extends OutboundExecutionOptions {
  readonly fetcher?: OutboundFetch;
  readonly networkMode?: OutboundNetworkMode;
}

interface EndpointGrant {
  readonly name: string;
  readonly origin: string;
  readonly path: RegExp;
  readonly methods: readonly string[];
  readonly credentials: readonly string[];
  readonly replay: OutboundReplayClass;
}

const PUBLIC_GRANTS: readonly EndpointGrant[] = [
  grant("cash-oauth", ["https://api.cash.app", "https://sandbox.api.cash.app"], /^\/oauth\/(?:token|revoke)$/, ["POST"], true),
  grant("cash-read", ["https://api.cash.app", "https://sandbox.api.cash.app"], /^\/api\/(?:profile|balance|transactions(?:\/[A-Za-z0-9._~-]+)?)$/, ["GET"], true),
  grant("cash-write", ["https://api.cash.app", "https://sandbox.api.cash.app"], /^\/api\/(?:payments|requests)$/, ["POST"], true),
  grant("twilio-read", ["https://api.twilio.com"], /^\/2010-04-01\/Accounts\/[A-Za-z0-9]+(?:\.json|\/Messages(?:\/[A-Za-z0-9]+)?\.json|\/Usage\/Records\.json)$/, ["GET"], true),
  grant("twilio-write", ["https://api.twilio.com"], /^\/2010-04-01\/Accounts\/[A-Za-z0-9]+\/Messages(?:\/[A-Za-z0-9]+)?\.json$/, ["POST"], true),
  grant("twilio-delete", ["https://api.twilio.com"], /^\/2010-04-01\/Accounts\/[A-Za-z0-9]+\/Messages\/[A-Za-z0-9]+\.json$/, ["DELETE"], true),
  grant("gmail-read", ["https://gmail.googleapis.com"], /^\/gmail\/v1\/users\/me\/messages(?:\/[A-Za-z0-9._~-]+)?$/, ["GET"], true),
  grant("gmail-write", ["https://gmail.googleapis.com"], /^\/gmail\/v1\/users\/me\/messages(?:\/send|\/[A-Za-z0-9._~-]+\/(?:modify|trash))$/, ["POST"], true),
  grant("microsoft-read", ["https://graph.microsoft.com"], /^\/v1\.0\/me\/messages(?:\/[A-Za-z0-9._~-]+)?$/, ["GET"], true),
  grant("microsoft-send", ["https://graph.microsoft.com"], /^\/v1\.0\/me\/sendMail$/, ["POST"], true),
  grant("microsoft-change", ["https://graph.microsoft.com"], /^\/v1\.0\/me\/messages\/[A-Za-z0-9._~-]+$/, ["PATCH", "DELETE"], true),
  grant("sendgrid-api", ["https://api.sendgrid.com"], /^\/v3\/mail\/send$/, ["POST"], true),
  grant("mailgun-api", ["https://api.mailgun.net"], /^\/v3\/[A-Za-z0-9.-]+\/messages$/, ["POST"], true),
  grant("google-oauth", ["https://oauth2.googleapis.com"], /^\/token$/, ["POST"], false),
  grant("microsoft-oauth", ["https://login.microsoftonline.com"], /^\/common\/oauth2\/v2\.0\/token$/, ["POST"], false),
  grant("twitter-read", ["https://api.twitter.com"], /^\/1\.1\/(?:statuses\/(?:show|user_timeline)|search\/tweets|application\/rate_limit_status|account\/settings)\.json$/, ["GET"], true),
  grant("twitter-write", ["https://api.twitter.com"], /^\/1\.1\/statuses\/(?:update|destroy\/[0-9]+)\.json$/, ["POST"], true),
  grant("twitter-upload", ["https://upload.twitter.com"], /^\/1\.1\/media\/metadata\/create\.json$/, ["POST"], true),
].flat();

function grant(
  name: string,
  origins: readonly string[],
  path: RegExp,
  methods: readonly string[],
  credentialed: boolean,
): EndpointGrant[] {
  return origins.map(origin => ({
    name,
    origin,
    path,
    methods,
    credentials: credentialed ? ["authorization"] : [],
    replay: methods.every(method => method === "GET") ? "safe" : "unsafe",
  }));
}

function networkMode(options: TomlOutboundOptions): OutboundNetworkMode {
  if (options.networkMode) return options.networkMode;
  const raw = (options.environment ?? Bun.env).TOML_CLI_NETWORK_MODE;
  if (raw === undefined || raw === "" || raw === "online") return "online";
  if (raw === "cached-only" || raw === "offline-no-socket") return raw;
  throw new TypeError(`Unsupported TOML_CLI_NETWORK_MODE: ${raw}`);
}

function requestMethod(init: BunFetchRequestInit): string {
  return (init.method ?? "GET").toUpperCase();
}

function policy(
  grant: EndpointGrant,
  method: string,
  mode: OutboundNetworkMode,
  allowNonPublic = false,
): OutboundEndpointPolicy {
  return {
    name: `toml-cli-${grant.name}`,
    allowedOrigins: [grant.origin],
    allowedMethods: [method],
    credentialMode: grant.credentials.length ? "scoped" : "forbid",
    credentialHeaders: grant.credentials,
    redirect: "error",
    timeoutMs: 15_000,
    totalDeadlineMs: 15_000,
    responseByteLimit: 4_000_000,
    route: { mode: "direct" },
    networkMode: mode,
    protocol: { allowed: ["auto"], default: "auto" },
    ipAuthority: {
      mode: allowNonPublic ? "allow-non-public" : "public-only",
      enforcement: "resolve-before-connect",
    },
    replayClass: grant.replay,
  };
}

function execute(
  url: URL,
  init: BunFetchRequestInit,
  grant: EndpointGrant,
  options: TomlOutboundOptions,
  allowNonPublic = false,
): Promise<Response> {
  const method = requestMethod(init);
  if (!grant.methods.includes(method))
    throw new Error(`Outbound method ${method} is not allowed by toml-cli-${grant.name}`);
  return fetchWithPolicy(url, init, policy(grant, method, networkMode(options), allowNonPublic), options.fetcher, options);
}

export function fetchTomlIntegration(
  input: string | URL,
  init: BunFetchRequestInit = {},
  options: TomlOutboundOptions = {},
): Promise<Response> {
  const url = new URL(input.toString());
  const method = requestMethod(init);
  const routes = PUBLIC_GRANTS.filter(row => row.origin === url.origin && row.path.test(url.pathname));
  const selected = routes.find(row => row.methods.includes(method));
  if (!selected) {
    if (routes.length) throw new Error(`Outbound method ${method} is not allowed by the TOML CLI integration catalog`);
    throw new Error("TOML CLI outbound endpoint is not in the integration catalog");
  }
  return execute(url, init, selected, options);
}

export function fetchTomlRegistry(
  input: string | URL,
  registry: string | URL,
  init: BunFetchRequestInit,
  options: TomlOutboundOptions = {},
): Promise<Response> {
  const url = new URL(input.toString());
  const base = new URL(registry.toString());
  const loopback = isNormalizedLoopbackHostname(base.hostname);
  if (base.username || base.password || base.search || base.hash || (base.protocol !== "https:" && !(loopback && base.protocol === "http:")))
    throw new TypeError("Registry must use public HTTPS or loopback HTTP without URL credentials");
  const basePath = base.pathname === "/" ? "" : base.pathname.replace(/\/$/, "");
  const requestPath = url.pathname === "/" ? "" : url.pathname.replace(/\/$/, "");
  if (url.origin !== base.origin || !(requestPath === basePath || requestPath.startsWith(`${basePath}/`)))
    throw new Error("Registry request must remain under its configured base URL");
  const suffix = requestPath.slice(basePath.length);
  const method = requestMethod(init);
  const packageRoute = /^\/[A-Za-z0-9._~-]+$|^\/%40[A-Za-z0-9._~-]+%2[fF][A-Za-z0-9._~-]+$/;
  if (!((method === "HEAD" && suffix === "") || (method === "GET" && packageRoute.test(suffix))))
    throw new Error("Registry request is not an exact health or package-metadata route");
  const selected: EndpointGrant = {
    name: "registry",
    origin: base.origin,
    path: /^/,
    methods: [method],
    credentials: ["authorization", "cookie"],
    replay: "safe",
  };
  return execute(url, init, selected, options, loopback);
}
