/**
 * @fileoverview Production Deployment Script (Bun Shell)
 * @description One-command full stack deployment using Bun Shell
 * @module scripts/deploy-prod
 * 
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-DEPLOY-PROD@0.1.0;instance-id=DEPLOY-PROD-001;version=0.1.0}]
 * [PROPERTIES:{deploy={value:"production-deployment";@root:"ROOT-DEV";@chain:["BP-BUN-SHELL","BP-DEPLOYMENT"];@version:"0.1.0"}}]
 * [CLASS:ProductionDeployer][#REF:v-0.1.0.BP.DEPLOY.PROD.1.0.A.1.1.DEV.1.1]]
 */

import { $ } from "bun";

/**
 * Production deployment using Bun Shell
 */
async function deployProduction() {
  console.log("🚀 Starting production deployment...\n");

  // 1. Pre-flight checks
  console.log("📋 Running pre-flight checks...");
  
  try {
    const bunVersion = await $`bun --version`.text();
    console.log(`✅ Bun version: ${bunVersion.trim()}`);
  } catch (err: any) {
    console.error(`❌ Bun not found: exitCode=${err.exitCode}`);
    console.error(err.stderr?.toString() || err.message);
    process.exit(1);
  }

  try {
    await $`bun run typecheck`.quiet();
    console.log("✅ TypeScript compilation passed");
  } catch (err: any) {
    console.error(`❌ TypeScript errors: exitCode=${err.exitCode}`);
    console.error(err.stderr?.toString() || err.stdout?.toString() || err.message);
    process.exit(1);
  }

  try {
    await $`bun test`.quiet();
    console.log("✅ Tests passed");
  } catch (err: any) {
    console.error(`❌ Tests failed: exitCode=${err.exitCode}`);
    console.error(err.stderr?.toString() || err.stdout?.toString() || err.message);
    process.exit(1);
  }

  // 2. Build with production optimizations
  console.log("\n🔨 Building production bundle...");
  try {
    await $`bun run build`.quiet();
    console.log("✅ Build completed");
  } catch (error) {
    console.error("❌ Build failed");
    process.exit(1);
  }

  // 3. Pre-warm caches and pools
  console.log("\n🔥 Pre-warming caches...");
  $.env({
    ...process.env,
    BUN_DNS_CACHE_SIZE: "10000",
    BUN_WORKER_POOL_SIZE: "16",
  });

  // 4. Health check function using Bun Shell
  async function checkHealth(url: string, maxAttempts: number = 30): Promise<boolean> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Use .nothrow() to check exitCode manually
      const result = await $`curl -sf ${url}`.nothrow().quiet();
      if (result.exitCode === 0) {
        console.log(`✅ Service healthy at ${url}`);
        return true;
      }
      // Non-zero exitCode means curl failed (service not ready)
      console.log(`⏳ Health check attempt ${attempt + 1}/${maxAttempts}... (exitCode=${result.exitCode})`);
      await Bun.sleep(1000);
    }
    return false;
  }

  // 5. Start server in background
  console.log("\n🎯 Starting production server...");
  const serverProcess = Bun.spawn(["bun", "run", "start"], {
    stdout: "inherit",
    stderr: "inherit",
  });

  // Wait for server to start
  await Bun.sleep(2000);

  // 6. Health check loop
  const healthUrl = process.env.HEALTH_URL || "http://localhost:3000/health";
  if (await checkHealth(healthUrl)) {
    console.log("\n✅ Deployment successful!");
    console.log(`📊 Server PID: ${serverProcess.pid}`);
    console.log(`🌐 Health endpoint: ${healthUrl}`);
    console.log(`📈 Metrics endpoint: http://localhost:3000/metrics`);
  } else {
    console.error("\n❌ Deployment failed - service not healthy");
    serverProcess.kill();
    process.exit(1);
  }

  // 7. Log completion
  console.log(`\n🚀 Deployed at ${new Date().toISOString()}`);
  console.log("📝 Logs: Check console output or log files");
}

// Run deployment
if (import.meta.main) {
  deployProduction().catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
}
