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
    console.info("🚀 DuoPlus Admin CLI v3.5");
    console.info("🏛️ Production-grade financial infrastructure");
    console.info(`🔧 Environment: ${this.environmentConfig.environment}`);
    console.info(`🎯 Debug Mode: ${this.environmentConfig.debug ? 'Enabled' : 'Disabled'}`);
    console.info(`📊 Metrics: ${this.environmentConfig.metricsEnabled ? 'Enabled' : 'Disabled'}`);
    console.info("");

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
    console.info("🔐 Starting KYC Admin Dashboard...");
    console.info("📋 Features: User verification, risk scoring, audit logging");
    console.info("🛡️ FinCEN compliant with real-time monitoring");
    console.info("");

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
    
    console.info(`🔄 Starting Pool Rebalancing Engine...`);
    console.info(`⏰ Interval: ${interval} minutes`);
    console.info(`⚡ Lightning Network integration enabled`);
    console.info("");

    try {
      // Start the rebalancing cron
      this.rebalancingEngine.startCron(interval);
      
      console.info("✅ Rebalancing engine started successfully");
      console.info("📊 Monitoring pool performance and optimizing yields");
      console.info("🔄 Press Ctrl+C to stop");

      // Keep the process running
      process.on("SIGINT", () => {
        console.info("\n🛑 Stopping rebalancing engine...");
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
    
    console.info(`🏆 APY Leaderboard - ${scope.toUpperCase()}`);
    console.info("📊 Real-time pool performance rankings");
    console.info("");

    try {
      const leaderboard = await this.apyLeaderboard.renderLeaderboard({ scope });
      console.info(leaderboard);

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
    console.info("📊 DuoPlus System Status");
    console.info("=" .repeat(50));
    console.info("");

    try {
      // KYC Status
      const kycStats = await this.kycDashboard.getKYCStats();
      console.info("🔐 KYC Dashboard:");
      console.info(`  • Pending Reviews: ${kycStats.pending}`);
      console.info(`  • Verified Users: ${kycStats.verified}`);
      console.info(`  • High Risk Users: ${kycStats.highRisk}`);
      console.info(`  • Daily Volume: $${kycStats.dailyVolume.toFixed(2)}`);
      console.info("");

      // Pool Status
      const poolStats = this.rebalancingEngine.getPoolStats();
      console.info("🏊 Pool Management:");
      console.info(`  • Total Pools: ${poolStats.totalPools}`);
      console.info(`  • Active Pools: ${poolStats.activePools}`);
      console.info(`  • Total Balance: $${poolStats.totalBalance.toLocaleString()}`);
      console.info(`  • Average APY: ${(poolStats.avgYield * 100).toFixed(2)}%`);
      console.info(`  • Average Risk: ${poolStats.avgRiskScore.toFixed(1)}/100`);
      console.info("");

      // Show user search
      console.info("\n🔍 Pool Search Demo:");
      const searchResults = await this.apyLeaderboard.searchPools("Johnson");
      console.info(`Found ${searchResults.length} pools matching "Johnson":`);
      
      searchResults.slice(0, 3).forEach((pool: any, idx: number) => {
        console.info(`  ${idx + 1}. ${pool.poolName}: ${pool.apy.toFixed(2)}% APY (${pool.tier})`);
      });

      // Show detailed pool information
      if (searchResults.length > 0 && searchResults[0]) {
        const firstPool = searchResults[0];
        const poolDetails = await this.apyLeaderboard.getPoolDetails(firstPool.poolId);
        if (poolDetails !== null && poolDetails !== undefined) {
          console.info(`\n📊 Detailed Pool Analysis: ${poolDetails.poolName}`);
          console.info(`  • Current APY: ${poolDetails.apy.toFixed(2)}%`);
          console.info(`  • Balance: $${poolDetails.balance.toLocaleString()}`);
          console.info(`  • Members: ${poolDetails.members}`);
          console.info(`  • 24h Volume: $${poolDetails.volume24h.toLocaleString()}`);
          console.info(`  • 30d Yield: $${poolDetails.yieldGenerated.toFixed(2)}`);
          console.info(`  • Risk Score: ${poolDetails.riskScore}/100`);
          console.info(`  • Tier: ${poolDetails.tier.toUpperCase()}`);
        } else {
          console.info("\n⚠️  Unable to retrieve detailed pool information");
        }
      }

      // Leaderboard Status
      const leaderboardStats = await this.apyLeaderboard.getLeaderboardStats();
      console.info("🏆 APY Leaderboard:");
      console.info(`  • Total Pools: ${leaderboardStats.totalPools}`);
      console.info(`  • Active Pools: ${leaderboardStats.activePools}`);
      console.info(`  • Average APY: ${leaderboardStats.avgAPY.toFixed(2)}%`);
      console.info(`  • Top APY: ${leaderboardStats.topAPY.toFixed(2)}%`);
      console.info(`  • 24h Volume: $${leaderboardStats.totalVolume.toLocaleString()}`);
      console.info(`  • Cache Hit Rate: ${leaderboardStats.cacheHitRate.toFixed(1)}%`);
      console.info("");

      // Rebalancing History
      const recentRebalancing = this.rebalancingEngine.getRebalancingHistory(10);
      console.info("🔄 Recent Rebalancing:");
      if (recentRebalancing.length === 0) {
        console.info("  • No recent rebalancing activity");
      } else {
        recentRebalancing.forEach((report: any, idx: number) => {
          console.info(`  ${idx + 1}. ${report.timestamp.toLocaleString()}: ${report.totalMovements} movements, ${report.totalYieldIncrease} bps yield increase`);
        });
      }
      console.info("");

      console.info("✅ All systems operational");

    } catch (error) {
      console.error("❌ Status check error:", error);
      process.exit(1);
    }
  }

  /**
   * Show detailed statistics
   */
  private async showDetailedStats(): Promise<void> {
    console.info("\n📈 Detailed Analytics:");
    console.info("-".repeat(40));

    try {
      // Top performing pools
      const topPools = await this.apyLeaderboard.getLeaderboard({ maxResults: 5 });
      console.info("\n🏆 Top 5 Pools:");
      topPools.forEach((pool, idx) => {
        console.info(`  ${idx + 1}. ${pool.poolName}: ${pool.apy.toFixed(2)}% APY, $${pool.balance.toLocaleString()} balance`);
      });

      // Rebalancing performance
      const recentRebalancing = this.rebalancingEngine.getRebalancingHistory(10);
      const successfulRebalancing = recentRebalancing.filter(r => r.success);
      const avgExecutionTime = successfulRebalancing.reduce((sum, r) => sum + r.executionTimeMs, 0) / successfulRebalancing.length;
      
      console.info("\n🔄 Rebalancing Performance:");
      console.info(`  • Success Rate: ${successfulRebalancing.length}/${recentRebalancing.length} (${(successfulRebalancing.length / recentRebalancing.length * 100).toFixed(1)}%)`);
      console.info(`  • Avg Execution Time: ${avgExecutionTime.toFixed(0)}ms`);
      console.info(`  • Total Yield Increase: ${successfulRebalancing.reduce((sum, r) => sum + r.totalYieldIncrease, 0)} bps`);

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
    
    console.info(`\n📊 Rebalancing Status (${new Date().toLocaleTimeString()})`);
    console.info(`  • Active Pools: ${stats.activePools}/${stats.totalPools}`);
    console.info(`  • Total Balance: $${stats.totalBalance.toLocaleString()}`);
    console.info(`  • Last Rebalancing: ${recent.length > 0 && recent[0] ? recent[0].timestamp.toLocaleString() : "Never"}`);
  }

  /**
   * Show usage information
   */
  private showUsage(): void {
    console.info("📚 DuoPlus Admin CLI Usage");
    console.info("");
    console.info("Commands:");
    console.info("  kyc              Start KYC Admin Dashboard");
    console.info("  rebalance        Start pool rebalancing engine");
    console.info("  leaderboard      Show APY rankings");
    console.info("  status           Show system status");
    console.info("");
    console.info("Options:");
    console.info("  --scope <scope>  Leaderboard scope (global|family|personal)");
    console.info("  --interval <min>  Rebalancing interval in minutes");
    console.info("  --verbose         Show detailed statistics");
    console.info("");
    console.info("Examples:");
    console.info("  bun run cli/admin.ts kyc");
    console.info("  bun run cli/admin.ts rebalance --interval 30");
    console.info("  bun run cli/admin.ts leaderboard --scope family");
    console.info("  bun run cli/admin.ts status --verbose");
    console.info("");
    console.info("Features:");
    console.info("  🔐 KYC verification with FinCEN compliance");
    console.info("  🏊 Pool management with auto-rebalancing");
    console.info("  🏆 APY leaderboards with real-time rankings");
    console.info("  ⚡ Lightning Network integration");
    console.info("  📊 Performance analytics and monitoring");
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
      console.info("🏛️ DuoPlus Admin CLI v3.5");
      console.info("🛡️ FinCEN Compliant • ⚡ Lightning Ready • 📊 Real-time Analytics");
      console.info("");
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
