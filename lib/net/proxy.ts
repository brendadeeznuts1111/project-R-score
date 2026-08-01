// @see https://bun.com/docs/runtime/networking/fetch#proxying-requests — fetch proxy option
// @see https://bun.com/docs/guides/http/proxy — proxy guide (env vars, custom headers)
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

/** Type guard for the object form. */
export function isProxyObjectForm(
  proxy: FetchProxyOptions
): proxy is { url: string | URL; headers?: Bun.HeadersInit } {
  return typeof proxy === 'object' && proxy !== null && 'url' in proxy;
}
