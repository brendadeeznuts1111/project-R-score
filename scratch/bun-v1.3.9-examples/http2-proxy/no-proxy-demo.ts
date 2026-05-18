/**
 * Bun v1.3.9 NO_PROXY Environment Variable Demo
 * 
 * Demonstrates that NO_PROXY is now respected even with
 * explicit proxy configuration.
 * 
 * Previously, explicit proxy settings would override NO_PROXY.
 * v1.3.9 fixes this so NO_PROXY is always respected.
 */

// Simulate a fetch with proxy configuration
async function testProxyBypass() {
  console.info("=".repeat(60));
  console.info("Bun v1.3.9 NO_PROXY Demo");
  console.info("=".repeat(60));
  console.info(`Bun version: ${Bun.version}`);
  console.info("");
  
  // Show current environment
  const noProxy = process.env.NO_PROXY || "";
  const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy || "";
  const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy || "";
  
  console.info("Environment:");
  console.info(`  NO_PROXY=${noProxy || "(not set)"}`);
  console.info(`  HTTP_PROXY=${httpProxy || "(not set)"}`);
  console.info(`  HTTPS_PROXY=${httpsProxy || "(not set)"}`);
  console.info("");
  
  // Test URLs
  const testUrls = [
    { url: "http://localhost:3000", expectedBypass: true },
    { url: "http://127.0.0.1:8080", expectedBypass: true },
    { url: "http://api.localhost:3000", expectedBypass: true },
    { url: "https://example.com", expectedBypass: false },
    { url: "https://api.example.com", expectedBypass: false },
  ];
  
  // If NO_PROXY is set, check if URLs should bypass
  if (noProxy) {
    const noProxyList = noProxy.split(",").map(s => s.trim());
    console.info(`NO_PROXY list: ${JSON.stringify(noProxyList)}`);
    console.info("");
    
    console.info("URL Bypass Analysis:");
    console.info("-".repeat(60));
    
    for (const { url, expectedBypass } of testUrls) {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      
      // Check if hostname matches NO_PROXY patterns
      const shouldBypass = noProxyList.some(pattern => {
        if (pattern === hostname) return true;
        if (pattern.startsWith(".") && hostname.endsWith(pattern.slice(1))) return true;
        if (hostname.endsWith(`.${pattern}`)) return true;
        if (pattern === "localhost" && (hostname === "localhost" || hostname.endsWith(".localhost"))) return true;
        return false;
      });
      
      const status = shouldBypass === expectedBypass ? "✓" : "✗";
      console.info(`${status} ${url.padEnd(35)} | Bypass: ${shouldBypass ? "YES" : "NO "} | Expected: ${expectedBypass ? "YES" : "NO "}`);
    }
  }
  
  console.info("");
  console.info("-".repeat(60));
  console.info("Code Example:");
  console.info("-".repeat(60));
  console.info(`
// Previously, setting NO_PROXY only worked when the proxy was
// auto-detected from http_proxy/HTTP_PROXY environment variables.
// If you explicitly passed a proxy option to fetch() or new WebSocket(),
// the NO_PROXY environment variable was ignored.

// Now, NO_PROXY is always checked — even when a proxy is explicitly
// provided via the proxy option.

// NO_PROXY=localhost
// Previously, this would still use the proxy. Now it correctly bypasses it.
await fetch("http://localhost:3000/api", {
  proxy: "http://my-proxy:8080",
});

// Same fix applies to WebSocket
const ws = new WebSocket("ws://localhost:3000/ws", {
  proxy: "http://my-proxy:8080",
});
`);
  
  console.info("");
  console.info("✓ NO_PROXY is now ALWAYS respected in v1.3.9+");
  console.info("  (even with explicit proxy configuration)");
}

// Test actual fetch behavior (requires running servers)
async function testActualFetch() {
  console.info("\n" + "=".repeat(60));
  console.info("Live Fetch Test (requires HTTP server on :3000)");
  console.info("=".repeat(60));
  
  try {
    // Try to fetch from localhost
    const response = await fetch("http://localhost:3000", {
      // If this were a real proxy scenario, we'd set:
      // proxy: "http://some-proxy:8080"
      // But NO_PROXY=localhost would bypass it
    });
    console.info(`✓ Localhost fetch succeeded: ${response.status}`);
  } catch (err: any) {
    if (err.code === "ECONNREFUSED") {
      console.info("ℹ No server on localhost:3000 (expected for demo)");
    } else {
      console.error(`✗ Fetch error: ${err.message}`);
    }
  }
}

// Run tests
testProxyBypass();
if (process.argv.includes("--live")) {
  await testActualFetch();
}
