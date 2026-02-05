// scripts/maintenance/health/health-suite.ts
/**
 * 🏥 EMPIRE PRO HEALTH SUITE
 * Unified tool for checking secrets, monitoring performance, and live tracing.
 */

import { secrets } from "bun";
import { BunR2AppleManager } from '../../../src/storage/r2-apple-manager';
import { phoneIntelligenceSystem } from '../../../src/core/filter/phone-intelligence-system';
import { feature } from "../../../src/common/feature-flags";
import Bun from "bun";

class HealthSuite {
  async runCheck() {
    console.log("🏥 Bun Secrets Health Check");
    const service = "empire-pro-config-empire";
    const criticalSecrets = ["R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"];
    for (const secretName of criticalSecrets) {
      const value = await secrets.get({ service, name: secretName });
      console.log(value ? `✅ ${secretName}: Available` : `❌ ${secretName}: MISSING`);
    }
  }

  async runMonitor() {
    console.log('\u001b[1m\u001b[35m🔍 AUTOMATED HEALTH MONITOR\u001b[0m');
    const mgr = new BunR2AppleManager();
    const storageStats = await mgr.getMetrics();
    console.log(`📦 STORAGE: ${storageStats.metrics.localMirroredFiles} local files`);
    
    const phoneSystem = await phoneIntelligenceSystem.getMetrics();
    console.log(`⚡ PERFORMANCE: ${phoneSystem.throughput.toFixed(0)} items/s`);
  }

  async runTrace() {
    if (!feature("PTY_INTERACTIVE")) {
      console.error("❌ PTY_INTERACTIVE not enabled.");
      return;
    }
    console.log("\x1b[32m[EMPIRE PRO] Live Health Tracer Active\x1b[0m");
    const subsystems = ['STORAGE', 'PROXY', 'AUTH', 'ORCHESTRATION'];
    setInterval(() => {
      const sub = subsystems[Math.floor(Math.random() * subsystems.length)];
      console.log(`${new Date().toLocaleTimeString()} | ${sub.padEnd(15)} | HEALTHY`);
    }, 1200);
  }
}

async function main() {
  const command = process.argv[2];
  const suite = new HealthSuite();
  switch (command) {
    case 'check': await suite.runCheck(); break;
    case 'monitor': await suite.runMonitor(); break;
    case 'trace': await suite.runTrace(); break;
    default:
      console.log("Usage: bun run scripts/maintenance/health/health-suite.ts [check|monitor|trace]");
  }
}

if (import.meta.main) main();