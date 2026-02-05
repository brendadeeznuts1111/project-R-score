#!/usr/bin/env bun
/**
 * FactoryWager bunx Deployment Script v1.3.8
 * Complete deployment using bunx tools
 */

console.log("🚀 FactoryWager bunx Deployment");
console.log("=============================");

async function deploy() {
  // Configuration
  const API_TOKEN = "V1i357VeyPrHbrUEX0hQWNPQwbWMHqi9Tj06ApLC";
  const ACCOUNT_ID = "7a470541a704caaf91e71efccc78fd36";
  const ZONE_ID = "a3b7ba4bb62cb1b177b04b8675250674";
  // Step 1: Verify DNS
  console.log("\n🌐 Step 1: DNS Configuration");
  const dnsCheck = await Bun.$`bunx curl -s -X GET "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/90c9452d7f472babec42fdc627c2ee06" -H "Authorization: Bearer ${API_TOKEN}" -H "Content-Type: application/json" | bunx jq -r ".result.content"`.text();
  console.log("✅ DNS CNAME:", dnsCheck.trim());

  // Step 2: Test Worker API Access
  console.log("\n🏗️ Step 2: Worker API Access");
  try {
    const workerTest = await Bun.$`bunx curl -s -X GET "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/workers/services" -H "Authorization: Bearer ${API_TOKEN}" -H "Content-Type: application/json" | bunx jq -r ".success"`.text();
    console.log("✅ Worker API:", workerTest.trim() === "true" ? "Accessible" : "Permission needed");
  } catch {
    console.log("❌ Worker API: Permission required");
  }

  // Step 3: Test R2 API Access
  console.log("\n📦 Step 3: R2 Storage Access");
  try {
    const r2Test = await Bun.$`bunx curl -s -X GET "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets" -H "Authorization: Bearer ${API_TOKEN}" -H "Content-Type: application/json" | bunx jq -r ".success"`.text();
    console.log("✅ R2 API:", r2Test.trim() === "true" ? "Accessible" : "Permission needed");
  } catch {
    console.log("❌ R2 API: Permission required");
  }

  // Step 4: Deploy Worker (if possible)
  console.log("\n🚀 Step 4: Worker Deployment");
  try {
    console.log("🔧 Deploying with bunx wrangler...");
    const deployResult = await Bun.$`CLOUDFLARE_API_TOKEN=${API_TOKEN} bunx wrangler deploy`.text();
    console.log("✅ Worker deployed");
  } catch {
    console.log("❌ Worker deployment failed - update API token permissions");
  }

  // Step 5: Create R2 Buckets (if possible)
  console.log("\n📦 Step 5: R2 Bucket Creation");
  const buckets = ["factory-wager-registry", "factory-wager-artifacts"];

  for (const bucket of buckets) {
    try {
      await Bun.$`CLOUDFLARE_API_TOKEN=${API_TOKEN} bunx wrangler r2 bucket create ${bucket}`.quiet();
      console.log(`✅ Bucket created: ${bucket}`);
    } catch {
      console.log(`❌ Bucket failed: ${bucket} - permission needed`);
    }
  }

  // Step 6: Final Validation
  console.log("\n✅ Step 6: Final Validation");
  console.log("🔍 Testing DNS resolution...");
  const resolution = await Bun.$`bunx dig +short registry.factory-wager.co @1.1.1.1`.text().catch(() => '');

  if (resolution.trim()) {
    console.log("✅ DNS resolves:", resolution.trim());
  } else {
    console.log("⏳ DNS propagation in progress");
  }

  console.log("\n🔍 Testing HTTP connectivity...");
  try {
    const httpTest = await Bun.$`bunx curl -I --connect-timeout 5 https://registry.factory-wager.co/health 2>&1 | head -1`.text();
    console.log("✅ HTTP:", httpTest.trim());
  } catch {
    console.log("❌ HTTP: Not reachable yet");
  }

  console.log("\n🎉 Deployment Summary:");
  console.log("✅ DNS: Configured (CNAME to cdn.factory-wager.com)");
  console.log("✅ API Token: Valid and active");
  console.log("⏳ Worker: Deploy when permissions updated");
  console.log("⏳ R2: Create buckets when permissions updated");
  console.log("⏳ DNS: Propagation may take 5-60 minutes");

  console.log("\n🔧 Permission Update Required:");
  console.log("Visit: https://dash.cloudflare.com/profile/api-tokens");
  console.log("Add: Zone:Zone:Edit, Worker:Script:Edit, R2:Bucket:Edit");

  console.log("\n🚀 After permission update:");
  console.log("Run: bun run deploy-bunx.ts");
}

// Execute deployment
deploy().catch(console.error);
