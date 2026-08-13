// @see https://bun.com/docs/runtime/networking/fetch#proxying-requests — fetch proxy option
// @see https://bun.com/docs/guides/http/proxy — proxy guide (env vars, custom headers)
// @see https://bun.com/blog/bun-v1.3.12#bun-apis — runtime proxy env mutation
// @see https://bun.com/blog/bun-v1.3.12#keep-alive-for-https-proxy-connect-tunnels — CONNECT tunnel pooling
/**
 * Bun fetch `proxy` option — all three documented forms.
 *
 * ```ts
 * await fetch(url, { proxy: "https://user:pass@proxy.example.com:8080" });
 * await fetch(url, { proxy: new URL("http://proxy:8080") });
 * await fetch(url, {
 *   proxy: {
 *     url: "https://proxy.example.com:8080",
 *     headers: { "Proxy-Authorization": "Bearer my-token", "X-Proxy-Region": "us-east-1" },
 *   },
 * });
 * ```
 *
 * Notes verified against Bun 1.4.0:
 * - `Proxy-Authorization` in `headers` overrides credentials embedded in the URL.
 * - Custom headers go to the proxy: in the request for HTTP targets, in CONNECT for HTTPS.
 * - `http://` and `https://` proxies are both supported.
 * - Bun ≥1.3.12 pools HTTPS CONNECT tunnels only when every reuse dimension below is equal.
 */
export type FetchProxyOptions =
  | string
  | URL
  | {
      /** Proxy URL, `http://` or `https://`; may embed username:password. */
      url: string | URL;
      /** Headers sent to the proxy (Proxy-Authorization overrides URL credentials). */
      headers?: Bun.HeadersInit;
    };

/** Pool-key dimensions documented by Bun's v1.3.12 HTTPS CONNECT release note. */
export const BUN_V1_3_12_HTTPS_PROXY_POOL_KEY_DIMENSIONS = [
  'proxy-host-port',
  'proxy-credentials',
  'target-host-port',
  'tls-configuration',
] as const;

export type BunV1312HttpsProxyPoolKeyDimension =
  (typeof BUN_V1_3_12_HTTPS_PROXY_POOL_KEY_DIMENSIONS)[number];

export type BunFetchProxyEnvKey =
  'HTTP_PROXY' | 'http_proxy' | 'HTTPS_PROXY' | 'https_proxy' | 'NO_PROXY' | 'no_proxy';

export type BunFetchProxyEnvRole = 'http-proxy' | 'https-proxy' | 'bypass';

export type BunFetchProxyEnvContract = {
  /** Canonical spelling used by project documentation and catalog lookup. */
  readonly key: Extract<BunFetchProxyEnvKey, Uppercase<BunFetchProxyEnvKey>>;
  /** Bun-compatible lowercase spelling. */
  readonly alias: Extract<BunFetchProxyEnvKey, Lowercase<BunFetchProxyEnvKey>>;
  readonly role: BunFetchProxyEnvRole;
  /** Behavior when neither spelling has a non-empty value. */
  readonly defaultBehavior: 'no-proxy-from-this-key' | 'no-bypass';
  /** Runtime-observed conflict rule; contributors should still avoid conflicting values. */
  readonly conflictPrecedence: 'lowercase-non-empty-wins';
  /** Bun 1.3.12+ reads mutations before the next fetch. */
  readonly refresh: 'next-fetch';
  readonly valueShape: 'absolute-http-or-https-url' | 'host-match-list-or-wildcard';
  readonly docsUrl: string;
};

/**
 * Runtime `fetch()` proxy environment SSOT.
 *
 * This registry describes Bun's native behavior; it must not be used to copy
 * proxy credentials into logs, generated registry artifacts, or diagnostics.
 * Lowercase precedence is verified by the local Bun 1.3.14 contract test.
 */
export const BUN_FETCH_PROXY_ENV_REGISTRY = [
  {
    key: 'HTTP_PROXY',
    alias: 'http_proxy',
    role: 'http-proxy',
    defaultBehavior: 'no-proxy-from-this-key',
    conflictPrecedence: 'lowercase-non-empty-wins',
    refresh: 'next-fetch',
    valueShape: 'absolute-http-or-https-url',
    docsUrl: 'https://bun.com/docs/guides/http/proxy#environment-variables',
  },
  {
    key: 'HTTPS_PROXY',
    alias: 'https_proxy',
    role: 'https-proxy',
    defaultBehavior: 'no-proxy-from-this-key',
    conflictPrecedence: 'lowercase-non-empty-wins',
    refresh: 'next-fetch',
    valueShape: 'absolute-http-or-https-url',
    docsUrl: 'https://bun.com/docs/guides/http/proxy#environment-variables',
  },
  {
    key: 'NO_PROXY',
    alias: 'no_proxy',
    role: 'bypass',
    defaultBehavior: 'no-bypass',
    conflictPrecedence: 'lowercase-non-empty-wins',
    refresh: 'next-fetch',
    valueShape: 'host-match-list-or-wildcard',
    docsUrl: 'https://bun.com/blog/bun-v1.3.12#bun-apis',
  },
] as const satisfies readonly BunFetchProxyEnvContract[];

/** Type guard for the object form. */
export function isProxyObjectForm(
  proxy: FetchProxyOptions
): proxy is { url: string | URL; headers?: Bun.HeadersInit } {
  return typeof proxy === 'object' && proxy !== null && 'url' in proxy;
}
