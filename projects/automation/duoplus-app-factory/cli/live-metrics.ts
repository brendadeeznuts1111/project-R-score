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
  console.log(chalk.hex("#FF6B35").bold(`
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
      console.log(chalk.hex("#FF6B35").bold(`
╔══════════════════════════════════════════════╗
║        ⚡ LIVE LIGHTNING METRICS v3.5        ║
║         DuoPlus Network Monitor             ║
╚══════════════════════════════════════════════╝
`));

      // Node Status
      console.log(chalk.blue.bold("📊 Node Status"));
      console.log(`  Alias: ${info.alias}`);
      console.log(`  Block: ${info.block_height.toLocaleString()}`);
      console.log(`  Version: ${info.version}`);
      console.log(`  Synced: ${info.synced_to_chain ? "✅" : "❌"} Chain | ${info.synced_to_graph ? "✅" : "❌"} Graph`);
      console.log("");

      // Balance Overview
      const totalBalance = balance.local + balance.remote;
      const localPct = totalBalance > 0 ? (balance.local / totalBalance) * 100 : 0;
      const remotePct = totalBalance > 0 ? (balance.remote / totalBalance) * 100 : 0;

      console.log(chalk.green.bold("💰 Balance Overview"));
      console.log(`  Local:  ${(balance.local / 100000000).toFixed(4)} BTC ($${((balance.local / 100000000) * 45000).toFixed(2)})`);
      console.log(`  Remote: ${(balance.remote / 100000000).toFixed(4)} BTC ($${((balance.remote / 100000000) * 45000).toFixed(2)})`);
      console.log(`  Pending: ${(balance.pending / 100000000).toFixed(4)} BTC`);
      console.log(`  Total:  ${(totalBalance / 100000000).toFixed(4)} BTC ($${((totalBalance / 100000000) * 45000).toFixed(2)})`);
      console.log("");

      // Channel Health
      const activeChannels = balance.activeChannels;
      const totalChannels = balance.channels;
      const healthPct = totalChannels > 0 ? (activeChannels / totalChannels) * 100 : 0;

      console.log(chalk.yellow.bold("🔗 Channel Health"));
      console.log(`  Active: ${activeChannels}/${totalChannels} channels (${healthPct.toFixed(1)}%)`);
      console.log(`  Capacity: ${(balance.total_capacity / 100000000).toFixed(4)} BTC`);
      console.log(`  Avg Channel: ${(balance.total_capacity / totalChannels / 100000000).toFixed(4)} BTC`);
      console.log("");

      // Network Statistics
      console.log(chalk.magenta.bold("🌐 Network Statistics"));
      console.log(`  Nodes: ${network.num_nodes.toLocaleString()}`);
      console.log(`  Channels: ${network.num_channels.toLocaleString()}`);
      console.log(`  Capacity: ${(network.total_network_capacity / 1000000000).toFixed(0)} BTC`);
      console.log(`  Avg Channel Size: ${(network.avg_channel_size / 1000000).toFixed(2)} MSAT`);
      console.log("");

      // Yield Performance
      console.log(chalk.cyan.bold("📈 Yield Performance"));
      console.log(`  Today's Yield: $${yieldData.total.toFixed(2)}`);
      console.log(`  Active Quests: ${yieldData.questCount}`);
      console.log(`  Avg per Quest: $${yieldData.averageYield.toFixed(2)}`);
      console.log("");

      // Channel Details
      console.log(chalk.red.bold("⚡ Channel Details"));
      console.log("┌────┬──────────────┬──────────┬──────────┬────────┐");
      console.log("│ ID │ Local        │ Remote    │ Capacity │ Status │");
      console.log("├────┼──────────────┼──────────┼──────────┼────────┤");

      channels.slice(0, 5).forEach((ch) => {
        const local = (ch.local_balance / 1000).toFixed(0).padStart(6);
        const remote = (ch.remote_balance / 1000).toFixed(0).padStart(6);
        const capacity = (ch.capacity / 1000).toFixed(0).padStart(6);
        const status = ch.active ? "✅" : "❌";
        console.log(`│ ${ch.chan_id.padEnd(2)} │ ${local}K │ ${remote}K │ ${capacity}K │ ${status.padEnd(6)} │`);
      });

      console.log("└────┴──────────────┴──────────┴──────────┴────────┘");

      console.log("");
      console.log(chalk.gray(`⏰ Last updated: ${new Date().toLocaleTimeString()} | Press Ctrl+C to exit`));

    } catch (error: any) {
      console.error("❌ Metrics error:", error.message);
    }
  }, 2000); // Update every 2 seconds
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log("\n👋 Shutting down live metrics...");
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log("\n👋 Shutting down live metrics...");
  process.exit(0);
});

// Start the live metrics display
displayLiveMetrics().catch(console.error);