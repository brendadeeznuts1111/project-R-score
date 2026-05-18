#!/usr/bin/env bun
/**
 * Live Lightning Metrics Display
 * Shows real-time mock Lightning Network statistics
 */

import { LndMockClient } from "./src/services/lndMockClient.js";
import { SavingsOptimizer } from "./src/finance/savingsOptimizer.js";
import chalk from "chalk";

const lndMock = new LndMockClient();
const optimizer = new SavingsOptimizer();

async function displayLiveMetrics() {
  console.clear();
  console.info(chalk.hex("#FF6B35").bold(`
╔══════════════════════════════════════════════╗
║        ⚡ LIVE LIGHTNING METRICS v3.5        ║
║         DuoPlus Network Monitor             ║
╚══════════════════════════════════════════════╝
`));

  // Real-time metrics loop
  setInterval(async () => {
    try {
      const info = await lndMock.getNodeInfo();
      const balance = await lndMock.getNodeBalance();
      const channels = await lndMock.listChannels();
      const network = await lndMock.getNetworkInfo();
      const yieldData = await optimizer.getDailyYield();

      // Clear screen and show header
      console.clear();
      console.info(chalk.hex("#FF6B35").bold(`
╔══════════════════════════════════════════════╗
║        ⚡ LIVE LIGHTNING METRICS v3.5        ║
║         DuoPlus Network Monitor             ║
╚══════════════════════════════════════════════╝
`));

      // Node Status
      console.info(chalk.blue.bold("📊 Node Status"));
      console.info(`  Alias: ${info.alias}`);
      console.info(`  Block: ${info.block_height.toLocaleString()}`);
      console.info(`  Version: ${info.version}`);
      console.info(`  Synced: ${info.synced_to_chain ? "✅" : "❌"} Chain | ${info.synced_to_graph ? "✅" : "❌"} Graph`);
      console.info("");

      // Balance Overview
      const totalBalance = balance.local + balance.remote;
      const localPct = totalBalance > 0 ? (balance.local / totalBalance) * 100 : 0;
      const remotePct = totalBalance > 0 ? (balance.remote / totalBalance) * 100 : 0;

      console.info(chalk.green.bold("💰 Balance Overview"));
      console.info(`  Local:  ${(balance.local / 100000000).toFixed(4)} BTC ($${((balance.local / 100000000) * 45000).toFixed(2)})`);
      console.info(`  Remote: ${(balance.remote / 100000000).toFixed(4)} BTC ($${((balance.remote / 100000000) * 45000).toFixed(2)})`);
      console.info(`  Pending: ${(balance.pending / 100000000).toFixed(4)} BTC`);
      console.info(`  Total:  ${(totalBalance / 100000000).toFixed(4)} BTC ($${((totalBalance / 100000000) * 45000).toFixed(2)})`);
      console.info("");

      // Channel Health
      const activeChannels = balance.activeChannels;
      const totalChannels = balance.channels;
      const healthPct = totalChannels > 0 ? (activeChannels / totalChannels) * 100 : 0;

      console.info(chalk.yellow.bold("🔗 Channel Health"));
      console.info(`  Active: ${activeChannels}/${totalChannels} channels (${healthPct.toFixed(1)}%)`);
      console.info(`  Capacity: ${(balance.total_capacity / 100000000).toFixed(4)} BTC`);
      console.info(`  Avg Channel: ${(balance.total_capacity / totalChannels / 100000000).toFixed(4)} BTC`);
      console.info("");

      // Network Statistics
      console.info(chalk.magenta.bold("🌐 Network Statistics"));
      console.info(`  Nodes: ${network.num_nodes.toLocaleString()}`);
      console.info(`  Channels: ${network.num_channels.toLocaleString()}`);
      console.info(`  Capacity: ${(network.total_network_capacity / 1000000000).toFixed(0)} BTC`);
      console.info(`  Avg Channel Size: ${(network.avg_channel_size / 1000000).toFixed(2)} MSAT`);
      console.info("");

      // Yield Performance
      console.info(chalk.cyan.bold("📈 Yield Performance"));
      console.info(`  Today's Yield: $${yieldData.total.toFixed(2)}`);
      console.info(`  Active Quests: ${yieldData.questCount}`);
      console.info(`  Avg per Quest: $${yieldData.averageYield.toFixed(2)}`);
      console.info("");

      // Channel Details
      console.info(chalk.red.bold("⚡ Channel Details"));
      console.info("┌────┬──────────────┬──────────┬──────────┬────────┐");
      console.info("│ ID │ Local        │ Remote    │ Capacity │ Status │");
      console.info("├────┼──────────────┼──────────┼──────────┼────────┤");

      channels.slice(0, 5).forEach((ch) => {
        const local = (ch.local_balance / 1000).toFixed(0).padStart(6);
        const remote = (ch.remote_balance / 1000).toFixed(0).padStart(6);
        const capacity = (ch.capacity / 1000).toFixed(0).padStart(6);
        const status = ch.active ? "✅" : "❌";
        console.info(`│ ${ch.chan_id.padEnd(2)} │ ${local}K │ ${remote}K │ ${capacity}K │ ${status.padEnd(6)} │`);
      });

      console.info("└────┴──────────────┴──────────┴──────────┴────────┘");

      console.info("");
      console.info(chalk.gray(`⏰ Last updated: ${new Date().toLocaleTimeString()} | Press Ctrl+C to exit`));

    } catch (error: any) {
      console.error("❌ Metrics error:", error.message);
    }
  }, 2000); // Update every 2 seconds
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.info("\n👋 Shutting down live metrics...");
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.info("\n👋 Shutting down live metrics...");
  process.exit(0);
});

// Start the live metrics display
displayLiveMetrics().catch(console.error);