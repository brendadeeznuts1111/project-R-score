#!/usr/bin/env bun

/**
 * AI Environment Variables Demo
 * Demonstrates the behavior of AI-friendly output flags
 */

console.info("🤖 AI Environment Variables Demo");
console.info("=================================");

// Check which AI environment variables are set
const isClaudeCode = process.env.CLAUDECODE === "1";
const isReplit = process.env.REPL_ID === "1";
const isGenericAgent = process.env.AGENT === "1";

console.info("\n📊 Current Environment:");
console.info(`   CLAUDECODE=${process.env.CLAUDECODE || "not set"}`);
console.info(`   REPL_ID=${process.env.REPL_ID || "not set"}`);
console.info(`   AGENT=${process.env.AGENT || "not set"}`);

console.info("\n🔍 AI Agent Detection:");
console.info(`   Claude Code: ${isClaudeCode ? "✅" : "❌"}`);
console.info(`   Replit: ${isReplit ? "✅" : "❌"}`);
console.info(`   Generic Agent: ${isGenericAgent ? "✅" : "❌"}`);

// Demonstrate AI-friendly output behavior
if (isClaudeCode || isReplit || isGenericAgent) {
  console.info("\n🤖 AI-friendly mode: ON");
  console.info("   ✅ Only showing essential information");
  console.info("   ✅ Hiding verbose output");
  console.info("   ✅ Focusing on critical data");

  // Simulate test results with AI-friendly formatting
  console.info("\n🧪 Test Results (AI Mode):");
  console.info("   ❌ 2 failed");
  console.info("   ✅ 15 passed");
  console.info("   ⚠️  1 skipped");
  console.info("   📊 Total: 18 tests");
} else {
  console.info("\n📋 Standard mode: ON");
  console.info("   📝 Showing detailed output");
  console.info("   📝 Including all test information");

  // Simulate detailed test results
  console.info("\n🧪 Test Results (Standard Mode):");
  console.info("   ✅ test-authentication.js");
  console.info("   ✅ test-database-connection.js");
  console.info("   ✅ test-api-endpoints.js");
  console.info("   ❌ test-payment-processing.js - Timeout error");
  console.info("   ✅ test-user-registration.js");
  console.info("   ⚠️  test-admin-functions.js - Skipped (requires admin privileges)");
  console.info("   ❌ test-file-upload.js - File size exceeded");
  console.info("   📊 Summary: 15 passed, 2 failed, 1 skipped");
}

console.info("\n💡 Usage Examples:");
console.info("   CLAUDECODE=1 bun test");
console.info("   REPL_ID=1 bun run build");
console.info("   AGENT=1 bun run scripts/playbook-auditor.ts");

console.info("\n🎯 Benefits:");
console.info("   • Reduces output verbosity");
console.info("   • Focuses on critical failures");
console.info("   • Improves AI context efficiency");
console.info("   • Maintains essential information");

if (import.meta.main) {
  // Allow running this script directly
  console.info("\n🚀 Run this demo with different flags:");
  console.info("   bun run scripts/demo-ai-env-vars.bun.ts");
  console.info("   CLAUDECODE=1 bun run scripts/demo-ai-env-vars.bun.ts");
  console.info("   REPL_ID=1 bun run scripts/demo-ai-env-vars.bun.ts");
}
