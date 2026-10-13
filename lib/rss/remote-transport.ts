// @see https://bun.com/docs/runtime/networking/dns — DNS answers are not an egress policy
// @see https://bun.com/blog/bun-v1.4.1#fetch-verifies-tls-against-the-url-not-the-host-header
// @see https://bun.com/guides/http/proxy#environment-variables — proxy:false bypasses ambient proxies
import { normalizeAuthorityHost, resolveAuthorityAddresses } from '../http/ip-authority.ts';
import { isIP } from 'node:net';
import { isPublicRemoteAddress } from './remote-address.ts';

export type RemoteAddress = { address: string; family: number };
export type RemoteResolver = (hostname: string) => Promise<RemoteAddress[]>;

async function beforeDeadline<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  signal.throwIfAborted();
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener('abort', abort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}

/** Reject the entire answer set if any answer is nonpublic; never check then re-resolve. */
export async function resolvePublicRemoteAddresses(
  hostname: string,
  signal: AbortSignal,
  resolver: RemoteResolver = hostname => resolveAuthorityAddresses(hostname)
): Promise<RemoteAddress[]> {
  const host = normalizeAuthorityHost(hostname);
  const literalFamily = isIP(host);
  const addresses = literalFamily
    ? [{ address: host, family: literalFamily }]
    : await beforeDeadline(resolver(host), signal);
  signal.throwIfAborted();
  if (
    addresses.length === 0 ||
    addresses.some(
      ({ address, family }) => !isPublicRemoteAddress(address) || isIP(address) !== family
    )
  )
    throw new Error('Remote DNS resolved to a prohibited or invalid address');
  return addresses;
}

/** Native transport connects to one approved IP, retaining original TLS identity and HTTP Host. */
export async function fetchPinnedHttps(
  url: URL,
  headers: Headers,
  signal: AbortSignal,
  resolver?: RemoteResolver,
  transport: typeof fetch = fetch
): Promise<Response> {
  const addresses = await resolvePublicRemoteAddresses(url.hostname, signal, resolver);
  const address = addresses[0];
  if (!address) throw new Error('Remote DNS returned no address');
  const hostname = normalizeAuthorityHost(url.hostname);
  const pinned = new URL(url);
  pinned.hostname = address.family === 6 ? `[${address.address}]` : address.address;
  const requestHeaders = new Headers(headers);
  requestHeaders.set('host', url.host);
  // Both spellings work on pinned Bun 1.4.3; its installed types expose camelCase only.
  const tls = { serverName: hostname, servername: hostname, rejectUnauthorized: true };
  return transport(pinned.href, {
    headers: requestHeaders,
    signal,
    redirect: 'manual',
    tls,
    // Pinned Bun types omit documented proxy:false; this narrow override is verified on 1.4.3.
    proxy: false as unknown as BunFetchRequestInit['proxy'],
    keepalive: false,
  });
}
