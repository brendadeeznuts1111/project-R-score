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
const DEFAULT_NO_PROXY = env.NO_PROXY ?? '';
const DEFAULT_SECURITY_NO_PROXY = [
  'localhost',
  '127.0.0.1',
  '::1',
  '*.internal',
  '192.168.*',
  '10.*',
  '172.16.*',
  '172.17.*',
  '172.18.*',
  '172.19.*',
  '172.20.*',
  '172.21.*',
  '172.22.*',
  '172.23.*',
  '172.24.*',
  '172.25.*',
  '172.26.*',
  '172.27.*',
  '172.28.*',
  '172.29.*',
  '172.30.*',
  '172.31.*',
  '*.corp',
  'metadata.google.internal',
];

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

function parseNoProxyList(noProxy: string): string[] {
  return noProxy
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

function wildcardToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped.replace(/\*/g, '.*')}$`, 'i');
}

function matchesNoProxyPattern(hostname: string, pattern: string): boolean {
  if (!pattern) return false;
  if (pattern.includes('*')) {
    return wildcardToRegex(pattern).test(hostname);
  }
  return hostname === pattern;
}

export function shouldBypassProxy(
  hostname: string,
  noProxy = DEFAULT_NO_PROXY,
  extraDenyPatterns: string[] = []
): boolean {
  const host = hostname.trim().toLowerCase();
  const patterns = [...DEFAULT_SECURITY_NO_PROXY, ...parseNoProxyList(noProxy), ...extraDenyPatterns];
  return patterns.some((pattern) => matchesNoProxyPattern(host, pattern));
}

export function getProxyConfigForTarget(
  target: string | URL,
  options: {
    proxy?: ProxyConfig;
    noProxy?: string;
    extraDenyPatterns?: string[];
  } = {}
): { proxy?: ProxyConfig; proxied: boolean; hostname?: string } {
  const proxy = options.proxy ?? proxyConfig;
  if (!proxy) return { proxy: undefined, proxied: false };
  try {
    const url = typeof target === 'string' ? new URL(target) : target;
    const hostname = url.hostname.toLowerCase();
    if (shouldBypassProxy(hostname, options.noProxy, options.extraDenyPatterns)) {
      return { proxy: undefined, proxied: false, hostname };
    }
    return { proxy, proxied: true, hostname };
  } catch {
    return { proxy, proxied: true };
  }
}

function mergeHeaders(base: HeadersInit | undefined, additions: Record<string, string>): Headers {
  const headers = new Headers(base);
  for (const [key, value] of Object.entries(additions)) {
    if (!headers.has(key)) headers.set(key, value);
  }
  return headers;
}

export async function fetchWithDefaults(
  input: string | URL,
  init: RequestInit = {},
  options: FetchDefaultsOptions = {}
): Promise<FetchResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const verbose = options.verbose ?? DEFAULT_FETCH_VERBOSE;
  const started = performance.now();
  const targetUrl = typeof input === 'string' ? input : input.toString();
  const { proxy, proxied, hostname } = getProxyConfigForTarget(targetUrl);
  const requestHeaders =
    proxied && hostname
      ? mergeHeaders(init.headers, {
          'X-Forwarded-Proto': new URL(targetUrl).protocol.replace(':', ''),
          'X-Forwarded-Host': hostname,
        })
      : init.headers;
  const response = await fetch(input, {
    ...init,
    // Bun supports both string and object proxy configuration.
    ...(proxy ? { proxy } : {}),
    ...(requestHeaders ? { headers: requestHeaders } : {}),
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
