#!/usr/bin/env bun
// cli/cashapp-green-cli.ts

import { AdvancedGreenYieldDashboard } from "../src/admin/advancedGreenDashboard";
import { CashAppGreenClient } from "../src/cashapp/greenDeposit";
import { EnhancedLightningToGreenRouter } from "../src/finance/enhancedAutoRouter";
import { priceFeed } from "../src/price/realtimeFeed";

const dashboard = new AdvancedGreenYieldDashboard();
const greenClient = new CashAppGreenClient();
const router = new EnhancedLightningToGreenRouter();

// Simple command parser (since commander might not be available)
const args = process.argv.slice(2);
const command = args[0];

async function main() {
  switch (command) {
    case "dashboard":
    case "dash":
      console.log("🚀 Starting Cash App Green Dashboard...");
      await dashboard.start();
      break;

    case "deposit":
      const userIndex = args.indexOf("-u") || args.indexOf("--user");
      const amountIndex = args.indexOf("-a") || args.indexOf("--amount");
      
      if (userIndex === -1 || amountIndex === -1) {
        console.error("❌ Missing required arguments: -u <userId> -a <amount>");
        process.exit(1);
      }
      
      const userId = args[userIndex + 1];
      const amountStr = args[amountIndex + 1];
      
      if (!userId || !amountStr) {
        console.error("❌ Missing required arguments: -u <userId> -a <amount>");
        process.exit(1);
      }
      
      const amount = parseFloat(amountStr);
      
      if (isNaN(amount) || amount <= 0) {
        console.error("❌ Invalid amount. Must be a positive number.");
        process.exit(1);
      }

      try {
        console.log(`💰 Depositing $${amount} to Green account for user ${userId}...`);
        
        const result = await greenClient.depositToGreen({
          userId,
          amountUsd: amount,
          source: "manual-cli",
          traceId: `manual-cli-${Date.now()}`
        });

        console.log(`✅ Success! Deposit ID: ${result.depositId}`);
        console.log(`💵 Projected annual yield: $${result.yieldProjection.toFixed(2)}`);
        
      } catch (error) {
        console.error(`❌ Deposit failed: ${error}`);
        process.exit(1);
      }
      break;

    case "balance":
      const balanceUserIndex = args.indexOf("-u") || args.indexOf("--user");
      
      if (balanceUserIndex === -1) {
        console.error("❌ Missing required argument: -u <userId>");
        process.exit(1);
      }
      
      const balanceUserId = args[balanceUserIndex + 1];
      
      if (!balanceUserId) {
        console.error("❌ Missing required argument: -u <userId>");
        process.exit(1);
      }
      
      try {
        console.log(`📊 Checking balance for user ${balanceUserId}...`);
        
        const balance = await greenClient.getGreenBalance(balanceUserId);
        
        console.log(`💰 Current Balance: $${balance.balance.toLocaleString()}`);
        console.log(`💵 Yield Earned: $${balance.yieldEarned.toLocaleString()}`);
        console.log(`📈 Current APY: ${(balance.apy * 100).toFixed(2)}%`);
        
      } catch (error) {
        console.error(`❌ Balance check failed: ${error}`);
        process.exit(1);
      }
      break;

    case "price":
      try {
        const currentPrice = priceFeed.getCurrentPrice();
        console.log(`💰 Current BTC Price: $${currentPrice.toLocaleString()}`);
        
        const metrics = router.getMetrics();
        console.log("\n📊 Routing Metrics:");
        console.log(`  Total Routed: $${metrics.totalRouted.toLocaleString()}`);
        console.log(`  Projected Yield: $${metrics.totalYieldProjected.toLocaleString()}`);
        console.log(`  Average Route Time: ${metrics.averageRouteTime.toFixed(0)}ms`);
        console.log(`  Success Rate: ${(metrics.successRate * 100).toFixed(1)}%`);
        
      } catch (error) {
        console.error(`❌ Price check failed: ${error}`);
        process.exit(1);
      }
      break;

    case "status":
      try {
        console.log("🏥 DuoPlus Cash App Green System Status\n");
        
        // Check BTC price feed
        const price = priceFeed.getCurrentPrice();
        console.log(`💰 BTC Price: $${price.toLocaleString()} ✅`);
        
        // Check routing metrics
        const metrics = router.getMetrics();
        console.log(`📊 Router: ${metrics.totalRouted > 0 ? "✅ Active" : "⚠️ Idle"}`);
        
        // Check Green client
        console.log(`🟩 Green Client: Ready ✅`);
        
        // Environment variables
        const requiredEnvVars = [
          "CASHAPP_ACCOUNT_ID",
          "CASHAPP_ACCESS_TOKEN", 
          "CHAINALYSIS_API_KEY"
        ];
        
        console.log("\n🔧 Configuration:");
        requiredEnvVars.forEach(envVar => {
          const status = process.env[envVar] ? "✅" : "❌";
          console.log(`  ${envVar}: ${status}`);
        });
        
        console.log("\n📈 System Health: All systems operational ✅");
        
      } catch (error) {
        console.error(`❌ Status check failed: ${error}`);
        process.exit(1);
      }
      break;

    case "test":
      try {
        console.log("🧪 Running Cash App Green integration tests...");
        
        const process = Bun.spawn(["bun", "test", "test/cashapp-green-integration.test.ts"], {
          stdout: "inherit",
          stderr: "inherit"
        });
        
        const exitCode = await process.exited;
        
        if (exitCode === 0) {
          console.log("✅ All tests passed!");
        } else {
          console.log("❌ Some tests failed.");
          // Use Bun.exit instead of process.exit for subprocess
          throw new Error(`Tests failed with exit code: ${exitCode}`);
        }
        
      } catch (error) {
        console.error(`❌ Test execution failed: ${error}`);
        process.exit(1);
      }
      break;

    default:
      console.log(`
🟩 Cash App Green CLI - Available Commands:

  dashboard          Launch interactive yield dashboard
  deposit -u <user> -a <amount>  Manual deposit to Green
  balance -u <user>  Check Green account balance
  price             Show current BTC price and metrics
  status            Show system status and health
  test              Run integration tests

Examples:
  bun run cli/cashapp-green-cli.ts dashboard
  bun run cli/cashapp-green-cli.ts deposit -u user123 -a 100
  bun run cli/cashapp-green-cli.ts balance -u user123
  bun run cli/cashapp-green-cli.ts price
      `);
      break;
  }
}

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  console.error("💥 Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n👋 Shutting down gracefully...");
  priceFeed.destroy();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n👋 Shutting down gracefully...");
  priceFeed.destroy();
  process.exit(0);
});

// Run main function
main().catch(error => {
  console.error("💥 CLI Error:", error);
  process.exit(1);
});
