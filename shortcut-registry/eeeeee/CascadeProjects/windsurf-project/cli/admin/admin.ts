#!/usr/bin/env bun
// cli/admin.ts - DuoPlus Admin CLI with KYC Dashboard, Pool Management, and APY Leaderboards
// Production-grade financial infrastructure with FinCEN compliance

import { KYCDashboard } from "../src/admin/kycDashboard";
import { PoolRebalancingEngine } from "../src/pools/rebalancingEngine";
import { APYLeaderboard } from "../src/pools/apyLeaderboard";
import { config } from "../src/config/config";

interface AdminConfig {
  mode: "kyc" | "rebalance" | "leaderboard" | "status";
  scope?: string;
  interval?: number;
  verbose?: boolean;
}

class DuoPlusAdminCLI {
  private kycDashboard: KYCDashboard;
  private rebalancingEngine: PoolRebalancingEngine;
  private apyLeaderboard: APYLeaderboard;
  private config: AdminConfig;
  private environmentConfig: any;

  constructor(adminConfig: AdminConfig) {
    this.config = adminConfig;
    this.environmentConfig = config.getDuoPlusConfig();
    this.kycDashboard = new KYCDashboard();
    this.rebalancingEngine = new PoolRebalancingEngine();
    this.apyLeaderboard = new APYLeaderboard();
  }

  /**
   * Start the admin CLI
   */
  async start(): Promise<void> {
    console.log("🚀 DuoPlus Admin CLI v3.5");
    console.log("🏛️ Production-grade financial infrastructure");
    console.log(`🔧 Environment: ${this.environmentConfig.environment}`);
    console.log(`🎯 Debug Mode: ${this.environmentConfig.debug ? 'Enabled' : 'Disabled'}`);
    console.log(`📊 Metrics: ${this.environmentConfig.metricsEnabled ? 'Enabled' : 'Disabled'}`);
    console.log("");

    switch (this.config.mode) {
      case "kyc":
        await this.startKYCDashboard();
        break;
      case "rebalance":
        await this.startRebalancing();
        break;
      case "leaderboard":
        await this.showLeaderboard();
        break;
      case "status":
        await this.showStatus();
        break;
      default:
        this.showUsage();
    }
  }

  /**
   * Start KYC Dashboard
   */
  private async startKYCDashboard(): Promise<void> {
    console.log("🔐 Starting KYC Admin Dashboard...");
    console.log("📋 Features: User verification, risk scoring, audit logging");
    console.log("🛡️ FinCEN compliant with real-time monitoring");
    console.log("");

    try {
      await this.kycDashboard.start();
    } catch (error) {
      console.error("❌ KYC Dashboard error:", error);
      process.exit(1);
    }
  }

  /**
   * Start pool rebalancing
   */
  private async startRebalancing(): Promise<void> {
    const interval = this.config.interval || 60; // Default 60 minutes
    
    console.log(`🔄 Starting Pool Rebalancing Engine...`);
    console.log(`⏰ Interval: ${interval} minutes`);
    console.log(`⚡ Lightning Network integration enabled`);
    console.log("");

    try {
      // Start the rebalancing cron
      this.rebalancingEngine.startCron(interval);
      
      console.log("✅ Rebalancing engine started successfully");
      console.log("📊 Monitoring pool performance and optimizing yields");
      console.log("🔄 Press Ctrl+C to stop");

      // Keep the process running
      process.on("SIGINT", () => {
        console.log("\n🛑 Stopping rebalancing engine...");
        this.rebalancingEngine.stopCron();
        process.exit(0);
      });

      // Show periodic status
      setInterval(() => {
        this.showRebalancingStatus();
      }, 5 * 60 * 1000); // Every 5 minutes

      // Prevent process from exiting
      await new Promise(() => {});

    } catch (error) {
      console.error("❌ Rebalancing engine error:", error);
      process.exit(1);
    }
  }

  /**
   * Show APY leaderboard
   */
  private async showLeaderboard(): Promise<void> {
    const scope = (this.config.scope as any) || "global";
    
    console.log(`🏆 APY Leaderboard - ${scope.toUpperCase()}`);
    console.log("📊 Real-time pool performance rankings");
    console.log("");

    try {
      const leaderboard = await this.apyLeaderboard.renderLeaderboard({ scope });
      console.log(leaderboard);

      if (this.config.verbose) {
        await this.showDetailedStats();
      }

    } catch (error) {
      console.error("❌ Leaderboard error:", error);
      process.exit(1);
    }
  }

