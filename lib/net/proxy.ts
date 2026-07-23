// @see https://bun.com/docs/runtime/networking/fetch#proxying-requests — fetch proxy option
// @see https://bun.com/docs/guides/http/proxy — proxy guide (env vars, custom headers)
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
 */
export type FetchProxyOptions =
  | string
  | URL
  | {
      /** Proxy URL, `http://` or `https://`; may embed username:password. */
      url: string | URL;
      /** Headers sent to the proxy (Proxy-Authorization overrides URL credentials). */
      headers?: Record<string, string> | Headers;
    };

/** Type guard for the object form. */
export function isProxyObjectForm(
  proxy: FetchProxyOptions
): proxy is { url: string | URL; headers?: Record<string, string> | Headers } {
  return typeof proxy === 'object' && proxy !== null && 'url' in proxy;
}
