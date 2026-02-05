#!/usr/bin/env bun
/**
 * Store API Keys in Bun Secrets
 * Example script for getting started with Bun Secrets API
 */

import { secrets } from "bun";

async function storeApiKey() {
  const serviceName = "empire-pro-config-empire";
  
  console.log("🔐 Storing API keys in Bun Secrets...");
  
  // Store different types of API keys
  await secrets.set({
    service: serviceName,
    name: "OPENAI_API_KEY",
    value: "sk-your-openai-key-here"
  });
  
  await secrets.set({
    service: serviceName, 
    name: "STRIPE_SECRET_KEY",
    value: "sk_live_your-stripe-key-here"
  });
  
  await secrets.set({
    service: serviceName,
    name: "DATABASE_URL", 
    value: "postgresql://user:pass@localhost:5432/db"
  });
  
  console.log("✅ API keys stored securely in Bun Secrets");
  console.log("🔒 Credentials are encrypted by your operating system");
  console.log("");
  console.log("To retrieve these keys, run:");
  console.log("bun run get-api-key.ts OPENAI_API_KEY");
}

storeApiKey().catch(console.error);
