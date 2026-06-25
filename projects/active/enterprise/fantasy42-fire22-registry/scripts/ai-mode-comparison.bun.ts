#!/usr/bin/env bun

/**
 * AI Mode Comparison Demo
 * Clear demonstration of AI environment variable behavior
 */

const isAiMode = process.env.CLAUDECODE === "1" ||
                 process.env.REPL_ID === "1" ||
                 process.env.AGENT === "1";

console.info("🤖 AI Environment Variable Comparison");
console.info("====================================");

if (isAiMode) {
  console.info("\n🟢 AI MODE ACTIVE");
  console.info("📊 Summary Statistics:");
  console.info("   ❌ 2 failed tests");
  console.info("   ✅ 147 passed tests");
  console.info("   ⚠️  5 skipped tests");
  console.info("   📈 89% coverage");
  console.info("\n🚨 Critical Issues:");
  console.info("   • PCI compliance validation failed");
  console.info("   • Database migration constraint error");
} else {
  console.info("\n🔴 STANDARD MODE");
  console.info("📋 Detailed Test Results:");
  console.info("   ✅ test-user-authentication.ts");
  console.info("   ✅ test-password-hashing.ts");
  console.info("   ✅ test-session-management.ts");
  console.info("   ❌ test-payment-validation.ts - PCI compliance failed");
  console.info("   ✅ test-betting-engine.ts");
  console.info("   ✅ test-fantasy-league.ts");
  console.info("   ❌ test-database-migration.ts - Foreign key constraint");
  console.info("   ⚠️  test-admin-panel.ts - Skipped (admin required)");
  console.info("   ✅ test-api-rate-limiting.ts");
  console.info("   📊 147 passed, 2 failed, 5 skipped, 89% coverage");
}

console.info("\n💡 Try these commands:");
console.info("   bun run scripts/ai-mode-comparison.bun.ts              # Standard mode");
console.info("   CLAUDECODE=1 bun run scripts/ai-mode-comparison.bun.ts # Claude Code mode");
console.info("   REPL_ID=1 bun run scripts/ai-mode-comparison.bun.ts    # Replit mode");
console.info("   AGENT=1 bun run scripts/ai-mode-comparison.bun.ts      # Generic AI mode");
