#!/usr/bin/env bun

/**
 * Fetch Proxy Headers Example
 * 
 * Demonstrates the new object format for proxy configuration with custom headers.
 * This is useful for:
 * - Proxy authentication tokens
 * - Custom routing headers
 * - Proxy-specific configuration
 */

// String format (backward compatible)
export async function fetchWithStringProxy(url: string) {
  const response = await fetch(url, {
    proxy: "http://proxy.example.com:8080",
  });
  return response;
}

// Object format with custom headers
export async function fetchWithProxyHeaders(url: string) {
  const response = await fetch(url, {
    proxy: {
      url: "http://proxy.example.com:8080",
      headers: {
        "Proxy-Authorization": "Bearer token",
        "X-Custom-Proxy-Header": "value",
      },
    },
  });
  return response;
}

// Proxy-Authorization takes precedence over URL credentials
export async function fetchWithAuthPrecedence(url: string) {
  const response = await fetch(url, {
    proxy: {
      url: "http://user:pass@proxy.example.com:8080", // These are ignored
      headers: {
        "Proxy-Authorization": "Bearer override-token", // This takes precedence
      },
    },
  });
  return response;
}

// Example: Using with different proxy types
export const PROXY_EXAMPLES = {
  // HTTP proxy with authentication
  authenticated: {
    url: "http://proxy.example.com:8080",
    headers: {
      "Proxy-Authorization": "Basic " + Buffer.from("user:pass").toString("base64"),
    },
  },

  // HTTPS proxy with custom routing
  customRouting: {
    url: "https://proxy.example.com:8443",
    headers: {
      "X-Routing-Header": "region-us-east",
      "X-Request-ID": "unique-id",
    },
  },

  // SOCKS proxy (if supported)
  socks: {
    url: "socks5://proxy.example.com:1080",
    headers: {
      "Proxy-Authorization": "Bearer token",
    },
  },
};

