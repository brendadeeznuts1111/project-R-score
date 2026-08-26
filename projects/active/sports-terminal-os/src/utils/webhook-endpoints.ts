import {
  fetchWithPolicy,
  isNormalizedLoopbackHostname,
  type OutboundEndpointPolicy,
  type OutboundFetch,
} from '../../../../../lib/http/outbound-policy.ts';

export const WEBHOOK_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

const FORBIDDEN_WEBHOOK_HEADERS = new Set([
  'connection',
  'content-length',
  'host',
  'proxy-connection',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

export interface WebhookEndpointConfig {
  readonly url: string;
  readonly method: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly timeoutMs: number;
}

export function parseWebhookEndpoint(input: string): URL {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new TypeError('Webhook endpoint must be a valid URL');
  }

  if (url.username || url.password) {
    throw new TypeError('Webhook endpoint URL must not contain credentials');
  }
  if (url.hash) {
    throw new TypeError('Webhook endpoint URL must not contain a fragment');
  }
  if (url.protocol !== 'https:') {
    const localHttp = url.protocol === 'http:' && isNormalizedLoopbackHostname(url.hostname);
    if (!localHttp) {
      throw new TypeError('Webhook endpoint must use HTTPS (HTTP is allowed only for loopback development)');
    }
  }

  return url;
}

export function normalizeWebhookMethod(input: string): (typeof WEBHOOK_METHODS)[number] {
  const method = input.toUpperCase();
  if (!WEBHOOK_METHODS.includes(method as (typeof WEBHOOK_METHODS)[number])) {
    throw new TypeError(`Webhook method ${method} is not supported`);
  }
  return method as (typeof WEBHOOK_METHODS)[number];
}

export function normalizeWebhookHeaders(input: Readonly<Record<string, string>>): Record<string, string> {
  const headers = new Headers(input);
  for (const name of headers.keys()) {
    if (FORBIDDEN_WEBHOOK_HEADERS.has(name.toLowerCase())) {
      throw new TypeError(`Webhook header ${name} cannot override transport authority`);
    }
  }
  return Object.fromEntries(headers.entries());
}

export function validateWebhookEndpointConfig(config: WebhookEndpointConfig): WebhookEndpointConfig {
  const url = parseWebhookEndpoint(config.url);
  const method = normalizeWebhookMethod(config.method);
  const headers = normalizeWebhookHeaders(config.headers);
  if (!Number.isSafeInteger(config.timeoutMs) || config.timeoutMs < 1 || config.timeoutMs > 30_000) {
    throw new TypeError('Webhook timeoutMs must be an integer between 1 and 30000');
  }
  return { url: url.toString(), method, headers, timeoutMs: config.timeoutMs };
}

export function fetchWebhookEndpoint(
  config: WebhookEndpointConfig,
  init: Omit<RequestInit, 'method' | 'headers'> = {},
  fetcher: OutboundFetch = fetch
): Promise<Response> {
  const validated = validateWebhookEndpointConfig(config);
  const credentialHeaders = Object.keys(validated.headers);
  const policy: OutboundEndpointPolicy = {
    name: 'registered-webhook',
    allowedOrigins: [new URL(validated.url).origin],
    allowedMethods: [validated.method],
    credentialMode: 'scoped',
    credentialHeaders,
    redirect: 'error',
    timeoutMs: validated.timeoutMs,
  };

  return fetchWithPolicy(
    validated.url,
    { ...init, method: validated.method, headers: validated.headers },
    policy,
    fetcher
  );
}
