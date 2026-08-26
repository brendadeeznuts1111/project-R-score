// @see https://bun.com/docs/runtime/utils#bun-nanoseconds — Bun.nanoseconds
// @verified Bun.nanoseconds · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/utils#bun-nanoseconds
// @see https://bun.com/docs/runtime/networking/dns#choosing-a-resolver-backend — Bun.dns.lookup backend
// @see https://bun.com/blog/bun-v1.4#dns.lookup()-now-uses-the-system-resolver-on-linux — Bun 1.4 DNS split
// @see https://bun.com/blog/bun-v1.4#http/2-&-http/3-in-fetch()-(experimental) — fetch protocol
import { Resolver } from 'node:dns/promises';
import { isIP } from 'node:net';
export const RFC_3986_HOST_DOCS = 'https://www.rfc-editor.org/rfc/rfc3986#section-3.2.2';
export const RFC_5952_PORT_DOCS = 'https://www.rfc-editor.org/rfc/rfc5952#section-6';
export const BUN_1_4_DNS_DOCS =
  'https://bun.com/blog/bun-v1.4#dns.lookup()-now-uses-the-system-resolver-on-linux';
export const BUN_1_4_FETCH_PROTOCOL_DOCS =
  'https://bun.com/blog/bun-v1.4#http/2-&-http/3-in-fetch()-(experimental)';
