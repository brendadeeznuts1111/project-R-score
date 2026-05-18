/**
 * Proxy configuration for corporate environments.
 * Uses secrets or env for auth; prefers secrets over env.
 */

import { getProxyConfig } from "../config";

export interface ProxyConfig {
  url: string;
  headers?: Record<string, string>;
}

export function getNetworkProxyConfig(): ProxyConfig | undefined {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  if (!proxyUrl) return undefined;

  const proxyCreds = getProxyConfig();

  return {
    url: proxyUrl,
    headers: {
      ...((proxyCreds.AUTH || process.env.PROXY_AUTH) && {
        "Proxy-Authorization": proxyCreds.AUTH || process.env.PROXY_AUTH!,
      }),
      ...(process.env.CORPORATE_ID && {
        "X-Corporate-ID": process.env.CORPORATE_ID,
      }),
    },
  };
}
