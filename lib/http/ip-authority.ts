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
export type AuthorityAddressScope =
  | 'public'
  | 'loopback'
  | 'private'
  | 'link-local'
  | 'metadata'
  | 'documentation'
  | 'reserved'
  | 'unspecified';

export type ClassifiedAuthorityAddress = ResolvedAuthorityAddress & {
  readonly scope: AuthorityAddressScope;
};

export type AuthorityAddressResolver = (
  hostname: string
) => Promise<readonly ResolvedAuthorityAddress[]>;
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
    return [{ address: host, family: literalFamily as 4 | 6, ttl: 0, source: 'literal' }];
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

function ipv4Number(address: string): number | undefined {
  if (isIP(address) !== 4) return undefined;
  const octets = address.split('.').map(Number);
  return (
    (((octets[0] ?? 0) << 24) |
      ((octets[1] ?? 0) << 16) |
      ((octets[2] ?? 0) << 8) |
      (octets[3] ?? 0)) >>>
    0
  );
}

function ipv4InCidr(address: number, base: string, prefix: number): boolean {
  const baseNumber = ipv4Number(base);
  if (baseNumber === undefined) return false;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (address & mask) === (baseNumber & mask);
}

function expandIpv6(address: string): bigint | undefined {
  if (isIP(address) !== 6) return undefined;
  const normalized = address.toLowerCase();
  const [leftRaw, rightRaw] = normalized.split('::');
  if (normalized.split('::').length > 2) return undefined;
  const parseSide = (side: string | undefined): number[] => {
    if (!side) return [];
    return side.split(':').flatMap(part => {
      if (part.includes('.')) {
        const ipv4 = ipv4Number(part);
        return ipv4 === undefined ? [] : [(ipv4 >>> 16) & 0xffff, ipv4 & 0xffff];
      }
      return [Number.parseInt(part, 16)];
    });
  };
  const left = parseSide(leftRaw);
  const right = parseSide(rightRaw);
  const missing = 8 - left.length - right.length;
  const groups = normalized.includes('::') ? [...left, ...Array(missing).fill(0), ...right] : left;
  if (
    groups.length !== 8 ||
    groups.some(group => !Number.isInteger(group) || group < 0 || group > 0xffff)
  ) {
    return undefined;
  }
  return groups.reduce((value, group) => (value << 16n) | BigInt(group), 0n);
}

function ipv6InCidr(address: bigint, base: string, prefix: number): boolean {
  const baseNumber = expandIpv6(base);
  if (baseNumber === undefined) return false;
  const bits = 128n;
  const shift = bits - BigInt(prefix);
  return address >> shift === baseNumber >> shift;
}

/** Classify a resolved address before any socket is opened. */
export function classifyAuthorityAddress(
  input: ResolvedAuthorityAddress
): ClassifiedAuthorityAddress {
  const normalized = normalizeAuthorityHost(input.address);
  const ipv4 = ipv4Number(normalized);
  let scope: AuthorityAddressScope = 'public';
  if (ipv4 !== undefined) {
    if (ipv4InCidr(ipv4, '0.0.0.0', 8)) scope = 'unspecified';
    else if (ipv4InCidr(ipv4, '127.0.0.0', 8)) scope = 'loopback';
    else if (ipv4InCidr(ipv4, '169.254.169.254', 32)) scope = 'metadata';
    else if (ipv4InCidr(ipv4, '169.254.0.0', 16)) scope = 'link-local';
    else if (
      ipv4InCidr(ipv4, '10.0.0.0', 8) ||
      ipv4InCidr(ipv4, '172.16.0.0', 12) ||
      ipv4InCidr(ipv4, '192.168.0.0', 16) ||
      ipv4InCidr(ipv4, '100.64.0.0', 10)
    )
      scope = 'private';
    else if (
      ipv4InCidr(ipv4, '192.0.2.0', 24) ||
      ipv4InCidr(ipv4, '198.51.100.0', 24) ||
      ipv4InCidr(ipv4, '203.0.113.0', 24)
    )
      scope = 'documentation';
    else if (
      ipv4InCidr(ipv4, '192.0.0.0', 24) ||
      ipv4InCidr(ipv4, '198.18.0.0', 15) ||
      ipv4InCidr(ipv4, '224.0.0.0', 4) ||
      ipv4InCidr(ipv4, '240.0.0.0', 4)
    )
      scope = 'reserved';
  } else {
    const ipv6 = expandIpv6(normalized);
    if (ipv6 === undefined) throw new TypeError(`address must be an IP literal: ${input.address}`);
    if (ipv6 === 0n) scope = 'unspecified';
    else if (ipv6 === 1n) scope = 'loopback';
    else if (ipv6InCidr(ipv6, 'fe80::', 10)) scope = 'link-local';
    else if (ipv6InCidr(ipv6, 'fc00::', 7)) scope = 'private';
    else if (ipv6InCidr(ipv6, '2001:db8::', 32)) scope = 'documentation';
    else if (ipv6InCidr(ipv6, 'ff00::', 8)) scope = 'reserved';
    else if (ipv6InCidr(ipv6, '::ffff:0:0', 96)) {
      const mapped = Number(ipv6 & 0xffffffffn) >>> 0;
      scope = classifyAuthorityAddress({
        ...input,
        address: `${mapped >>> 24}.${(mapped >>> 16) & 255}.${(mapped >>> 8) & 255}.${mapped & 255}`,
        family: 4,
      }).scope;
    }
  }
  return { ...input, address: normalized, scope };
}

/** Public-only egress rejects empty, non-public, and mixed public/private DNS answers. */
export function assertPublicAuthorityAddresses(
  hostname: string,
  rows: readonly ResolvedAuthorityAddress[]
): readonly ClassifiedAuthorityAddress[] {
  if (rows.length === 0)
    throw new Error(`Outbound DNS authority returned no addresses for ${hostname}`);
  const classified = rows.map(classifyAuthorityAddress);
  const denied = classified.filter(row => row.scope !== 'public');
  if (denied.length > 0) {
    const mixed = denied.length !== classified.length ? ' mixed public/non-public' : '';
    const scopes = [...new Set(denied.map(row => row.scope))].join(', ');
    throw new Error(`Outbound DNS authority rejected${mixed} ${hostname} answers (${scopes})`);
  }
  return classified;
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
    family: family as 4 | 6,
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
