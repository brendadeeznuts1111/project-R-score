#!/usr/bin/env bun

/**
 * AI Mode Comparison Demo
 * Clear demonstration of AI environment variable behavior
 */

const isAiMode = process.env.CLAUDECODE === "1" ||
                 process.env.REPL_ID === "1" ||
                 process.env.AGENT === "1";

console.log("🤖 AI Environment Variable Comparison");
console.log("====================================");

if (isAiMode) {
  console.log("\n🟢 AI MODE ACTIVE");
  console.log("📊 Summary Statistics:");
  console.log("   ❌ 2 failed tests");
  console.log("   ✅ 147 passed tests");
  console.log("   ⚠️  5 skipped tests");
  console.log("   📈 89% coverage");
  console.log("\n🚨 Critical Issues:");
  console.log("   • PCI compliance validation failed");
  console.log("   • Database migration constraint error");
} else {
  console.log("\n🔴 STANDARD MODE");
  console.log("📋 Detailed Test Results:");
  console.log("   ✅ test-user-authentication.ts");
  console.log("   ✅ test-password-hashing.ts");
  console.log("   ✅ test-session-management.ts");
  console.log("   ❌ test-payment-validation.ts - PCI compliance failed");
  console.log("   ✅ test-betting-engine.ts");
  console.log("   ✅ test-fantasy-league.ts");
  console.log("   ❌ test-database-migration.ts - Foreign key constraint");
  console.log("   ⚠️  test-admin-panel.ts - Skipped (admin required)");
  console.log("   ✅ test-api-rate-limiting.ts");
  console.log("   📊 147 passed, 2 failed, 5 skipped, 89% coverage");
}

console.log("\n💡 Try these commands:");
console.log("   bun run scripts/ai-mode-comparison.bun.ts              # Standard mode");
console.log("   CLAUDECODE=1 bun run scripts/ai-mode-comparison.bun.ts # Claude Code mode");
console.log("   REPL_ID=1 bun run scripts/ai-mode-comparison.bun.ts    # Replit mode");
console.log("   AGENT=1 bun run scripts/ai-mode-comparison.bun.ts      # Generic AI mode");
