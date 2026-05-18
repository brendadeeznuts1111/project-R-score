#!/usr/bin/env bun
/**
 * IPFoxy Account Monitoring Example
 * Demonstrates account monitoring using TypeScript and Bun
 */

import { IPFoxyClient } from "../src/index.js";

async function printAccountSummary(client: IPFoxyClient): Promise<void> {
  try {
    const accountInfo = await client.getAccountInfo();
    console.info("📊 Account Summary:");
    console.info(`  Account ID: ${accountInfo.id}`);
    console.info(`  Balance: $${accountInfo.balance}`);
    console.info(`  Email: ${accountInfo.email}`);
    console.info(`  Status: ${accountInfo.status}`);
  } catch (error) {
    console.info(`❌ Could not get account info: ${error instanceof Error ? error.message : error}`);
  }
}

async function printProxyStatus(client: IPFoxyClient): Promise<void> {
  try {
    const proxyList = await client.getProxyList();
    console.info(`\n🔌 Proxy Status (${proxyList.length} total):`);

    if (proxyList.length === 0) {
      console.info("  No proxies found");
      return;
    }

    let activeCount = 0;
    let expiredCount = 0;

    proxyList.forEach((proxy) => {
      const status = proxy.status.toLowerCase();
      if (status === "active") {
        activeCount++;
      } else if (status === "expired" || status === "inactive") {
        expiredCount++;
      }

      console.info(
        `  - ID: ${proxy.id.slice(0, 8)}... | Status: ${proxy.status} | Type: ${proxy.type} | Expires: ${proxy.expires}`
      );
    });

    console.info(`\n  🟢 Active: ${activeCount}`);
    console.info(`  🔴 Expired/Inactive: ${expiredCount}`);
  } catch (error) {
    console.info(`❌ Could not get proxy list: ${error instanceof Error ? error.message : error}`);
  }
}

async function monitorLoop(client: IPFoxyClient, intervalMinutes: number = 5): Promise<void> {
  console.info(`\n🔄 Starting monitoring loop (checking every ${intervalMinutes} minutes)...`);
  console.info("Press Ctrl+C to stop");

  while (true) {
    const timestamp = new Date().toLocaleString();
    console.info(`\n${"=".repeat(50)}`);
    console.info(`🕐 Check at: ${timestamp}`);
    console.info("=".repeat(50));

    // Get account summary
    await printAccountSummary(client);

    // Get proxy status
    await printProxyStatus(client);

    console.info(`\n⏳ Next check in ${intervalMinutes} minutes...`);

    // Wait for the specified interval
    await new Promise((resolve) => setTimeout(resolve, intervalMinutes * 60 * 1000));
  }
}

async function main(): Promise<void> {
  console.info("🔍 IPFoxy Account Monitoring");

  try {
    // Initialize client from environment variables
    const client = IPFoxyClient.fromEnv();
    console.info("✅ IPFoxy client initialized");

    console.info("\nChoose monitoring mode:");
    console.info("1. One-time check");
    console.info("2. Continuous monitoring");

    // For demo purposes, we'll use one-time check
    // In a real application, you might want to use readline or a similar approach
    const choice = "1"; // Hardcoded for demo

    if (choice === "1") {
      console.info("\n📋 Performing one-time check...");
      await printAccountSummary(client);
      await printProxyStatus(client);
      console.info("\n✅ One-time check completed");
    } else if (choice === "2") {
      const interval = 5; // Default 5 minutes
      await monitorLoop(client, interval);
    } else {
      console.info("❌ Invalid choice");
    }
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : error);

    if (error instanceof Error && error.message.includes("IPFOXY_API_TOKEN")) {
      console.info(
        "\n💡 Setup tip: Make sure to set IPFOXY_API_TOKEN and IPFOXY_API_ID in your .env file"
      );
    }
  }
}

// Handle Ctrl+C gracefully
if (typeof process !== "undefined") {
  process?.on?.("SIGINT", () => {
    console.info("\n\n🛑 Monitoring stopped by user");
    process?.exit?.(0);
  });
}

// Run the demo
main().catch(console.error);
