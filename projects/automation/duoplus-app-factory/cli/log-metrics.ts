#!/usr/bin/env bun
/**
 * CLI tool to log operational metrics from Nebula-Flow™
 */

import { OperationalLogger } from '../src/utils/operationalLogger.js';

async function main() {
  const logger = OperationalLogger.getInstance();

  // Check if metrics provided as argument or should read from stdin
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // Read from stdin
    let input = '';
    process.stdin.on('data', (chunk) => {
      input += chunk.toString();
    });

    process.stdin.on('end', async () => {
      if (input.trim()) {
        await logger.processMetricsReport(input.trim());
      } else {
        showUsage();
      }
    });

    process.stdin.setEncoding('utf8');
    console.log('📝 Paste your operational metrics report below (Ctrl+D to finish):');
  } else {
    // Process provided arguments as metrics
    const metricsText = args.join(' ');
    await logger.processMetricsReport(metricsText);
  }
}

function showUsage() {
  console.log(`
🌌 Nebula-Flow™ Operational Metrics Logger

Usage:
  bun run log-metrics < "metrics text"
  bun run log-metrics "Starlight-IDs: 120 ✔\\nOrbit-Assign™: 100 legs ✔\\n..."

Example:
  bun run log-metrics << 'EOF'
  Starlight-IDs: 120 ✔
  Orbit-Assign™: 100 legs ✔
  Cover-Stardust™: PS5 notes ✔
  Comet-Collect™: 98/100 swept (2 pending < 15 min)
  Stardrop™ Yield: 1.74 % → $735 profit
  Black-Hole-Rate™: 0.8 % (1 dispute, auto-refunded)
  Event-Horizon™: 14 min 12 sec avg
  EOF

This will parse, log to database, and display the metrics in a formatted dashboard.
`);
}

if (import.meta.main) {
  main().catch(console.error);
}