  /**
   * Show system status
   */
  private async showStatus(): Promise<void> {
    console.log("📊 DuoPlus System Status");
    console.log("=" .repeat(50));
    console.log("");

    try {
      // KYC Status
      const kycStats = await this.kycDashboard.getKYCStats();
      console.log("🔐 KYC Dashboard:");
      console.log(`  • Pending Reviews: ${kycStats.pending}`);
      console.log(`  • Verified Users: ${kycStats.verified}`);
      console.log(`  • High Risk Users: ${kycStats.highRisk}`);
      console.log(`  • Daily Volume: $${kycStats.dailyVolume.toFixed(2)}`);
      console.log("");

      // Pool Status
      const poolStats = this.rebalancingEngine.getPoolStats();
      console.log("🏊 Pool Management:");
      console.log(`  • Total Pools: ${poolStats.totalPools}`);
      console.log(`  • Active Pools: ${poolStats.activePools}`);
      console.log(`  • Total Balance: $${poolStats.totalBalance.toLocaleString()}`);
      console.log(`  • Average APY: ${(poolStats.avgYield * 100).toFixed(2)}%`);
      console.log(`  • Average Risk: ${poolStats.avgRiskScore.toFixed(1)}/100`);
      console.log("");

      // Show user search
      console.log("\n🔍 Pool Search Demo:");
      const searchResults = await this.apyLeaderboard.searchPools("Johnson");
      console.log(`Found ${searchResults.length} pools matching "Johnson":`);
      
      searchResults.slice(0, 3).forEach((pool: any, idx: number) => {
        console.log(`  ${idx + 1}. ${pool.poolName}: ${pool.apy.toFixed(2)}% APY (${pool.tier})`);
      });

      // Show detailed pool information
      if (searchResults.length > 0 && searchResults[0]) {
        const firstPool = searchResults[0];
        const poolDetails = await this.apyLeaderboard.getPoolDetails(firstPool.poolId);
        if (poolDetails !== null && poolDetails !== undefined) {
          console.log(`\n📊 Detailed Pool Analysis: ${poolDetails.poolName}`);
          console.log(`  • Current APY: ${poolDetails.apy.toFixed(2)}%`);
          console.log(`  • Balance: $${poolDetails.balance.toLocaleString()}`);
          console.log(`  • Members: ${poolDetails.members}`);
          console.log(`  • 24h Volume: $${poolDetails.volume24h.toLocaleString()}`);
          console.log(`  • 30d Yield: $${poolDetails.yieldGenerated.toFixed(2)}`);
          console.log(`  • Risk Score: ${poolDetails.riskScore}/100`);
          console.log(`  • Tier: ${poolDetails.tier.toUpperCase()}`);
        } else {
          console.log("\n⚠️  Unable to retrieve detailed pool information");
        }
      }

      // Leaderboard Status
      const leaderboardStats = await this.apyLeaderboard.getLeaderboardStats();
      console.log("🏆 APY Leaderboard:");
      console.log(`  • Total Pools: ${leaderboardStats.totalPools}`);
      console.log(`  • Active Pools: ${leaderboardStats.activePools}`);
      console.log(`  • Average APY: ${leaderboardStats.avgAPY.toFixed(2)}%`);
      console.log(`  • Top APY: ${leaderboardStats.topAPY.toFixed(2)}%`);
      console.log(`  • 24h Volume: $${leaderboardStats.totalVolume.toLocaleString()}`);
      console.log(`  • Cache Hit Rate: ${leaderboardStats.cacheHitRate.toFixed(1)}%`);
      console.log("");

      // Rebalancing History
      const recentRebalancing = this.rebalancingEngine.getRebalancingHistory(10);
      console.log("🔄 Recent Rebalancing:");
      if (recentRebalancing.length === 0) {
        console.log("  • No recent rebalancing activity");
      } else {
        recentRebalancing.forEach((report: any, idx: number) => {
          console.log(`  ${idx + 1}. ${report.timestamp.toLocaleString()}: ${report.totalMovements} movements, ${report.totalYieldIncrease} bps yield increase`);
        });
      }
      console.log("");

      console.log("✅ All systems operational");

    } catch (error) {
      console.error("❌ Status check error:", error);
      process.exit(1);
    }
  }

