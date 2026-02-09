#!/usr/bin/env bun

export type CookieMapLike = {
  size: number;
  keys(): IterableIterator<string> | Iterable<string>;
};

export type R2BucketLike = {
  put(key: string, value: string): Promise<unknown> | unknown;
};

export async function storeCookieTelemetry(
  domain: string,
  cookies: CookieMapLike,
  bucket: R2BucketLike,
  nowMs: number = Date.now()
): Promise<void> {
  const normalizedDomain = String(domain || '').trim().toLowerCase();
  if (!normalizedDomain) {
    throw new Error('domain is required');
  }

  const keys = Array.from(cookies.keys()).map((key) => String(key));
  const labels = normalizedDomain.split('.');
  const subdomains = labels.length > 2 ? labels.slice(0, -2) : [];

  const ctx = {
    secure: true,
    httpOnly: true,
    sameSite: 'strict',
    domain: normalizedDomain,
  };

  const state = {
    subdomains,
    active: cookies.size > 0,
  };

  const payload = {
    timestamp: nowMs,
    cookies: cookies.size,
    keys,
  };

  await Promise.all([
    bucket.put(`cookies/${normalizedDomain}/secure_domain_ctx`, JSON.stringify(ctx)),
    bucket.put(`cookies/${normalizedDomain}/secure_subdomain_state`, JSON.stringify(state)),
    bucket.put(`cookies/${normalizedDomain}/latest_payload`, JSON.stringify(payload)),
  ]);
}
