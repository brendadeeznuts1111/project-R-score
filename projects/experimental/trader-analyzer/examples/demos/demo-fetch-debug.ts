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

console.info("\n" + "═".repeat(70));
console.info("  Bun Verbose Fetch Debugging Demo");
console.info("═".repeat(70) + "\n");

// Example 1: Enable verbose fetch globally
console.info("📋 Example 1: Enable Verbose Fetch Globally");
console.info("-".repeat(70));
console.info(`Current state: ${isVerboseFetchEnabled() ? 'enabled' : 'disabled'}`);

enableVerboseFetch();
console.info(`After enable: ${isVerboseFetchEnabled() ? 'enabled' : 'disabled'}`);
console.info("\nNow all fetch() calls will output curl commands:\n");

// Example 2: Format as curl command
console.info("📋 Example 2: Format Fetch Options as Curl Command");
console.info("-".repeat(70));

const curlCommand = formatAsCurl("https://example.com", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer token123",
  },
  body: JSON.stringify({ foo: "bar", nested: { value: 42 } }),
});

console.info("Generated curl command:");
console.info(curlCommand);
console.info();

// Example 3: Debug fetch with automatic verbose logging
console.info("📋 Example 3: Debug Fetch (Automatic Verbose)");
console.info("-".repeat(70));
console.info("Making request with automatic curl output...\n");

try {
  await debugFetch("https://httpbin.org/post", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ test: "data", timestamp: Date.now() }),
  });
  console.info("\n✅ Request completed (check output above for curl command)\n");
} catch (error) {
  console.info(`\n⚠️  Request failed: ${error instanceof Error ? error.message : String(error)}\n`);
}

// Example 4: Debug fetch with inspection
console.info("📋 Example 4: Debug Fetch with Response Inspection");
console.info("-".repeat(70));

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
  
  console.info("\nResponse metadata:");
  console.info(Bun.inspect(metadata, { colors: true }));
  console.info();
} catch (error) {
  console.info(`\n⚠️  Request failed: ${error instanceof Error ? error.message : String(error)}\n`);
}

// Example 5: Environment-aware configuration
console.info("📋 Example 5: Environment-Aware Configuration");
console.info("-".repeat(70));
console.info(`NODE_ENV: ${Bun.env.NODE_ENV || 'development'}`);
console.info(`DEBUG_FETCH: ${Bun.env.DEBUG_FETCH || 'not set'}`);

configureVerboseFetch();
console.info(`Verbose fetch after auto-config: ${isVerboseFetchEnabled() ? 'enabled' : 'disabled'}`);
console.info();

// Example 6: Create persistent verbose fetch
console.info("📋 Example 6: Persistent Verbose Fetch Wrapper");
console.info("-".repeat(70));

const verboseFetch = createVerboseFetch();
console.info("Created verbose fetch wrapper (always verbose)");
console.info("Usage: await verboseFetch('https://api.example.com', options)");
console.info();

// Example 7: Disable verbose fetch
console.info("📋 Example 7: Disable Verbose Fetch");
console.info("-".repeat(70));

disableVerboseFetch();
console.info(`After disable: ${isVerboseFetchEnabled() ? 'enabled' : 'disabled'}`);
console.info();

console.info("═".repeat(70));
console.info("  Demo Complete!");
console.info("═".repeat(70));
console.info("\n💡 Tip: Set BUN_CONFIG_VERBOSE_FETCH=curl to enable globally");
console.info("💡 Tip: Use debugFetch() for one-off verbose requests");
console.info("💡 Tip: Check Bun debugger docs for syntax-highlighted source preview\n");