  /**
   * Show detailed statistics
   */
  private async showDetailedStats(): Promise<void> {
    console.log("\n📈 Detailed Analytics:");
    console.log("-".repeat(40));

    try {
      // Top performing pools
      const topPools = await this.apyLeaderboard.getLeaderboard({ maxResults: 5 });
      console.log("\n🏆 Top 5 Pools:");
      topPools.forEach((pool, idx) => {
        console.log(`  ${idx + 1}. ${pool.poolName}: ${pool.apy.toFixed(2)}% APY, $${pool.balance.toLocaleString()} balance`);
      });

      // Rebalancing performance
      const recentRebalancing = this.rebalancingEngine.getRebalancingHistory(10);
      const successfulRebalancing = recentRebalancing.filter(r => r.success);
      const avgExecutionTime = successfulRebalancing.reduce((sum, r) => sum + r.executionTimeMs, 0) / successfulRebalancing.length;
      
      console.log("\n🔄 Rebalancing Performance:");
      console.log(`  • Success Rate: ${successfulRebalancing.length}/${recentRebalancing.length} (${(successfulRebalancing.length / recentRebalancing.length * 100).toFixed(1)}%)`);
      console.log(`  • Avg Execution Time: ${avgExecutionTime.toFixed(0)}ms`);
      console.log(`  • Total Yield Increase: ${successfulRebalancing.reduce((sum, r) => sum + r.totalYieldIncrease, 0)} bps`);

    } catch (error) {
      console.error("❌ Detailed stats error:", error);
    }
  }

  /**
   * Show rebalancing status
   */
  private showRebalancingStatus(): void {
    const stats = this.rebalancingEngine.getPoolStats();
    const recent = this.rebalancingEngine.getRebalancingHistory(1);
    
    console.log(`\n📊 Rebalancing Status (${new Date().toLocaleTimeString()})`);
    console.log(`  • Active Pools: ${stats.activePools}/${stats.totalPools}`);
    console.log(`  • Total Balance: $${stats.totalBalance.toLocaleString()}`);
    console.log(`  • Last Rebalancing: ${recent.length > 0 && recent[0] ? recent[0].timestamp.toLocaleString() : "Never"}`);
  }

  /**
   * Show usage information
   */
  private showUsage(): void {
    console.log("📚 DuoPlus Admin CLI Usage");
    console.log("");
    console.log("Commands:");
    console.log("  kyc              Start KYC Admin Dashboard");
    console.log("  rebalance        Start pool rebalancing engine");
    console.log("  leaderboard      Show APY rankings");
    console.log("  status           Show system status");
    console.log("");
    console.log("Options:");
    console.log("  --scope <scope>  Leaderboard scope (global|family|personal)");
    console.log("  --interval <min>  Rebalancing interval in minutes");
    console.log("  --verbose         Show detailed statistics");
    console.log("");
    console.log("Examples:");
    console.log("  bun run cli/admin.ts kyc");
    console.log("  bun run cli/admin.ts rebalance --interval 30");
    console.log("  bun run cli/admin.ts leaderboard --scope family");
    console.log("  bun run cli/admin.ts status --verbose");
    console.log("");
    console.log("Features:");
    console.log("  🔐 KYC verification with FinCEN compliance");
    console.log("  🏊 Pool management with auto-rebalancing");
    console.log("  🏆 APY leaderboards with real-time rankings");
    console.log("  ⚡ Lightning Network integration");
    console.log("  📊 Performance analytics and monitoring");
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(): AdminConfig {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    return { mode: "status" };
  }

  const config: AdminConfig = {
    mode: "status"
  };

  // Parse mode
  const mode = args[0]?.toLowerCase() || "status";
  if (["kyc", "rebalance", "leaderboard", "status"].includes(mode)) {
    config.mode = mode as any;
  }

  // Parse options
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    switch (arg) {
      case "--scope":
        if (next && ["global", "family", "personal"].includes(next)) {
          config.scope = next;
          i++;
        }
        break;
      case "--interval":
        if (next && !isNaN(parseInt(next))) {
          config.interval = parseInt(next);
          i++;
        }
        break;
      case "--verbose":
        config.verbose = true;
        break;
      case "--help":
      case "-h":
        config.mode = "status"; // Will show usage
        break;
    }
  }

  return config;
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  try {
    const config = parseArgs();
    
    // Show header
    if (config.mode !== "status") {
      console.log("🏛️ DuoPlus Admin CLI v3.5");
      console.log("🛡️ FinCEN Compliant • ⚡ Lightning Ready • 📊 Real-time Analytics");
      console.log("");
    }

    const cli = new DuoPlusAdminCLI(config);
    await cli.start();

  } catch (error) {
    console.error("❌ CLI Error:", error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main().catch(error => {
    console.error("❌ Fatal Error:", error);
    process.exit(1);
  });
}

export default DuoPlusAdminCLI;
