#!/usr/bin/env bun
/**
 * Bun v1.3.9: NO_PROXY Environment Variable Demo
 * 
 * Demonstrates that NO_PROXY is now always respected, even with explicit proxy settings
 */

console.log("🌐 Bun v1.3.9: NO_PROXY Environment Variable Demo\n");
console.log("=" .repeat(70));

// Mock server for demonstration
async function createMockServer(port: number): Promise<{ stop: () => void; url: string }> {
  const server = Bun.serve({
    port,
    fetch(req) {
      return new Response(JSON.stringify({
        message: "Hello from mock server",
        url: req.url,
        headers: Object.fromEntries(req.headers),
      }), {
        headers: { "Content-Type": "application/json" },
      });
    },
  });

  return {
    stop: () => server.stop(),
    url: `http://localhost:${port}`,
  };
}

function showBeforeAfter() {
  console.log("\n📦 The Problem (Before v1.3.9)");
  console.log("-".repeat(70));
  console.log(`
BEFORE v1.3.9:
──────────────
// Environment: NO_PROXY=localhost

// This worked - proxy was bypassed
await fetch("http://localhost:3000/api");

// This DID NOT work - explicit proxy ignored NO_PROXY!
await fetch("http://localhost:3000/api", {
  proxy: "http://corporate-proxy:8080"  // ❌ Used proxy anyway
});

PROBLEM:
• Corporate environments often set explicit proxies
• Local development services on localhost were still proxied
• Unnecessary latency for internal services
• Some internal services couldn't be reached through proxy
`);

  console.log("\n📦 The Fix (v1.3.9+)");
  console.log("-".repeat(70));
  console.log(`
AFTER v1.3.9:
─────────────
// Environment: NO_PROXY=localhost

// Still works - proxy bypassed for localhost
await fetch("http://localhost:3000/api");

// Now also works - NO_PROXY respected even with explicit proxy!
await fetch("http://localhost:3000/api", {
  proxy: "http://corporate-proxy:8080"  // ✅ Correctly bypassed!
});

FIX:
• NO_PROXY is now ALWAYS checked
• Works with fetch() proxy option
• Works with WebSocket proxy option
• Better performance for local development
`);
}

function showNO_PROXYFormats() {
  console.log("\n" + "=".repeat(70));
  console.log("📋 NO_PROXY Format Examples");
  console.log("=".repeat(70));
  console.log(`
SYNTAX:
───────
NO_PROXY is a comma-separated list of hostnames/domains

EXAMPLES:
─────────
# Single host
NO_PROXY=localhost

# Multiple hosts
NO_PROXY=localhost,127.0.0.1,::1

# Domain suffix matching (matches all subdomains)
NO_PROXY=.internal.company.com

# IP addresses
NO_PROXY=192.168.1.1,10.0.0.0/8

# Common development setup
NO_PROXY=localhost,127.0.0.1,::1,*.local,.internal

# Complex corporate setup
NO_PROXY=localhost,127.0.0.1,::1,.company.com,.corp,192.168.0.0/16,10.0.0.0/8

MATCHING BEHAVIOR:
──────────────────
• Exact match: "localhost" matches only "localhost"
• Suffix match: ".company.com" matches "api.company.com"
• IP matching: Exact match or CIDR notation (if supported)
`);
}

