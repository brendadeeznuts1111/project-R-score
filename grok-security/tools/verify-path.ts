#!/usr/bin/env bun
// [1.0.0.0] Bun PATH Security Audit Tool
// Run with: bun run path:audit
// Bun runtime provides the `$` shell helper globally (no import needed)

import { existsSync } from "fs";
import { join } from "path";

const isWindows = process.platform === "win32";
const pathSeparator = isWindows ? ";" : ":";
const bunExecutable = isWindows ? "bun.exe" : "bun";

console.log("\n🔍 Bun PATH Security Audit");
console.log("=".repeat(60));

// Get PATH and split into segments
const pathEnv = process.env.PATH || "";
const pathSegments = pathEnv.split(pathSeparator).filter(Boolean);

console.log(`📊 Total PATH segments: ${pathSegments.length}`);
console.log(`📏 PATH length: ${pathEnv.length} characters\n`);

// 1. Check if Bun is accessible
let bunFound = false;
try {
  const proc = Bun.spawn([bunExecutable, "--version"], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const output = await new Response(proc.stdout).text();
  bunFound = true;
  console.log(`✅ Bun executable accessible: ${output.trim()}`);
} catch {
  console.log("❌ Bun executable NOT accessible");
}

// 2. Find Bun in PATH segments
const bunSegments = pathSegments.filter((segment) => {
  const fullPath = join(segment, bunExecutable);
  return existsSync(fullPath);
});

if (bunSegments.length > 0) {
  console.log(`✅ Bun found in PATH at: ${bunSegments[0]}`);
  if (bunSegments.length > 1) {
    console.log("⚠️ Multiple Bun installations detected:");
    bunSegments.forEach((seg, i) => console.log(`   ${i + 1}. ${seg}`));
  }
} else {
  console.log("❌ Bun NOT found in any PATH segment");
}

// 3. Security audit - check for dangerous PATH entries
const dangerousPatterns = [
  { pattern: /^\.+$/, risk: "CRITICAL", desc: "Current/parent directory" },
  { pattern: /temp|tmp/i, risk: "HIGH", desc: "Temporary directory" },
  { pattern: /downloads?/i, risk: "HIGH", desc: "Downloads directory" },
  { pattern: /desktop/i, risk: "MEDIUM", desc: "Desktop directory" },
  { pattern: /^$/, risk: "HIGH", desc: "Empty PATH segment" },
  { pattern: /\*|\?/, risk: "CRITICAL", desc: "Wildcard characters" },
];

interface SecurityIssue {
  segment: string;
  risk: string;
  desc: string;
}

const securityIssues: SecurityIssue[] = [];

pathSegments.forEach((segment) => {
  dangerousPatterns.forEach(({ pattern, risk, description }) => {
    if (pattern.test(segment)) {
      securityIssues.push({ segment, risk, desc: description });
    }
  });
});

if (securityIssues.length > 0) {
  console.log("\n🚨 SECURITY ISSUES DETECTED:");
  securityIssues.forEach(({ segment, risk, desc }) => {
    const icon = risk === "CRITICAL" ? "🔴" : risk === "HIGH" ? "🟠" : "🟡";
    console.log(`   ${icon} ${risk}: ${segment} (${desc})`);
  });
} else {
  console.log("\n✅ No obvious security issues in PATH");
}

// 4. Check PATH length limits (Windows has 2048 char limit)
if (isWindows && pathEnv.length > 2000) {
  console.log(
    `\n⚠️ PATH approaching Windows limit: ${pathEnv.length}/2048 characters`
  );
}

// 5. Final assessment
console.log("\n" + "=".repeat(60));
const criticalIssues = securityIssues.filter(
  (i) => i.risk === "CRITICAL"
).length;
const highIssues = securityIssues.filter((i) => i.risk === "HIGH").length;

if (!bunFound) {
  console.log("❌ CONFIGURATION FAILED: Bun not accessible");
  process.exit(1);
} else if (criticalIssues > 0) {
  console.log("❌ CRITICAL SECURITY ISSUES: Fix immediately");
  process.exit(1);
} else if (highIssues > 0) {
  console.log("⚠️ HIGH SECURITY RISKS: Review and fix");
  process.exit(1);
} else {
  console.log("✅ PATH CONFIGURATION SECURE AND FUNCTIONAL");
  process.exit(0);
}
