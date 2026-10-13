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
  signal.throwIfAborted();
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
  return addresses.map(({ address, family }) => ({ address, family }));
}

/** Race only approved addresses from one DNS snapshot; preserve TLS identity and HTTP Host. */
export async function fetchPinnedHttps(
  url: URL,
  headers: Headers,
  signal: AbortSignal,
  resolver?: RemoteResolver,
  transport: typeof fetch = fetch
): Promise<Response> {
  const addresses = await resolvePublicRemoteAddresses(url.hostname, signal, resolver);
  const hostname = normalizeAuthorityHost(url.hostname);
  const requestHeaders = new Headers(headers);
  requestHeaders.set('host', url.host);
  // Both spellings work on pinned Bun 1.4.3; its installed types expose camelCase only.
  const tls = { serverName: hostname, servername: hostname, rejectUnauthorized: true };
  signal.throwIfAborted();
  return new Promise<Response>((resolve, reject) => {
    const attempts: AbortController[] = [];
    const errors: unknown[] = [];
    let next = 0;
    let active = 0;
    let settled = false;
    let stagger: ReturnType<typeof setTimeout> | undefined;
    const cleanup = () => {
      clearTimeout(stagger);
      signal.removeEventListener('abort', abort);
    };
    const abort = () => {
      if (settled) return;
      settled = true;
      cleanup();
      for (const attempt of attempts) attempt.abort(signal.reason);
      reject(signal.reason);
    };
    const beginNext = () => {
      clearTimeout(stagger);
      if (settled || signal.aborted) {
        if (signal.aborted) abort();
        return;
      }
      const address = addresses[next++];
      if (!address) return;
      const controller = new AbortController();
      attempts.push(controller);
      active++;
      const pinned = new URL(url);
      pinned.hostname = address.family === 6 ? `[${address.address}]` : address.address;
      const attemptSignal = AbortSignal.any([signal, controller.signal]);
      Promise.resolve()
        .then(() => {
          attemptSignal.throwIfAborted();
          return transport(pinned.href, {
            headers: new Headers(requestHeaders),
            signal: attemptSignal,
            redirect: 'manual',
            tls,
            // Pinned Bun types omit documented proxy:false; verified on 1.4.3.
            proxy: false as unknown as BunFetchRequestInit['proxy'],
            keepalive: false,
          });
        })
        .then(
          response => {
            if (settled) {
              void response.body?.cancel().catch(() => {});
              return;
            }
            // Any HTTP response wins, including errors and redirects: never retry HTTP status codes.
            settled = true;
            cleanup();
            for (const attempt of attempts) if (attempt !== controller) attempt.abort();
            resolve(response);
          },
          error => {
            if (settled) return;
            errors.push(error);
            active--;
            if (signal.aborted) {
              abort();
              return;
            }
            if (next < addresses.length) beginNext();
            else if (active === 0) {
              settled = true;
              cleanup();
              reject(new AggregateError(errors, 'All approved remote addresses failed'));
            }
          }
        );
      // A stalled address must not consume the whole shared deadline before fallback starts.
      if (next < addresses.length) stagger = setTimeout(beginNext, 50);
    };
    signal.addEventListener('abort', abort, { once: true });
    beginNext();
  });
}
