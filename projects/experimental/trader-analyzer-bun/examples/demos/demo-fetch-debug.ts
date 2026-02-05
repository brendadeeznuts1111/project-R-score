#!/usr/bin/env bun
/**
 * @fileoverview Demo showcasing Bun's verbose fetch logging with curl output
 * @description Demonstrates Bun's verbose fetch debugging capabilities including curl output formatting, fetch inspection, and debugging utilities.
 * @module examples/demos/demo-fetch-debug
 * 
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-EXAMPLE@6.4.1.0.0.0.0;instance-id=EXAMPLE-FETCH-DEBUG-001;version=6.4.1.0.0.0.0}]
 * [PROPERTIES:{example={value:"Fetch Debug Demo";@root:"ROOT-EXAMPLES";@chain:["BP-EXAMPLES","BP-DEMO"];@version:"6.4.1.0.0.0.0"}}]
 * [CLASS:FetchDebugDemo][#REF:v-6.4.1.0.0.0.0.BP.EXAMPLES.DEMO.1.0.A.1.1.EXAMPLE.1.1]]
 * 
 * Version: 6.4.1.0.0.0.0
 * Ripgrep Pattern: 6\.4\.1\.0\.0\.0\.0|EXAMPLE-FETCH-DEBUG-001|BP-EXAMPLE@6\.4\.1\.0\.0\.0\.0
 * 
 * @example 6.4.1.0.0.0.0.1: Verbose Fetch Logging
 * // Test Formula:
 * // 1. Enable verbose fetch globally
 * // 2. Make fetch request
 * // 3. Verify curl-formatted output
 * // Expected Result: Fetch requests logged with curl output format
 * //
 * // Snippet:
 * ```typescript
 * enableVerboseFetch();
 * await fetch('https://example.com');
 * ```
 * 
 * @see {@link https://bun.com/docs/runtime/debugger#syntax-highlighted-source-code-preview Bun Debugger Documentation}
 * 
 * // Ripgrep: 6.4.1.0.0.0.0
 * // Ripgrep: EXAMPLE-FETCH-DEBUG-001
 * // Ripgrep: BP-EXAMPLE@6.4.1.0.0.0.0
 */

import {
  enableVerboseFetch,
  disableVerboseFetch,
  isVerboseFetchEnabled,
  debugFetch,
  debugFetchWithInspection,
  configureVerboseFetch,
  createVerboseFetch,
  formatAsCurl,
} from "../src/utils/fetch-debug";

console.log("\n" + "═".repeat(70));
console.log("  Bun Verbose Fetch Debugging Demo");
console.log("═".repeat(70) + "\n");

// Example 1: Enable verbose fetch globally
console.log("📋 Example 1: Enable Verbose Fetch Globally");
console.log("-".repeat(70));
console.log(`Current state: ${isVerboseFetchEnabled() ? 'enabled' : 'disabled'}`);

enableVerboseFetch();
console.log(`After enable: ${isVerboseFetchEnabled() ? 'enabled' : 'disabled'}`);
console.log("\nNow all fetch() calls will output curl commands:\n");

// Example 2: Format as curl command
console.log("📋 Example 2: Format Fetch Options as Curl Command");
console.log("-".repeat(70));

const curlCommand = formatAsCurl("https://example.com", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer token123",
  },
  body: JSON.stringify({ foo: "bar", nested: { value: 42 } }),
});

console.log("Generated curl command:");
console.log(curlCommand);
console.log();

// Example 3: Debug fetch with automatic verbose logging
console.log("📋 Example 3: Debug Fetch (Automatic Verbose)");
console.log("-".repeat(70));
console.log("Making request with automatic curl output...\n");

try {
  await debugFetch("https://httpbin.org/post", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ test: "data", timestamp: Date.now() }),
  });
  console.log("\n✅ Request completed (check output above for curl command)\n");
} catch (error) {
  console.log(`\n⚠️  Request failed: ${error instanceof Error ? error.message : String(error)}\n`);
}

// Example 4: Debug fetch with inspection
console.log("📋 Example 4: Debug Fetch with Response Inspection");
console.log("-".repeat(70));

try {
  const { response, metadata } = await debugFetchWithInspection(
    "https://httpbin.org/get",
    {
      headers: {
        "User-Agent": "Bun-Fetch-Debug/1.0",
      },
    },
    true // logResponse
  );
  
  console.log("\nResponse metadata:");
  console.log(Bun.inspect(metadata, { colors: true }));
  console.log();
} catch (error) {
  console.log(`\n⚠️  Request failed: ${error instanceof Error ? error.message : String(error)}\n`);
}

// Example 5: Environment-aware configuration
console.log("📋 Example 5: Environment-Aware Configuration");
console.log("-".repeat(70));
console.log(`NODE_ENV: ${Bun.env.NODE_ENV || 'development'}`);
console.log(`DEBUG_FETCH: ${Bun.env.DEBUG_FETCH || 'not set'}`);

configureVerboseFetch();
console.log(`Verbose fetch after auto-config: ${isVerboseFetchEnabled() ? 'enabled' : 'disabled'}`);
console.log();

// Example 6: Create persistent verbose fetch
console.log("📋 Example 6: Persistent Verbose Fetch Wrapper");
console.log("-".repeat(70));

const verboseFetch = createVerboseFetch();
console.log("Created verbose fetch wrapper (always verbose)");
console.log("Usage: await verboseFetch('https://api.example.com', options)");
console.log();

// Example 7: Disable verbose fetch
console.log("📋 Example 7: Disable Verbose Fetch");
console.log("-".repeat(70));

disableVerboseFetch();
console.log(`After disable: ${isVerboseFetchEnabled() ? 'enabled' : 'disabled'}`);
console.log();

console.log("═".repeat(70));
console.log("  Demo Complete!");
console.log("═".repeat(70));
console.log("\n💡 Tip: Set BUN_CONFIG_VERBOSE_FETCH=curl to enable globally");
console.log("💡 Tip: Use debugFetch() for one-off verbose requests");
console.log("💡 Tip: Check Bun debugger docs for syntax-highlighted source preview\n");
