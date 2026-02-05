#!/usr/bin/env bun
console.log("=== Debug Entry Guard ===");
console.log("Bun.main:", Bun.main);
console.log("import.meta.path:", import.meta.path);
console.log("Are they equal?", import.meta.path === Bun.main);

import { ensureDirectExecution } from "./shared/tools/entry-guard.ts";
console.log("Imported guard successfully");

// If we get here, guard did not exit
console.log("\n✅ Script is running as main (guard allowed execution)");