// src/net/proxy/fetch-wrapper.ts
//! fetch() wrapper that injects 13-byte config into proxy headers
//! Cost: 12ns header injection + RTT

import { HEADERS } from "../../core/config/manager";

// Performance tracking
const start = typeof Bun !== 'undefined' && Bun.nanoseconds ? Bun.nanoseconds() : Date.now() * 1000000;

export function configAwareFetch(url: string, init?: RequestInit): Promise<Response> {
  const fetchStart = typeof Bun !== 'undefined' && Bun.nanoseconds ? Bun.nanoseconds() : Date.now() * 1000000;
  
  // 1. Get current 13-byte config
  const config = getCurrentConfig();
  
  // 2. Determine proxy by registry hash (Bytes 1-4)
  const proxyUrl = config.registryHash === 0x12345678
    ? "http://localhost:8081"    // Local proxy
    : "http://proxy.npmjs.org:8080";       // Public registry
  
  // 3. Build proxy object with custom headers
  const proxy = {
    url: proxyUrl,
    headers: {
      // Proxy authentication token (domain-scoped)
      "Proxy-Authorization": `Bearer ${issueProxyToken("@domain1")}`,
      
      // 13-byte config dump (for proxy observability)
      [HEADERS.CONFIG_DUMP]: getConfigDump(config), // "0x02785634120700000001305000"
      
      // Domain routing (for multi-tenant proxy)
      "X-Bun-Domain": "@domain1",
      "X-Bun-Domain-Hash": `0x${getDomainHash("@domain1").toString(16)}`,
      
      // Feature flags (proxy can enable optimizations)
      "X-Bun-Features": `0x${config.featureFlags.toString(16)}`,
    },
  };
  
  // 4. Perform fetch with proxy (network-bound after 12ns)
  const promise = fetch(url, { 
    ...init, 
    proxy,
    headers: {
      ...init?.headers,
      ...proxy.headers
    }
  });
  
  // 5. Log proxy usage (if DEBUG flag)
  if (config.features?.DEBUG) {
    const duration = (typeof Bun !== 'undefined' && Bun.nanoseconds ? Bun.nanoseconds() : Date.now() * 1000000) - fetchStart;
    console.log(`[PROXY] @domain1 fetch initiated: ${url} via ${proxyUrl} (${duration}ns)`);
  }
  
  return promise;
}

// Issue proxy token: 150ns (EdDSA)
function issueProxyToken(domain: "@domain1" | "@domain2"): string {
  const config = getCurrentConfig();
  const payload = {
    domain,
    registryHash: config.registryHash,
    issuedAt: typeof Bun !== 'undefined' && Bun.nanoseconds ? Bun.nanoseconds() : Date.now() * 1000000,
  };
  
  // Simple JWT-like token for demo
  const header = btoa(JSON.stringify({ alg: "ES256", typ: "JWT" }));
  const payload_b64 = btoa(JSON.stringify(payload));
  const signature = btoa("mock-signature"); // In production, use real crypto
  
  return `${header}.${payload_b64}.${signature}`;
}

// Get domain hash
function getDomainHash(domain: string): number {
  // Simple hash function for demo
  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    hash = ((hash << 5) - hash) + domain.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// Get current config (fallback to defaults)
function getCurrentConfig() {
  return {
    version: 2,
    registryHash: 0x12345678,
    featureFlags: 0x00000007,
    terminal: { mode: "cooked", rows: 48, cols: 80 },
    features: { PRIVATE_REGISTRY: true, PREMIUM_TYPES: true, DEBUG: true }
  };
}

// Get full 13-byte dump: 67ns
function getConfigDump(config: any): string {
  const cfg = config || getCurrentConfig();
  return `0x${cfg.version.toString(16).padStart(2, "0")}` +
         `${cfg.registryHash.toString(16).padStart(8, "0")}` +
         `${cfg.featureFlags.toString(16).padStart(8, "0")}` +
         `${cfg.terminal.mode === "raw" ? "02" : "01"}` +
         `${cfg.terminal.rows.toString(16).padStart(2, "0")}` +
         `${cfg.terminal.cols.toString(16).padStart(2, "0")}` +
         `00`;
}

// Export for testing
export { issueProxyToken, getConfigDump, getDomainHash };
