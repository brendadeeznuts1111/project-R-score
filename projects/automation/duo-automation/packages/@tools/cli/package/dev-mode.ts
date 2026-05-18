/**
 * cli/dev-mode.ts (Ticket 21.1.1.1.2)
 * Sovereign Infrastructure Mode-Switching CLI
 */

import { $ } from "bun";
import { SovereignLinkOrchestrator } from "../utils/sovereign-link-orchestrator";

export async function enableLocalLinking() {
  console.info("🏰 [SOVEREIGN DEV] Activating Local Symlink Mode...");
  const modules = await SovereignLinkOrchestrator.registerModules();
  if (modules.length > 0) {
    await SovereignLinkOrchestrator.linkToTarget(".", modules);
    console.info("💎 Local Module Matrix SYNCHRONIZED.");
  }
}

export async function enableR2Production() {
  console.info("🛰️ [SOVEREIGN PROD] Reverting to Cloudflare R2 Registry...");
  // Standard v4.0 Registry
  const registry = "https://duo-npm-registry.utahj4754.workers.dev";
  console.info(`🔗 Target Registry: ${registry}`);
  
  const proc = Bun.spawn(["bun", "install", "--registry", registry], {
    stdout: "inherit",
    stderr: "inherit"
  });

  const exitCode = await proc.exited;
  if (exitCode === 0) {
    console.info("✅ Sovereign Fleet re-anchored to Production Registry.");
  } else {
    console.error("❌ Production sync failed. Check mTLS certificates.");
  }
}

const args = process.argv.slice(2);
const command = args[0];

if (command === "--dev") {
  await enableLocalLinking();
} else if (command === "--prod") {
  await enableR2Production();
} else {
  console.info(`
🏰 Sovereign dev-mode CLI
========================
Usage:
  bun run cli/dev-mode.ts --dev   - Activate Local Symlink Mode (Category 21)
  bun run cli/dev-mode.ts --prod  - Revert to R2 Production Registry
  `);
}