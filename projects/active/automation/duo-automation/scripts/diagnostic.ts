// scripts/diagnostic.ts - v3.7-final
import { $ } from "bun";
import { enhanceSecurityMetrics } from '../types/enhance-metric';
import type { PerfMetric } from '../types/perf-metric';

console.info("🔍 Generating v3.7 Diagnostic Report...");

// 1. Swap file check
const swapCheck = await $`find utils -name ".*!*" -type f 2>/dev/null`.text();

// 2. Module graph check
const dryRun = await $`bun install --dry-run 2>&1`.text();
const hasErrors = dryRun.toLowerCase().includes("error:");

console.info(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 v3.7 Readiness Assessment
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Swap Artifacts:     ${swapCheck.trim() ? "❌ FOUND" : "✅ CLEAN"}
Module Graph:       ${hasErrors ? "❌ ERRORS" : "✅ INTACT"}
Registry Config:    ${Bun.env.NPM_TOKEN ? "✅ TOKEN SET" : "❌ NO TOKEN"}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status: ${!swapCheck.trim() && !hasErrors && Bun.env.NPM_TOKEN ? "🚀 READY" : "⚠️  ACTION REQUIRED"}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

// Example security metrics collection and enhancement
const collectSecurityMetrics = async (): Promise<PerfMetric[]> => [
  {
    category: "Security",
    type: "configuration",
    topic: "Path Hardening",
    subCat: "Initialization",
    id: "getScopedKey",
    value: "ENABLED",
    pattern: "security_pattern",
    locations: 1, // Changed to number to match v3.7 specs
    impact: "high",
    properties: { scope: "v37-scope" }
  }
];

const securityMetrics = await collectSecurityMetrics();
const enhanced = enhanceSecurityMetrics(securityMetrics);

console.info('🔒 SECURITY METRICS (v3.7-hardened):');
console.info(Bun.inspect.table(enhanced, { colors: true }));