#!/usr/bin/env bun
/**
 * Basic IPFoxy API Usage Examples
 * Demonstrates core functionality using TypeScript and Bun
 */

import { IPFoxyClient } from "../src/index.js";

async function main(): Promise<void> {
  console.info("🚀 Starting IPFoxy Basic Usage Demo...");

  try {
    // Initialize client from environment variables
    const client = IPFoxyClient.fromEnv();
    console.info("✅ IPFoxy client initialized successfully");

    // 1. Get available regions
    console.info("\n📍 Getting available proxy regions...");
    const regions = await client.getRegions();
    console.info(`Found ${regions.length} available regions:`);

    // Display first 5 regions
    regions.slice(0, 5).forEach((region, index) => {
      console.info(
        `  ${index + 1}. ${region.country} (${region.country_code}): ${region.region} [${region.ip_type}]`
      );
    });

    if (regions.length === 0) {
      console.info("❌ No regions available");
      return;
    }

    // 2. Get pricing for a sample region
    const sampleRegion = regions[0];
    if (!sampleRegion) {
      console.info("❌ No sample region available");
      return;
    }

    console.info(`\n💰 Getting pricing for ${sampleRegion.country} - ${sampleRegion.region}...`);

    try {
      const priceInfo = await client.getOrderPrice({
        regionId: sampleRegion.id,
        days: 30,
        quantity: 1,
        orderType: "NEW"
      });
      console.info(`Price for 30 days: $${priceInfo.price}`);
    } catch (error) {
      console.info(`⚠️  Could not get pricing: ${error instanceof Error ? error.message : error}`);
    }

    // 3. Get account information
    console.info("\n👤 Getting account information...");
    try {
      const accountInfo = await client.getAccountInfo();
      console.info("Account info retrieved:");
      console.info(`  - Account ID: ${accountInfo.id}`);
      console.info(`  - Balance: $${accountInfo.balance}`);
      console.info(`  - Email: ${accountInfo.email}`);
      console.info(`  - Status: ${accountInfo.status}`);
    } catch (error) {
      console.info(
        `⚠️  Could not get account info: ${error instanceof Error ? error.message : error}`
      );
    }

    // 4. Get proxy list
    console.info("\n📋 Getting proxy list...");
    try {
      const proxyList = await client.getProxyList();
      console.info(`Found ${proxyList.length} proxies in your account`);

      if (proxyList.length > 0) {
        // Display first 3 proxies
        proxyList.slice(0, 3).forEach((proxy, index) => {
          console.info(
            `  ${index + 1}. Proxy ID: ${proxy.id.slice(0, 8)}... | Status: ${proxy.status} | Type: ${proxy.type}`
          );
        });
      }
    } catch (error) {
      console.info(
        `⚠️  Could not get proxy list: ${error instanceof Error ? error.message : error}`
      );
    }

    console.info("\n✅ Basic usage demo completed successfully!");
  } catch (error) {
    console.error(
      "❌ Error during API operations:",
      error instanceof Error ? error.message : error
    );

    if (error instanceof Error && error.message.includes("IPFOXY_API_TOKEN")) {
      console.info(
        "\n💡 Setup tip: Make sure to set IPFOXY_API_TOKEN and IPFOXY_API_ID in your .env file"
      );
    }
  }
}

// Run the demo
main().catch(console.error);
