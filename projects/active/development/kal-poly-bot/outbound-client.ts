import {
  fetchWithPolicy,
  isNormalizedLoopbackHostname,
  type OutboundEndpointPolicy,
  type OutboundExecutionOptions,
  type OutboundFetch,
  type OutboundNetworkMode,
} from '../../../../lib/http/outbound-policy.ts';

const TELEGRAM_ORIGIN = 'https://api.telegram.org';

const TELEGRAM_POLICY = {
  name: 'kal-poly-telegram-send-message',
  allowedOrigins: [TELEGRAM_ORIGIN],
  allowedMethods: ['POST'],
  credentialMode: 'forbid',
  redirect: 'error',
  timeoutMs: 10_000,
  totalDeadlineMs: 10_000,
  responseByteLimit: 1024 * 1024,
  route: { mode: 'direct' },
  networkMode: 'online',
  protocol: { allowed: ['auto', 'h1', 'h2'], default: 'auto' },
  ipAuthority: { mode: 'public-only', enforcement: 'resolve-before-connect' },
  replayClass: 'unsafe',
} as const satisfies OutboundEndpointPolicy;

export interface KalPolyOutboundExecutionOptions extends OutboundExecutionOptions {
  readonly fetcher?: OutboundFetch;
  readonly networkMode?: OutboundNetworkMode;
}

export interface KalPolyLoopbackAuthority {
  readonly origin: string;
}

export function createKalPolyLoopbackAuthority(
  hostname: string,
  port: number
): KalPolyLoopbackAuthority {
  if (!isNormalizedLoopbackHostname(hostname)) {
    throw new TypeError('Kal Poly Bot internal HTTP authority must be loopback');
  }
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new TypeError('Kal Poly Bot internal HTTP authority requires a valid port');
  }
  const wireHostname = hostname.includes(':') ? `[${hostname.replace(/^\[|\]$/g, '')}]` : hostname;
  return { origin: `http://${wireHostname}:${port}` };
}

function internalUrl(authority: KalPolyLoopbackAuthority, route: string): URL {
  if (!route.startsWith('/') || route.startsWith('//')) {
    throw new TypeError('Kal Poly Bot internal HTTP route must be origin-relative');
  }
  const url = new URL(route, authority.origin);
  if (url.origin !== authority.origin || url.hash) {
    throw new TypeError('Kal Poly Bot internal HTTP route escapes its authority');
  }
  return url;
}

export async function fetchKalPolyLoopback(
  authority: KalPolyLoopbackAuthority,
  route: string,
  init: BunFetchRequestInit = {},
  options: KalPolyOutboundExecutionOptions = {}
): Promise<Response> {
  const { fetcher = fetch, networkMode = 'online', ...execution } = options;
  const method = (init.method ?? 'GET').toUpperCase();
  const policy = {
    name: 'kal-poly-loopback-http',
    allowedOrigins: [authority.origin],
    allowedMethods: ['GET', 'POST'],
    credentialMode: 'forbid',
    redirect: 'error',
    timeoutMs: 5_000,
    totalDeadlineMs: 5_000,
    responseByteLimit: 2 * 1024 * 1024,
    route: { mode: 'direct' },
    networkMode,
    protocol: { allowed: ['auto', 'h1'], default: 'auto' },
    ipAuthority: { mode: 'allow-non-public', enforcement: 'resolve-before-connect' },
    replayClass: method === 'GET' ? 'safe' : 'unsafe',
  } as const satisfies OutboundEndpointPolicy;
  return await fetchWithPolicy(internalUrl(authority, route), init, policy, fetcher, execution);
}

function telegramSendMessageUrl(botToken: string): URL {
  if (!/^[0-9]+:[A-Za-z0-9_-]+$/.test(botToken)) {
    throw new TypeError('Kal Poly Bot Telegram token has an invalid transport shape');
  }
  return new URL(`/bot${botToken}/sendMessage`, TELEGRAM_ORIGIN);
}

export async function fetchKalPolyTelegramSendMessage(
  botToken: string,
  init: BunFetchRequestInit,
  options: KalPolyOutboundExecutionOptions = {}
): Promise<Response> {
  const { fetcher = fetch, networkMode = 'online', ...execution } = options;
  const policy = { ...TELEGRAM_POLICY, networkMode } satisfies OutboundEndpointPolicy;
  return await fetchWithPolicy(telegramSendMessageUrl(botToken), init, policy, fetcher, execution);
}
