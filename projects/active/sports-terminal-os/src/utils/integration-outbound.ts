import {
  fetchWithPolicy,
  isNormalizedLoopbackHostname,
  type OutboundEndpointPolicy,
  type OutboundExecutionOptions,
  type OutboundFetch,
} from '../../../../../lib/http/outbound-policy.ts';
import { h2Fetch } from './h2-fetch';

const PUBLIC_IP_AUTHORITY = {
  mode: 'public-only',
  enforcement: 'resolve-before-connect',
} as const;

const DIRECT_ONLINE = {
  route: { mode: 'direct' as const },
  networkMode: 'online' as const,
  ipAuthority: PUBLIC_IP_AUTHORITY,
};

export const INTEGRATION_OUTBOUND_POLICIES = {
  kimiRisk: {
    name: 'sports-terminal-kimi-risk',
    allowedOrigins: ['https://api.moonshot.cn'],
    allowedMethods: ['POST'],
    credentialMode: 'scoped',
    credentialHeaders: ['authorization'],
    redirect: 'error',
    timeoutMs: 20_000,
    totalDeadlineMs: 20_000,
    responseByteLimit: 1_000_000,
    ...DIRECT_ONLINE,
    protocol: { allowed: ['auto'], default: 'auto' },
    replayClass: 'unsafe',
  },
  pinnacleOdds: {
    name: 'sports-terminal-pinnacle-odds',
    allowedOrigins: ['https://api.pinnacle.com'],
    allowedMethods: ['GET'],
    credentialMode: 'scoped',
    credentialHeaders: ['authorization'],
    redirect: 'error',
    timeoutMs: 15_000,
    totalDeadlineMs: 15_000,
    responseByteLimit: 4_000_000,
    ...DIRECT_ONLINE,
    protocol: { allowed: ['auto'], default: 'auto' },
    replayClass: 'safe',
  },
  telegramBotApi: {
    name: 'sports-terminal-telegram-bot-api',
    allowedOrigins: ['https://api.telegram.org'],
    allowedMethods: ['POST'],
    credentialMode: 'forbid',
    redirect: 'error',
    timeoutMs: 10_000,
    totalDeadlineMs: 10_000,
    responseByteLimit: 1_000_000,
    ...DIRECT_ONLINE,
    protocol: { allowed: ['h2'], default: 'h2' },
    replayClass: 'unsafe',
    controlGrants: [
      {
        control: 'request-protocol',
        values: ['h2'],
        reason: 'Telegram Bot API uses the reviewed HTTP/2 client without unsafe replay',
      },
    ],
  },
} as const satisfies Record<string, OutboundEndpointPolicy>;

export interface IntegrationFetchOptions extends OutboundExecutionOptions {
  readonly fetcher?: OutboundFetch;
}

function execute(
  input: string | URL,
  init: BunFetchRequestInit,
  policy: OutboundEndpointPolicy,
  options: IntegrationFetchOptions
): Promise<Response> {
  return fetchWithPolicy(input, init, policy, options.fetcher, options);
}

export function fetchKimiRisk(
  init: BunFetchRequestInit,
  options: IntegrationFetchOptions = {}
): Promise<Response> {
  return execute(
    'https://api.moonshot.cn/v1/chat/completions',
    init,
    INTEGRATION_OUTBOUND_POLICIES.kimiRisk,
    options
  );
}

export function fetchPinnacleOddsEndpoint(
  input: string | URL,
  init: BunFetchRequestInit,
  options: IntegrationFetchOptions = {}
): Promise<Response> {
  return execute(input, init, INTEGRATION_OUTBOUND_POLICIES.pinnacleOdds, options);
}

function telegramBotUrl(botToken: string, method: string): URL {
  if (!/^[0-9]+:[A-Za-z0-9_-]+$/.test(botToken)) {
    throw new TypeError('Telegram bot token has an invalid transport shape');
  }
  if (!/^[A-Za-z][A-Za-z0-9]+$/.test(method)) {
    throw new TypeError('Telegram Bot API method is invalid');
  }
  return new URL(`/bot${botToken}/${method}`, 'https://api.telegram.org');
}

export function fetchTelegramBotApi(
  botToken: string,
  method: string,
  init: BunFetchRequestInit,
  options: IntegrationFetchOptions = {}
): Promise<Response> {
  return execute(
    telegramBotUrl(botToken, method),
    init,
    INTEGRATION_OUTBOUND_POLICIES.telegramBotApi,
    { ...options, fetcher: options.fetcher ?? h2Fetch }
  );
}

export function parsePartnerSourceEndpoint(input: string): URL {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new TypeError('Partner source endpoint must be a valid URL');
  }
  if (url.username || url.password) {
    throw new TypeError('Partner source endpoint must not contain credentials');
  }
  if (url.hash) throw new TypeError('Partner source endpoint must not contain a fragment');
  const loopbackHttp = url.protocol === 'http:' && isNormalizedLoopbackHostname(url.hostname);
  if (url.protocol !== 'https:' && !loopbackHttp) {
    throw new TypeError('Partner source endpoint must use HTTPS (HTTP is loopback-only)');
  }
  return url;
}

export function fetchPartnerSourceHealth(
  input: string,
  options: IntegrationFetchOptions = {}
): Promise<Response> {
  const url = parsePartnerSourceEndpoint(input);
  const loopback = isNormalizedLoopbackHostname(url.hostname);
  const policy: OutboundEndpointPolicy = {
    name: 'sports-terminal-partner-source-health',
    allowedOrigins: [url.origin],
    allowedMethods: ['HEAD'],
    credentialMode: 'forbid',
    redirect: 'error',
    timeoutMs: 5_000,
    totalDeadlineMs: 5_000,
    responseByteLimit: 1,
    route: { mode: 'direct' },
    networkMode: 'online',
    protocol: { allowed: ['auto'], default: 'auto' },
    ipAuthority: {
      mode: loopback ? 'allow-non-public' : 'public-only',
      enforcement: 'resolve-before-connect',
    },
    replayClass: 'safe',
  };
  return execute(url, { method: 'HEAD' }, policy, options);
}
