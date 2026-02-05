#!/usr/bin/env bun
/**
 * Get API Keys from Bun Secrets
 * Example script for retrieving stored credentials
 */

import { secrets } from "bun";

async function getApiKey(keyName: string) {
  const serviceName = "empire-pro-config-empire";
  
  const value = await secrets.get({
    service: serviceName,
    name: keyName
  });
  
  if (value) {
    if (keyName.includes('KEY')) {
      console.log(`${keyName}: ${value.substring(0, 10)}...`);
    } else {
      console.log(`${keyName}: ${value}`);
    }
    return value;
  } else {
    console.log(`❌ ${keyName} not found`);
    console.log("💡 Run 'bun run store-api-key.ts' to store API keys first");
    return null;
  }
}

// Get specific key or show usage
const keyName = process.argv[2];
if (keyName) {
  getApiKey(keyName);
} else {
  console.log("Usage: bun run get-api-key.ts <key-name>");
  console.log("");
  console.log("Available keys:");
  console.log("  OPENAI_API_KEY");
  console.log("  STRIPE_SECRET_KEY");
  console.log("  DATABASE_URL");
}
