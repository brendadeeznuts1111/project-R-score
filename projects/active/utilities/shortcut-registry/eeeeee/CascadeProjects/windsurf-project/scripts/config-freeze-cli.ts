#!/usr/bin/env bun
// scripts/config-freeze-cli.ts - CLI for configuration freeze functionality

import { configFreeze } from "../src/admin/config-freeze";

const command = process.argv[2];

switch (command) {
  case "freeze":
    const reason = process.argv[3] || "Manual freeze via CLI";
    configFreeze.freeze(reason);
    break;
    
  case "unfreeze":
    configFreeze.unfreeze();
    break;
    
  case "status":
    const status = configFreeze.isConfigurationFrozen();
    console.info(status ? "🔒 FROZEN" : "🔓 Unfrozen");
    
    const freezeStatus = configFreeze.getFreezeStatus();
    if (freezeStatus) {
      console.info(`Reason: ${freezeStatus.reason}`);
      console.info(`Since: ${freezeStatus.timestamp}`);
    }
    break;
    
  default:
    console.info("Usage:");
    console.info("  bun run config-freeze-cli.ts freeze [reason]");
    console.info("  bun run config-freeze-cli.ts unfreeze");
    console.info("  bun run config-freeze-cli.ts status");
    process.exit(1);
}
