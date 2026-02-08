import { env } from 'bun';

type ProxyObject = {
  url: string;
  headers?: Record<string, string>;
};

type ProxyConfig = string | ProxyObject;

type FetchDefaultsOptions = {
  timeoutMs?: number;
  verbose?: boolean;
};

export type FetchResult = {
  response: Response;
  durationMs: number;
};

const DEFAULT_FETCH_TIMEOUT_MS = Number(env.FETCH_TIMEOUT_MS ?? 5000);
const DEFAULT_FETCH_VERBOSE = env.FETCH_VERBOSE === 'true';
const OUTBOUND_PROXY_URL = env.OUTBOUND_PROXY_URL ?? '';
const OUTBOUND_PROXY_AUTH = env.OUTBOUND_PROXY_AUTH ?? '';
const OUTBOUND_PROXY_HEADERS_JSON = env.OUTBOUND_PROXY_HEADERS_JSON ?? '';

function parseProxyHeaders() {
  if (!OUTBOUND_PROXY_HEADERS_JSON) return undefined;
  try {
    return JSON.parse(OUTBOUND_PROXY_HEADERS_JSON) as Record<string, string>;
  } catch (err) {
    return undefined;
  }
}

function resolveProxyConfig(): ProxyConfig | undefined {
  if (!OUTBOUND_PROXY_URL) return undefined;
  const headers = parseProxyHeaders();
  if (!headers && !OUTBOUND_PROXY_AUTH) return OUTBOUND_PROXY_URL;
  return {
    url: OUTBOUND_PROXY_URL,
    headers: {
      ...(headers ?? {}),
      ...(OUTBOUND_PROXY_AUTH ? { 'Proxy-Authorization': OUTBOUND_PROXY_AUTH } : {}),
    },
  };
}

const proxyConfig = resolveProxyConfig();

export async function fetchWithDefaults(
  input: string | URL,
  init: RequestInit = {},
  options: FetchDefaultsOptions = {}
): Promise<FetchResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const verbose = options.verbose ?? DEFAULT_FETCH_VERBOSE;
  const started = performance.now();
  const response = await fetch(input, {
    ...init,
    // Bun supports both string and object proxy configuration.
    ...(proxyConfig ? { proxy: proxyConfig } : {}),
    signal: init.signal ?? AbortSignal.timeout(timeoutMs),
    ...(verbose ? { verbose: true } : {}),
  });
  return {
    response,
    durationMs: Math.round((performance.now() - started) * 1000) / 1000,
  };
}

export function isPublicHttpUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    const host = url.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return false;
    if (host.startsWith('10.') || host.startsWith('192.168.') || host.startsWith('169.254.'))
      return false;
    return true;
  } catch (err) {
    return false;
  }
}
