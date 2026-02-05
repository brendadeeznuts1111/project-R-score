#!/usr/bin/env bun

/**
 * Bun Monitor: Real-time Dashboard for Arb Bot
 *
 * Provides:
 * - Live bot logs
 * - Performance metrics
 * - Trade execution log
 * - P&L tracking
 */

import * as fs from "fs";

interface TradeMetrics {
  totalTrades: number;
  totalProfit: number;
  winRate: number;
  avgProfit: number;
  lastTrade?: {
    timestamp: string;
    market: string;
    profit: number;
  };
}

class BotMonitor {
  private metrics: TradeMetrics = {
    totalTrades: 0,
    totalProfit: 0,
    winRate: 0,
    avgProfit: 0,
  };

  async startMonitoring(): Promise<void> {
    console.clear();
    console.log("📊 Arb Bot Monitor (Live Dashboard)");
    console.log("═".repeat(50));

    // Watch for log updates
    const logPath = ".discovery_cache.json";

    if (fs.existsSync(logPath)) {
      this.displayMetrics();
      this.watchLogs();
    } else {
      console.log("⏳ Waiting for bot to start...");
    }

    // Refresh every 2 seconds
    setInterval(() => this.refresh(), 2000);
  }

  private displayMetrics(): void {
    console.log("\n📈 Performance Metrics");
    console.log("─".repeat(50));
    console.log(`Total Trades:     ${this.metrics.totalTrades}`);
    console.log(
      `Total Profit:     $${(this.metrics.totalProfit / 100).toFixed(2)}`
    );
    console.log(`Win Rate:         ${(this.metrics.winRate * 100).toFixed(1)}%`);
    console.log(
      `Avg Profit/Trade: $${(this.metrics.avgProfit / 100).toFixed(2)}`
    );

    if (this.metrics.lastTrade) {
      console.log("\n🔄 Last Trade");
      console.log("─".repeat(50));
      console.log(`Time:   ${this.metrics.lastTrade.timestamp}`);
      console.log(`Market: ${this.metrics.lastTrade.market}`);
      console.log(
        `Profit: $${(this.metrics.lastTrade.profit / 100).toFixed(2)}`
      );
    }
  }

  private watchLogs(): void {
    // Monitor positions.json for trade updates
    const posFile = "positions.json";
    if (fs.existsSync(posFile)) {
      const content = fs.readFileSync(posFile, "utf-8");
      // Parse and update metrics
      try {
        JSON.parse(content);
        // Update metrics from data (placeholder)
      } catch (e) {
        // Ignore parse errors
      }
    }
  }

  private refresh(): void {
    // Update dashboard every 2 seconds
    this.displayMetrics();
  }
}

// Start monitor
const monitor = new BotMonitor();
monitor.startMonitoring();

// Handle exit
process.on("SIGINT", () => {
  console.log("\n\n👋 Monitor stopped");
  process.exit(0);
});
