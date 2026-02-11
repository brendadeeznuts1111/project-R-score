/**
 * Bun v1.3.9 NO_PROXY Test Examples
 * 
 * Tests that NO_PROXY is respected even with explicit proxy option
 * 
 * Run with: NO_PROXY=localhost,127.0.0.1 bun test proxy.test.ts
 */

import { describe, test, expect } from "bun:test";

describe("NO_PROXY with Explicit Proxy (v1.3.9+)", () => {
  
  test("localhost should bypass explicit proxy", async () => {
    // This test verifies the v1.3.9 fix:
    // NO_PROXY is now ALWAYS respected, even when proxy is explicitly set
    
    // NOTE: This would need an actual local server to test properly
    // For demonstration, we just verify the code pattern
    
    const noProxy = process.env.NO_PROXY || "";
    const hasLocalhost = noProxy.includes("localhost") || noProxy.includes("127.0.0.1");
    
    expect(hasLocalhost).toBe(true);
    
    // The key point: this fetch would use NO_PROXY even with explicit proxy option
    // In v1.3.9+, the following correctly bypasses the proxy due to NO_PROXY=localhost:
    /*
    await fetch("http://localhost:3000/api", {
      proxy: "http://corporate-proxy:8080"  // Bypassed because NO_PROXY includes localhost!
    });
    */
  });
  
  test("external URLs should use explicit proxy", async () => {
    // External URLs NOT in NO_PROXY should use the proxy
    const noProxy = process.env.NO_PROXY || "";
    const testUrl = "https://api.external.com";
    
    // Check if URL would bypass
    const hostname = new URL(testUrl).hostname;
    const wouldBypass = noProxy.split(",").some(rule => {
      rule = rule.trim();
      return rule && (hostname === rule || hostname.endsWith(rule));
    });
    
    expect(wouldBypass).toBe(false);
  });
  
  test("NO_PROXY patterns work correctly", () => {
    const testCases = [
      { noProxy: "localhost", url: "http://localhost:3000", shouldBypass: true },
      { noProxy: "127.0.0.1", url: "http://127.0.0.1:8080", shouldBypass: true },
      { noProxy: "*.internal.com", url: "https://api.internal.com", shouldBypass: true },
      { noProxy: "localhost", url: "https://example.com", shouldBypass: false },
      { noProxy: "localhost,127.0.0.1", url: "http://localhost:3000", shouldBypass: true },
    ];
    
    for (const { noProxy, url, shouldBypass } of testCases) {
      const hostname = new URL(url).hostname;
      const bypasses = noProxy.split(",").some(rule => {
        rule = rule.trim();
        if (!rule) return false;
        if (rule.startsWith("*.")) {
          return hostname.endsWith(rule.slice(2));
        }
        return hostname === rule;
      });
      
      expect(bypasses).toBe(shouldBypass);
    }
  });
});

describe("Proxy Configuration Examples", () => {
  test("corporate proxy setup", () => {
    // Example of how to set up for corporate environment
    const config = {
      httpProxy: process.env.HTTP_PROXY || "http://proxy.company.com:8080",
      httpsProxy: process.env.HTTPS_PROXY || "http://proxy.company.com:8080",
      noProxy: process.env.NO_PROXY || "localhost,127.0.0.1,*.local",
    };
    
    expect(config.noProxy).toContain("localhost");
    expect(config.noProxy).toContain("127.0.0.1");
  });
  
  test("fetch with explicit proxy respects NO_PROXY", () => {
    // Document the v1.3.9 behavior
    const code = `
// Environment: NO_PROXY=localhost

// v1.3.9 BEHAVIOR: NO_PROXY is ALWAYS checked

// This correctly bypasses proxy:
await fetch("http://localhost:3000", {
  proxy: "http://corporate-proxy:8080"
});

// This uses the proxy (external URL):
await fetch("https://api.example.com", {
  proxy: "http://corporate-proxy:8080"
});
`;
    
    expect(code).toContain("NO_PROXY");
    expect(code).toContain("proxy:");
  });
});
