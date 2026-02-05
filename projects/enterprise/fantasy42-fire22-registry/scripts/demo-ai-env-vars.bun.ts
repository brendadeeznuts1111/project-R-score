#!/usr/bin/env bun

/**
 * AI Environment Variables Demo
 * Demonstrates the behavior of AI-friendly output flags
 */

console.log("🤖 AI Environment Variables Demo");
console.log("=================================");

// Check which AI environment variables are set
const isClaudeCode = process.env.CLAUDECODE === "1";
const isReplit = process.env.REPL_ID === "1";
const isGenericAgent = process.env.AGENT === "1";

console.log("\n📊 Current Environment:");
console.log(`   CLAUDECODE=${process.env.CLAUDECODE || "not set"}`);
console.log(`   REPL_ID=${process.env.REPL_ID || "not set"}`);
console.log(`   AGENT=${process.env.AGENT || "not set"}`);

console.log("\n🔍 AI Agent Detection:");
console.log(`   Claude Code: ${isClaudeCode ? "✅" : "❌"}`);
console.log(`   Replit: ${isReplit ? "✅" : "❌"}`);
console.log(`   Generic Agent: ${isGenericAgent ? "✅" : "❌"}`);

// Demonstrate AI-friendly output behavior
if (isClaudeCode || isReplit || isGenericAgent) {
  console.log("\n🤖 AI-friendly mode: ON");
  console.log("   ✅ Only showing essential information");
  console.log("   ✅ Hiding verbose output");
  console.log("   ✅ Focusing on critical data");

  // Simulate test results with AI-friendly formatting
  console.log("\n🧪 Test Results (AI Mode):");
  console.log("   ❌ 2 failed");
  console.log("   ✅ 15 passed");
  console.log("   ⚠️  1 skipped");
  console.log("   📊 Total: 18 tests");
} else {
  console.log("\n📋 Standard mode: ON");
  console.log("   📝 Showing detailed output");
  console.log("   📝 Including all test information");

  // Simulate detailed test results
  console.log("\n🧪 Test Results (Standard Mode):");
  console.log("   ✅ test-authentication.js");
  console.log("   ✅ test-database-connection.js");
  console.log("   ✅ test-api-endpoints.js");
  console.log("   ❌ test-payment-processing.js - Timeout error");
  console.log("   ✅ test-user-registration.js");
  console.log("   ⚠️  test-admin-functions.js - Skipped (requires admin privileges)");
  console.log("   ❌ test-file-upload.js - File size exceeded");
  console.log("   📊 Summary: 15 passed, 2 failed, 1 skipped");
}

console.log("\n💡 Usage Examples:");
console.log("   CLAUDECODE=1 bun test");
console.log("   REPL_ID=1 bun run build");
console.log("   AGENT=1 bun run scripts/playbook-auditor.ts");

console.log("\n🎯 Benefits:");
console.log("   • Reduces output verbosity");
console.log("   • Focuses on critical failures");
console.log("   • Improves AI context efficiency");
console.log("   • Maintains essential information");

if (import.meta.main) {
  // Allow running this script directly
  console.log("\n🚀 Run this demo with different flags:");
  console.log("   bun run scripts/demo-ai-env-vars.bun.ts");
  console.log("   CLAUDECODE=1 bun run scripts/demo-ai-env-vars.bun.ts");
  console.log("   REPL_ID=1 bun run scripts/demo-ai-env-vars.bun.ts");
}
