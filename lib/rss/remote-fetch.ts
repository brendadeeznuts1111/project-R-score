// @see https://bun.com/docs/runtime/networking/fetch — fetch, redirect, timeout

export type RemoteFetchPolicy = {
  fetcher: typeof fetch;
  maxBytes: number;
  maxRedirects: number;
  timeoutMs: number;
  label: string;
  allowedOrigins?: ReadonlySet<string>;
};

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

function blockedIpv4(host: string): boolean {
  const parts = host.split('.').map(Number);
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }
  const [a = 0, b = 0] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19 || b === 51)) ||
    (a === 203 && b === 0) ||
    a >= 224
  );
}

function ipv6Bytes(host: string): number[] | null {
  if (!host.includes(':')) return null;
  const [left = '', right = ''] = host.split('::');
  if (host.split('::').length > 2) return null;
  const parseSide = (side: string): number[] | null => {
    if (!side) return [];
    const words: number[] = [];
    for (const part of side.split(':')) {
      if (!/^[0-9a-f]{1,4}$/i.test(part)) return null;
      words.push(Number.parseInt(part, 16));
    }
    return words;
  };
  const before = parseSide(left);
  const after = parseSide(right);
  if (!before || !after) return null;
  const omitted = 8 - before.length - after.length;
  if ((host.includes('::') && omitted < 1) || (!host.includes('::') && omitted !== 0)) return null;
  const words = [...before, ...Array.from({ length: omitted }, () => 0), ...after];
  return words.flatMap(word => [word >> 8, word & 0xff]);
}

function blockedIpv6(host: string): boolean {
  const bytes = ipv6Bytes(host);
  if (!bytes) return false;
  if (
    bytes.every(byte => byte === 0) ||
    (bytes.slice(0, 15).every(byte => byte === 0) && bytes[15] === 1)
  )
    return true;
  if ((bytes[0]! & 0xfe) === 0xfc || bytes[0] === 0xff) return true;
  if (bytes[0] === 0xfe && (bytes[1]! & 0xc0) === 0x80) return true;
  if (bytes[0] === 0x20 && bytes[1] === 0x01 && bytes[2] === 0x0d && bytes[3] === 0xb8) return true;
  const mapped =
    bytes.slice(0, 10).every(byte => byte === 0) && bytes[10] === 0xff && bytes[11] === 0xff;
  return mapped && blockedIpv4(bytes.slice(12).join('.'));
}

function blockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return true;
  if (blockedIpv4(host)) return true;
  return blockedIpv6(host);
}

export function validateRemoteHttpsUrl(
  input: string | URL,
  allowedOrigins?: ReadonlySet<string>,
  label = 'Remote resource'
): URL {
  const url = input instanceof URL ? new URL(input.href) : new URL(input);
  if (url.protocol !== 'https:')
    throw new Error(`${label} protocol is not allowed: ${url.protocol}`);
  if (url.username || url.password) throw new Error(`${label} URL must not contain credentials`);
  if (url.port && url.port !== '443') throw new Error(`${label} URL uses an unsupported port`);
  if (blockedHost(url.hostname)) throw new Error(`${label} URL targets a prohibited host`);
  url.hash = '';
  if (allowedOrigins && !allowedOrigins.has(url.origin)) {
    throw new Error(`${label} origin is not allowed: ${url.origin}`);
  }
  return url;
}

export async function fetchWithRedirectPolicy(
  initialUrl: URL,
  headers: Headers,
  policy: RemoteFetchPolicy
): Promise<{ response: Response; finalUrl: URL }> {
  let current = validateRemoteHttpsUrl(initialUrl, policy.allowedOrigins, policy.label);
  const visited = new Set<string>();
  const deadline = AbortSignal.timeout(policy.timeoutMs);
  for (let hop = 0; hop <= policy.maxRedirects; hop++) {
    if (visited.has(current.href)) throw new Error(`${policy.label} redirect loop`);
    visited.add(current.href);
    const response = await policy.fetcher(current.href, {
      headers,
      redirect: 'manual',
      signal: deadline,
    });
    if (!REDIRECT_STATUSES.has(response.status)) return { response, finalUrl: current };
    await response.body?.cancel().catch(() => {});
    if (hop === policy.maxRedirects) throw new Error(`${policy.label} exceeded redirect limit`);
    const location = response.headers.get('location');
    if (!location) throw new Error(`${policy.label} redirect is missing Location`);
    const next = validateRemoteHttpsUrl(
      new URL(location, current),
      policy.allowedOrigins,
      policy.label
    );
    if (next.origin !== current.origin) {
      headers.delete('if-none-match');
      headers.delete('if-modified-since');
    }
    current = next;
  }
  throw new Error(`${policy.label} redirect policy failed`);
}

export async function readBoundedBody(
  response: Response,
  maxBytes: number,
  label: string
): Promise<Uint8Array> {
  const encoding = response.headers.get('content-encoding');
  if (encoding && encoding.toLowerCase() !== 'identity') {
    throw new Error(`${label} content encoding is not allowed: ${encoding}`);
  }
  const declared = response.headers.get('content-length');
  if (declared) {
    const length = Number(declared);
    if (!Number.isSafeInteger(length) || length < 0)
      throw new Error(`Invalid ${label} Content-Length`);
    if (length > maxBytes) throw new Error(`${label} exceeds ${maxBytes} bytes`);
  }
  if (!response.body) throw new Error(`${label} response has no body`);
  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.byteLength;
    if (size > maxBytes) throw new Error(`${label} exceeds ${maxBytes} bytes`);
    chunks.push(chunk);
  }
  if (size === 0) throw new Error(`${label} response is empty`);
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}