export type AuthorityAddressFamily = 0 | 4 | 6;
export type BunDnsBackend = 'c-ares' | 'system' | 'getaddrinfo' | 'libc';
export type FetchProtocol = 'auto' | 'http1.1' | 'http2';
export type ResolvedAuthorityAddress = {
  address: string;
  family: 4 | 6;
  ttl: number;
  source: 'literal' | 'bun' | 'node-resolver';
};
export type PinnedHttpsPlan = {
  hostname: string;
  address: string;
  family: 4 | 6;
  port: number;
  path: string;
  connectUrl: string;
  httpAuthority: string;
  tlsServerName: string;
  protocol: FetchProtocol;
  redirect: 'manual';
};
export type PinnedHttpsProbe = {
  ok: boolean;
  elapsedMs: number;
  status?: number;
  location?: string | null;
  contentType?: string | null;
  error?: string;
  plan: PinnedHttpsPlan;
};
function assertPort(port: number): void {
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new RangeError(`port must be an integer from 1 through 65535; received ${port}`);
  }
}
/** Normalize a registered host or IP literal without accepting URL authority syntax. */
export function normalizeAuthorityHost(input: string): string {
  const value = input.trim();
  const host = value.startsWith('[') && value.endsWith(']') ? value.slice(1, -1) : value;
  if (!host || /[\s/@?#]/.test(host)) {
    throw new TypeError(
      `host must be a hostname or IP literal without scheme, path, or port: ${input}`
    );
  }
  if (host.includes('%')) {
    throw new TypeError('scoped IPv6 zone identifiers are not valid for this external TLS probe');
  }
  return isIP(host) ? host.toLowerCase() : host.toLowerCase().replace(/\.$/, '');
}
/** RFC 3986 IP-literal form: IPv6 is bracketed when embedded in an authority. */
export function formatAuthorityHost(input: string): string {
  const host = normalizeAuthorityHost(input);
  return isIP(host) === 6 ? `[${host}]` : host;
}
/** Host header / URI authority with default HTTPS port elision. */
export function formatHttpsAuthority(host: string, port = 443): string {
  assertPort(port);
  const formatted = formatAuthorityHost(host);
  return port === 443 ? formatted : `${formatted}:${port}`;
}
export function normalizeRequestPath(input = '/'): string {
  const value = input.trim() || '/';
  if (!value.startsWith('/') || value.startsWith('//') || /[\r\n]/.test(value)) {
    throw new TypeError('path must begin with one slash and cannot contain a line break');
  }
  return value;
}
/**
 * Resolve with Bun 1.4's explicit backend, or with a dedicated Node-compatible
 * Resolver when a DNS server is supplied. `BUN_DNS_SERVER` is intentionally not
 * read: it is not a supported Bun setting.
 */
export async function resolveAuthorityAddresses(
  hostInput: string,
  options: {
    family?: AuthorityAddressFamily;
    backend?: BunDnsBackend;
    dnsServer?: string;
  } = {}
): Promise<ResolvedAuthorityAddress[]> {
  if (options.dnsServer && options.backend) {
    throw new TypeError('dnsServer and Bun DNS backend are separate resolver modes; choose one');
  }
  const host = normalizeAuthorityHost(hostInput);
  const literalFamily = isIP(host);
  const family = options.family ?? 0;
  if (literalFamily) {
    if (family !== 0 && family !== literalFamily) return [];
    return [{ address: host, family: literalFamily, ttl: 0, source: 'literal' }];
  }
  if (!options.dnsServer) {
    const rows = await Bun.dns.lookup(host, {
      family,
      ...(options.backend ? { backend: options.backend } : {}),
    });
    return rows.map(row => ({ ...row, source: 'bun' as const }));
  }

  const resolver = new Resolver();
  resolver.setServers([options.dnsServer]);
  const families = ([4, 6] as const).filter(candidate => family === 0 || candidate === family);
  const resolveFamily = async (candidate: 4 | 6): Promise<ResolvedAuthorityAddress[]> => {
    try {
      const rows =
        candidate === 4
          ? await resolver.resolve4(host, { ttl: true })
          : await resolver.resolve6(host, { ttl: true });
      return rows.map(row => ({ ...row, family: candidate, source: 'node-resolver' }));
    } catch (error) {
      if (family !== 0) throw error;
      return [];
    }
  };
  return (await Promise.all(families.map(resolveFamily))).flat();
}

/** Keep connect address, TLS SNI, and HTTP authority as three explicit layers. */
export function buildPinnedHttpsPlan(input: {
  hostname: string;
  address: string;
  port?: number;
  path?: string;
  protocol?: FetchProtocol;
}): PinnedHttpsPlan {
  const hostname = normalizeAuthorityHost(input.hostname);
  if (isIP(hostname)) {
    throw new TypeError(
      'hostname must be a registered name so TLS SNI and HTTP authority stay explicit'
    );
  }
  const address = normalizeAuthorityHost(input.address);
  const family = isIP(address);
  if (!family) throw new TypeError(`address must be an IPv4 or IPv6 literal: ${input.address}`);
  const port = input.port ?? 443;
  assertPort(port);
  const path = normalizeRequestPath(input.path);
  const protocol = input.protocol ?? 'auto';
  const connectAuthority = formatHttpsAuthority(address, port);
  return {
    hostname,
    address,
    family,
    port,
    path,
    connectUrl: `https://${connectAuthority}${path}`,
    httpAuthority: formatHttpsAuthority(hostname, port),
    tlsServerName: hostname,
    protocol,
    redirect: 'manual',
  };
}

export async function probePinnedHttps(
  plan: PinnedHttpsPlan,
  options: { method?: 'GET' | 'HEAD'; timeoutMs?: number } = {}
): Promise<PinnedHttpsProbe> {
  const started = Bun.nanoseconds();
  try {
    const response = await fetch(plan.connectUrl, {
      method: options.method ?? 'HEAD',
      headers: { Host: plan.httpAuthority, Accept: '*/*' },
      tls: { serverName: plan.tlsServerName, rejectUnauthorized: true },
      redirect: plan.redirect,
      signal: AbortSignal.timeout(options.timeoutMs ?? 10_000),
      ...(plan.protocol === 'auto' ? {} : { protocol: plan.protocol }),
    });
    await response.body?.cancel().catch(() => {});
    return {
      ok: response.status > 0,
      elapsedMs: (Bun.nanoseconds() - started) / 1e6,
      status: response.status,
      location: response.headers.get('location'),
      contentType: response.headers.get('content-type'),
      plan,
    };
  } catch (error) {
    return {
      ok: false,
      elapsedMs: (Bun.nanoseconds() - started) / 1e6,
      error: error instanceof Error ? error.message : String(error),
      plan,
    };
  }
}
