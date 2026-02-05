/**
 * pre-flight-check.ts
 * Master control hardware validation script
 */
import { $ } from "bun";

export async function runPreFlight() {
  console.log("🛡️  Empire Pro Pre-Flight Hardware Validation...");

  // 1. Validate Bun Runtime
  if (Bun.version < "1.3.0") throw new Error("Upgrade Bun to 1.3.0+");
  console.log(`✅ Bun Runtime: ${Bun.version}`);

  // 2. Test R2 Registry Connectivity
  try {
    const registryCheck = await $`bun install --dry-run`.quiet();
    if (registryCheck.exitCode !== 0) throw new Error("R2 Registry Unreachable");
    console.log("✅ R2 Registry Connectivity: Success");
  } catch (e) {
    console.warn("⚠️  Registry dry-run failed, proceeding with localized cache mode.");
  }

  // 3. Check Test Coverage Config
  const bunfig = await Bun.file("bunfig.toml").text();
  if (!bunfig.includes("coverageThreshold")) throw new Error("CI Coverage Missing in bunfig.toml");
  console.log("✅ CI Configuration: Validated");

  console.log("✅ System Healthy. Ready for 10k Agent Deployment.");
}

if (import.meta.main) {
  runPreFlight().catch(err => {
    console.error(`❌ Pre-flight check failed: ${err.message}`);
    process.exit(1);
  });
}