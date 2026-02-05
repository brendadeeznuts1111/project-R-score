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
    console.log(status ? "🔒 FROZEN" : "🔓 Unfrozen");
    
    const freezeStatus = configFreeze.getFreezeStatus();
    if (freezeStatus) {
      console.log(`Reason: ${freezeStatus.reason}`);
      console.log(`Since: ${freezeStatus.timestamp}`);
    }
    break;
    
  default:
    console.log("Usage:");
    console.log("  bun run config-freeze-cli.ts freeze [reason]");
    console.log("  bun run config-freeze-cli.ts unfreeze");
    console.log("  bun run config-freeze-cli.ts status");
    process.exit(1);
}
