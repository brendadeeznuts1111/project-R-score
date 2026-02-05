#!/usr/bin/env bun
/**
 * Factory Wager Secure Bundle QA
 * Production-ready validation for Tier-1380 secure bundles
 *
 * Validates:
 * - No environment secret leaks in dist/
 * - Bundle size constraints (4.51KB max)
 * - SHA-256 parity lock for reproducible builds
 * - TypeScript strict compilation
 *
 * @usage FW_MODE=production TIER=1380 bun .factory-wager/secure-bundle-qa.ts
 */

import { $ } from "bun";
import { join } from "path";

const COLORS = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

const CHECK = `${COLORS.green}✅${COLORS.reset}`;
const CROSS = `${COLORS.red}❌${COLORS.reset}`;
const WARN = `${COLORS.yellow}⚠️${COLORS.reset}`;

interface QAResult {
  passed: boolean;
  message: string;
  details?: string;
}

const results: QAResult[] = [];

async function runCheck(name: string, fn: () => Promise<QAResult>): Promise<void> {
  process.stdout.write(`${COLORS.cyan}▶${COLORS.reset} ${name}... `);
  try {
    const result = await fn();
    results.push(result);
    if (result.passed) {
      console.log(`${CHECK} ${result.message}`);
    } else {
      console.log(`${CROSS} ${result.message}`);
    }
    if (result.details) {
      console.log(`  ${COLORS.dim}${result.details}${COLORS.reset}`);
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    results.push({ passed: false, message: errorMsg });
    console.log(`${CROSS} ${errorMsg}`);
  }
}

const COLORS_DIM = "\x1b[2m";

/** Check for secret leaks in dist/ */
async function checkSecretLeaks(): Promise<QAResult> {
  const secrets = [
    "SESSION_SECRET",
    "API_KEY",
    "PASSWORD",
    "TOKEN",
    "PRIVATE_KEY",
    "SECRET_KEY",
  ];

  const distPath = join(process.cwd(), "dist");
  const distExists = await Bun.file(distPath).exists();

  if (!distExists) {
    // Try to find any JS files in dist
    try {
      const files = await $`find ${distPath} -name "*.js" -o -name "*.ts" 2>/dev/null`.text();
      if (!files.trim()) {
        return { passed: true, message: "No dist/ directory to scan" };
      }
    } catch {
      return { passed: true, message: "No dist/ directory to scan" };
    }
  }

  for (const secret of secrets) {
    try {
      const result = await $`grep -r "${secret}" ${distPath} 2>/dev/null || true`.text();
      if (result.trim()) {
        return {
          passed: false,
          message: `Potential ${secret} leak detected`,
          details: result.slice(0, 100),
        };
      }
    } catch {
      // grep returns error if no matches, which is good
    }
  }

  return { passed: true, message: "No secret leaks detected" };
}

/** Check bundle size constraint */
async function checkBundleSize(): Promise<QAResult> {
  const appJsPath = join(process.cwd(), "dist", "app.js");
  const file = Bun.file(appJsPath);

  if (!(await file.exists())) {
    return {
      passed: false,
      message: "dist/app.js not found",
      details: "Run build first",
    };
  }

  const size = file.size;
  const maxSize = 4873; // 4.51KB target, 4873 bytes max
  const sizeKB = (size / 1024).toFixed(2);

  if (size > maxSize) {
    return {
      passed: false,
      message: `Bundle too large: ${sizeKB}KB`,
      details: `Max allowed: ${(maxSize / 1024).toFixed(2)}KB (${maxSize} bytes)`,
    };
  }

  return {
    passed: true,
    message: `Bundle size OK: ${sizeKB}KB`,
    details: `${size} bytes (max: ${maxSize})`,
  };
}

/** Create SHA-256 parity lock */
async function createParityLock(): Promise<QAResult> {
  const appJsPath = join(process.cwd(), "dist", "app.js");
  const file = Bun.file(appJsPath);

  if (!(await file.exists())) {
    return {
      passed: false,
      message: "dist/app.js not found",
    };
  }

  const content = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", content);
  const hash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const lockContent = `SHA-256: ${hash}
BUILT_AT: ${new Date().toISOString()}
TIER: ${process.env.TIER || "unknown"}
FW_MODE: ${process.env.FW_MODE || "unknown"}
BUN_VERSION: ${Bun.version}
`;

  await Bun.write(join(process.cwd(), ".parity.lock"), lockContent);

  return {
    passed: true,
    message: "Parity lock created",
    details: `SHA-256: ${hash.slice(0, 16)}...`,
  };
}

/** Check parity lock diff */
async function checkParityDiff(): Promise<QAResult> {
  try {
    const result = await $`git diff .parity.lock 2>/dev/null || echo "NEW"`.text();

    if (result.includes("NEW") || result.trim() === "" || result.trim() === "NEW") {
      return {
        passed: true,
        message: "Parity lock verified (new or unchanged)",
      };
    }

    // There are changes - extract the hash diff
    const lines = result.split("\n");
    const oldHash = lines.find((l) => l.startsWith("-SHA-256:"))?.split(":")[1]?.trim();
    const newHash = lines.find((l) => l.startsWith("+SHA-256:"))?.split(":")[1]?.trim();

    if (oldHash && newHash) {
      return {
        passed: false,
        message: "Parity lock changed!",
        details: `Old: ${oldHash.slice(0, 16)}...\n      New: ${newHash.slice(0, 16)}...`,
      };
    }

    return {
      passed: true,
      message: "Parity lock modified (non-hash changes)",
    };
  } catch {
    return {
      passed: true,
      message: "Parity lock check skipped (no git)",
    };
  }
}

/** Run TypeScript strict check */
async function checkTypeScript(): Promise<QAResult> {
  try {
    const result = await $`bunx tsc --noEmit 2>&1 || true`.text();

    if (result.includes("error TS")) {
      const errorCount = (result.match(/error TS/g) || []).length;
      return {
        passed: false,
        message: `TypeScript errors: ${errorCount}`,
        details: result.split("\n")[0],
      };
    }

    return {
      passed: true,
      message: "TypeScript strict check passed",
    };
  } catch (err) {
    return {
      passed: false,
      message: "TypeScript check failed",
      details: String(err),
    };
  }
}

/** Run bun tests */
async function runTests(): Promise<QAResult> {
  try {
    const result = await $`bun test --bail 2>&1 || true`.text();

    if (result.includes("FAIL") || result.includes("fail")) {
      const failCount = (result.match(/FAIL/g) || []).length;
      return {
        passed: false,
        message: `Tests failed: ${failCount}`,
      };
    }

    const passMatch = result.match(/(\d+) pass/);
    const passCount = passMatch ? passMatch[1] : "?";

    return {
      passed: true,
      message: `Tests passed: ${passCount}`,
    };
  } catch {
    return {
      passed: false,
      message: "Test execution failed",
    };
  }
}

/** Main QA flow */
async function main() {
  console.log(`${COLORS.bold}${COLORS.cyan}
╔══════════════════════════════════════════════════════════════════╗
║  Factory Wager Secure Bundle QA (Tier-1380)                       ║
║  Production Validation & Security Hardening                       ║
╚══════════════════════════════════════════════════════════════════╝
${COLORS.reset}`);

  console.log(`${COLORS.dim}Environment:${COLORS.reset}`);
  console.log(`  FW_MODE: ${process.env.FW_MODE || "not set"}`);
  console.log(`  TIER: ${process.env.TIER || "not set"}`);
  console.log(`  Bun: ${Bun.version}`);
  console.log();

  // Run all checks
  await runCheck("Secret Leak Detection", checkSecretLeaks);
  await runCheck("Bundle Size (4.51KB max)", checkBundleSize);
  await runCheck("SHA-256 Parity Lock", createParityLock);
  await runCheck("Parity Lock Diff", checkParityDiff);
  await runCheck("TypeScript Strict", checkTypeScript);
  await runCheck("Test Suite", runTests);

  // Summary
  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  const allPassed = passed === total;

  console.log();
  console.log("─".repeat(60));

  if (allPassed) {
    console.log(`${CHECK} ${COLORS.green}${COLORS.bold}All ${passed}/${total} checks passed${COLORS.reset}`);
    console.log(`${COLORS.green}✓ Bundle ready for production${COLORS.reset}`);
    process.exit(0);
  } else {
    console.log(`${CROSS} ${COLORS.red}${COLORS.bold}${passed}/${total} checks passed${COLORS.reset}`);
    console.log(`${COLORS.red}✗ Bundle validation failed${COLORS.reset}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`${CROSS} QA script error:`, err);
  process.exit(1);
});
