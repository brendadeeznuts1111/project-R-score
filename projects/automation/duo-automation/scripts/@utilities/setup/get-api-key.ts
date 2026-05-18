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
      console.info(`${keyName}: ${value.substring(0, 10)}...`);
    } else {
      console.info(`${keyName}: ${value}`);
    }
    return value;
  } else {
    console.info(`❌ ${keyName} not found`);
    console.info("💡 Run 'bun run store-api-key.ts' to store API keys first");
    return null;
  }
}

// Get specific key or show usage
const keyName = process.argv[2];
if (keyName) {
  getApiKey(keyName);
} else {
  console.info("Usage: bun run get-api-key.ts <key-name>");
  console.info("");
  console.info("Available keys:");
  console.info("  OPENAI_API_KEY");
  console.info("  STRIPE_SECRET_KEY");
  console.info("  DATABASE_URL");
}
