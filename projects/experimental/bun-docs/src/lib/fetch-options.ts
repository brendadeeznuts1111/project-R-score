/**
 * Shared Bun fetch options builder.
 *
 * Used by both the dry-run connection tester and the main documentation fetcher.
 * Supports the full range of Bun-specific fetch extensions:
 *   - verbose
 *   - proxy
 *   - TLS (insecure, custom CA, client certificates)
 */

export interface FetchOptions {
  verbose?: boolean;
  timeout?: number;
  proxy?: string;
  insecure?: boolean;
  tlsCa?: string;
  tlsCert?: string;
  tlsKey?: string;
}

export interface BunFetchOptionsInput extends FetchOptions {
  userAgent?: string;
  accept?: string;
}

/**
 * Builds a fetch options object with Bun extensions (verbose, proxy, tls).
 * This function is pure enough to be easily unit tested.
 */
export async function buildBunFetchOptions(
  input: BunFetchOptionsInput = {}
): Promise<any> {
  const {
    verbose = false,
    proxy,
    insecure = false,
    tlsCa,
    tlsCert,
    tlsKey,
    userAgent = "BunDocs/1.0 (+https://github.com/bun-docs)",
    accept = "text/plain, text/markdown, */*",
  } = input;

  const fetchOptions: any = {
    headers: {
      "User-Agent": userAgent,
      "Accept": accept,
    },
  };

  if (verbose) fetchOptions.verbose = true;
  if (proxy) fetchOptions.proxy = proxy;

  // TLS (client certificates, custom CA, self-signed dev certs)
  const tlsOptions: { rejectUnauthorized?: boolean; ca?: string; cert?: string; key?: string } = {};
  if (insecure) tlsOptions.rejectUnauthorized = false;
  if (tlsCa) tlsOptions.ca = await Bun.file(tlsCa).text();
  if (tlsCert) tlsOptions.cert = await Bun.file(tlsCert).text();
  if (tlsKey) tlsOptions.key = await Bun.file(tlsKey).text();

  if (Object.keys(tlsOptions).length > 0) {
    fetchOptions.tls = tlsOptions;
  }

  return fetchOptions;
}