function showUsageExamples() {
  console.log("\n" + "=".repeat(70));
  console.log("💻 Usage Examples");
  console.log("=".repeat(70));
  console.log(`
COMMAND LINE:
─────────────
# Run tests with NO_PROXY
NO_PROXY=localhost,127.0.0.1 bun test

# Start dev server with NO_PROXY
NO_PROXY=localhost bun run dev

# One-off command
NO_PROXY=localhost bun run script.ts

PACKAGE.JSON SCRIPTS:
─────────────────────
{
  "scripts": {
    "test": "NO_PROXY=localhost bun test",
    "dev": "NO_PROXY=localhost bun run --parallel --filter '*' dev",
    "e2e": "NO_PROXY=localhost,*.local bun playwright test"
  }
}

.ENV FILE:
──────────
# .env.development
HTTP_PROXY=http://corporate-proxy:8080
HTTPS_PROXY=http://corporate-proxy:8080
NO_PROXY=localhost,127.0.0.1,::1,*.local

CODE EXAMPLES:
──────────────
// fetch with explicit proxy - NO_PROXY still respected
await fetch("http://localhost:3000/api", {
  proxy: "http://corporate-proxy:8080"  // Bypassed for localhost!
});

// WebSocket with explicit proxy - NO_PROXY respected
const ws = new WebSocket("ws://localhost:3000/ws", {
  proxy: "http://corporate-proxy:8080"  // Bypassed for localhost!
});
`);
}

function showTestingStrategies() {
  console.log("\n" + "=".repeat(70));
  console.log("🧪 Testing NO_PROXY Behavior");
  console.log("=".repeat(70));
  console.log(`
TEST SETUP:
───────────
// no-proxy.test.ts
import { describe, test, expect } from "bun:test";

describe("NO_PROXY behavior", () => {
  test("localhost bypasses explicit proxy", async () => {
    // Start a local server
    const server = Bun.serve({
      port: 0, // Random available port
      fetch: () => new Response("OK")
    });

    try {
      // With explicit proxy, but NO_PROXY=localhost
      const response = await fetch(\`http://localhost:\${server.port}\`, {
        proxy: "http://fake-proxy:9999" // Should be bypassed
      });
      
      // If proxy was used, this would fail (fake-proxy doesn't exist)
      expect(response.status).toBe(200);
    } finally {
      server.stop();
    }
  });
});

DEBUGGING:
──────────
// Check current proxy settings
console.log("HTTP_PROXY:", process.env.HTTP_PROXY);
console.log("HTTPS_PROXY:", process.env.HTTPS_PROXY);
console.log("NO_PROXY:", process.env.NO_PROXY);

// Verify proxy behavior
const resp = await fetch("http://localhost:3000/health");
console.log("Response:", await resp.text());
`);
}

function showCommonPitfalls() {
  console.log("\n" + "=".repeat(70));
  console.log("⚠️ Common Pitfalls");
  console.log("=".repeat(70));
  console.log(`
PITFALL 1: Missing ports in NO_PROXY
────────────────────────────────────
// ❌ This won't match localhost:3000
NO_PROXY=localhost

// ✅ Use this to match all ports
NO_PROXY=localhost,127.0.0.1

PITFALL 2: Protocol in NO_PROXY
───────────────────────────────
// ❌ Don't include protocol
NO_PROXY=http://localhost

// ✅ Just the hostname
NO_PROXY=localhost

PITFALL 3: Spaces in the list
─────────────────────────────
// ❌ Spaces cause issues
NO_PROXY="localhost, 127.0.0.1"

// ✅ No spaces
NO_PROXY=localhost,127.0.0.1

PITFALL 4: Case sensitivity
───────────────────────────
// ❌ Wrong case (on some systems)
no_proxy=localhost

// ✅ Correct case
NO_PROXY=localhost

BEST PRACTICES:
───────────────
✓ Always include localhost and 127.0.0.1
✓ Add ::1 for IPv6 support
✓ Use .suffix for subdomain matching
✓ Document proxy requirements in README
✓ Test with both proxied and non-proxied URLs
`);
}

// Main
async function main() {
  console.log(`Bun version: ${Bun.version}`);
  console.log(`Platform: ${process.platform} ${process.arch}\n`);

  showBeforeAfter();
  showNO_PROXYFormats();
  showUsageExamples();
  showTestingStrategies();
  showCommonPitfalls();

  console.log("\n✅ NO_PROXY demo complete!\n");
}

if (import.meta.main) {
  main();
}

export { main };
