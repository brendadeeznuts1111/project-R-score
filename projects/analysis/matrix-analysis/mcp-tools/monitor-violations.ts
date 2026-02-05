#!/usr/bin/env bun
// mcp-tools/monitor-violations.ts — CLI violation monitoring tool

// Import the SSE alerts functionality
import { runViolationMonitor } from './sse-alerts.js';

// Parse command line arguments
const args = {
  tenant: process.argv.find(a => a.startsWith("--tenant="))?.split("=")[1] || "*",
  severity: process.argv.find(a => a.startsWith("--severity="))?.split("=")[1] || "warning"
};

// Display usage information
function showUsage() {
  console.log(`
🔴 Tier-1380 Violation Monitor

Usage:
  bun run monitor-violations.ts [options]

Options:
  --tenant=<name>     Monitor specific tenant (default: *)
  --severity=<level>  Filter by severity: warning|critical|all (default: warning)

Examples:
  bun run monitor-violations.ts                    # All tenants, warnings+
  bun run monitor-violations.ts --tenant=acme     # Specific tenant
  bun run monitor-violations.ts --severity=critical # Critical only
  bun run monitor-violations.ts --severity=all     # All violations

Output Format:
  TENANT       │ FILE:LINE │ COLS │ PREVIEW
  ──────────────────────────────────────────────────

Colors:
  🟡 Yellow = Warning (>89 cols)
  🔴 Red    = Critical (>100 cols)

Press Ctrl+C to stop monitoring.
`);
}

// Check for help flag
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showUsage();
  process.exit(0);
}

// Start the monitor
console.log(`🔴 Tier-1380 Live Violation Monitor`);
console.log(`📊 Tenant: ${args.tenant} | Severity: ${args.severity}`);
console.log(`🔌 Connecting to: http://localhost:1381/mcp/alerts/stream`);
console.log("=".repeat(89));

// Add column headers
console.log(`\x1b[36m${"TENANT".padEnd(12)} │ ${"FILE:LINE".padStart(12)} │ ${"COLS".padStart(3)} │ PREVIEW\x1b[0m`);
console.log("─".repeat(89));

// Handle connection errors gracefully
process.on('uncaughtException', (error) => {
  if (error.message.includes('ECONNREFUSED')) {
    console.error(`\n❌ Connection refused. Make sure the SSE server is running:`);
    console.error(`   bun run sse-alerts.ts`);
    process.exit(1);
  }
  throw error;
});

// Start monitoring
runViolationMonitor();
