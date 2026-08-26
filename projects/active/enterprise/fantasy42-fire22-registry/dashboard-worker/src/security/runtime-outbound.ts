import {
  fetchWithPolicy,
  type OutboundEndpointPolicy,
  type OutboundReplayClass,
} from '../../../../../../../lib/http/outbound-policy.ts';
import {
  parseFantasy42NetworkMode,
  type Fantasy42OutboundOptions,
} from './outbound-client.ts';

type FixedApiAuthority = {
  readonly pathPrefix: string;
  readonly credentialHeaders: readonly string[];
};

const FIXED_API_AUTHORITIES = new Map<string, FixedApiAuthority>([
  [
    'https://fantasy402.com',
    { pathPrefix: '/cloud/api/', credentialHeaders: ['authorization', 'cookie'] },
  ],
  [
    'https://fire22.ag',
    { pathPrefix: '/cloud/api/', credentialHeaders: ['authorization', 'cookie'] },
  ],
  [
    'https://api.fire22.com',
    { pathPrefix: '/', credentialHeaders: ['authorization'] },
  ],
]);

function parseUrl(input: string | URL, label: string): URL {
  let url: URL;
  try {
    url = new URL(input.toString());
  } catch {
    throw new TypeError(`${label} must be an absolute URL`);
  }
  if (url.username || url.password) throw new TypeError(`${label} must not contain credentials`);
  if (url.hash) throw new TypeError(`${label} must not contain a fragment`);
  return url;
}

function requestMethod(init: BunFetchRequestInit): string {
  const method = (init.method ?? 'GET').toUpperCase();
  if ((method === 'GET' || method === 'HEAD') && init.body != null) {
    throw new TypeError(`${method} outbound requests must not carry a body`);
  }
  return method;
}

function replayClass(method: string): OutboundReplayClass {
  if (method === 'GET' || method === 'HEAD') return 'safe';
  if (method === 'PUT' || method === 'DELETE') return 'idempotent';
  return 'unsafe';
}

function networkMode(options: Fantasy42OutboundOptions) {
  const environment = options.environment ?? Bun.env;
  return options.networkMode ?? parseFantasy42NetworkMode(environment.FIRE22_NETWORK_MODE);
}

function execute(
  url: URL,
  init: BunFetchRequestInit,
  policy: OutboundEndpointPolicy,
  options: Fantasy42OutboundOptions
): Promise<Response> {
  return fetchWithPolicy(url, init, policy, options.fetcher ?? fetch, {
    resolver: options.resolver,
    environment: options.environment ?? Bun.env,
  });
}

export function fetchFixedFantasyApi(
  input: string | URL,
  init: BunFetchRequestInit,
  options: Fantasy42OutboundOptions = {}
): Promise<Response> {
  const url = parseUrl(input, 'Fantasy42 API URL');
  const authority = FIXED_API_AUTHORITIES.get(url.origin);
  if (!authority || !url.pathname.startsWith(authority.pathPrefix)) {
    throw new Error('Fantasy42 API URL is outside the fixed API authority allowlist');
  }
  const method = requestMethod(init);
  return execute(
    url,
    init,
    {
      name: 'fantasy42-fixed-api',
      allowedOrigins: [url.origin],
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentialMode: 'scoped',
      credentialHeaders: authority.credentialHeaders,
      redirect: 'error',
      timeoutMs: 20_000,
      totalDeadlineMs: 20_000,
      responseByteLimit: 4_000_000,
      route: { mode: 'direct' },
      networkMode: networkMode(options),
      protocol: { allowed: ['auto'], default: 'auto' },
      ipAuthority: { mode: 'public-only', enforcement: 'resolve-before-connect' },
      replayClass: replayClass(method),
    },
    options
  );
}

export function fetchConfiguredWebhook(
  input: string | URL,
  init: BunFetchRequestInit,
  options: Fantasy42OutboundOptions = {}
): Promise<Response> {
  const url = parseUrl(input, 'Webhook URL');
  if (url.protocol !== 'https:') throw new TypeError('Webhook URL must use HTTPS');
  const method = requestMethod(init);
  return execute(
    url,
    init,
    {
      name: 'fantasy42-configured-webhook',
      allowedOrigins: [url.origin],
      allowedMethods: ['POST'],
      credentialMode: 'forbid',
      credentialHeaders: [],
      redirect: 'error',
      timeoutMs: 10_000,
      totalDeadlineMs: 10_000,
      responseByteLimit: 1_000_000,
      route: { mode: 'direct' },
      networkMode: networkMode(options),
      protocol: { allowed: ['auto'], default: 'auto' },
      ipAuthority: { mode: 'public-only', enforcement: 'resolve-before-connect' },
      replayClass: replayClass(method),
    },
    options
  );
}
