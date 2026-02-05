#!/usr/bin/env bun
/**
 * IPFoxy Proxy Purchase Example
 * Demonstrates proxy purchase workflow using TypeScript and Bun
 */

import { IPFoxyClient } from "../src/index.js";

async function main(): Promise<void> {
  console.log("🛒 Starting IPFoxy Purchase Demo...");

  try {
    // Initialize client from environment variables
    const client = IPFoxyClient.fromEnv();
    console.log("✅ IPFoxy client initialized");

    // Step 1: Get available regions
    console.log("\n📍 Step 1: Getting available regions...");
    const regions = await client.getRegions();

    if (regions.length === 0) {
      console.log("❌ No regions available");
      return;
    }

    // Display available regions
    console.log("Available regions:");
    regions.slice(0, 10).forEach((region, index) => {
      console.log(
        `  ${index + 1}. ${region.country} (${region.country_code}): ${region.region} [${region.ip_type}] - ID: ${region.id}`
      );
    });

    // Step 2: Select a region (for demo, use first available)
    const selectedRegion = regions[0];
    if (!selectedRegion) {
      console.log("❌ No region available for selection");
      return;
    }

    console.log(
      `\n🎯 Step 2: Selected region: ${selectedRegion.country} - ${selectedRegion.region}`
    );

    // Step 3: Get pricing
    console.log("\n💰 Step 3: Getting pricing...");
    try {
      const priceInfo = await client.getOrderPrice({
        regionId: selectedRegion.id,
        days: 30,
        quantity: 1,
        orderType: "NEW"
      });
      console.log(`Price for 30 days: $${priceInfo.price}`);
      console.log(`Order type: ${priceInfo.order_type}`);
    } catch (error) {
      console.log(`⚠️  Could not get pricing: ${error instanceof Error ? error.message : error}`);
      console.log("This might be expected if the account doesn't have purchasing permissions");
      return;
    }

    // Step 4: Confirm purchase (commented out for safety)
    console.log("\n🛒 Step 4: Ready to purchase...");
    console.log("⚠️  PURCHASE IS COMMENTED OUT FOR SAFETY");
    console.log("To actually purchase, uncomment the purchase code below");

    // Uncomment the following lines to actually purchase:
    /*
    try {
      const orderResult = await client.purchaseProxy({
        regionId: selectedRegion.id,
        days: 30,
        quantity: 1
      });
      
      console.log(`✅ Purchase successful! Order ID: ${orderResult.order_id}`);
      
      // Step 5: Get order details
      const orderInfo = await client.getOrderInfo(orderResult.order_id);
      console.log('Order details:');
      console.log(`  - Order ID: ${orderInfo.order_id}`);
      console.log(`  - Status: ${orderInfo.status}`);
      console.log(`  - Total: $${orderInfo.total}`);
      console.log(`  - Proxies: ${orderInfo.proxies.length}`);
      
    } catch (error) {
      console.error(`❌ Purchase failed: ${error instanceof Error ? error.message : error}`);
    }
    */

    console.log("\n✅ Purchase workflow demo completed!");
    console.log("Note: Actual purchase code is commented out for safety");
  } catch (error) {
    console.error(
      "❌ Error during purchase workflow:",
      error instanceof Error ? error.message : error
    );
  }
}

// Run the demo
main().catch(console.error);
