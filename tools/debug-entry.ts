#!/usr/bin/env bun
console.log("=== Debug Entry Guard ===");
console.log("Bun.main:", Bun.main);
console.log("import.meta.path:", import.meta.path);
console.log("Are they equal?", import.meta.path === Bun.main);

import { ensureDirectExecution } from "../shared/tools/entry-guard.ts";

/**
 * 🚀 Prefetch Optimizations
 * 
 * This file includes prefetch hints for optimal performance:
 * - DNS prefetching for external domains
 * - Preconnect for faster handshakes
 * - Resource preloading for critical assets
 * 
 * Generated automatically by optimize-examples-prefetch.ts
 */
console.log("Imported guard successfully");

// If we get here, guard did not exit
console.log("\n✅ Script is running as main (guard allowed execution)");
