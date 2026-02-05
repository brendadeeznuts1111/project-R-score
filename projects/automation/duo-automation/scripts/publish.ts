#!/usr/bin/env bun
/**
 * [DUOPLUS][PUBLISH][WORKFLOW][CRITICAL][#REF:PUB-WORKFLOW][BUN:6.1-NATIVE]
 * Bun-Native Publishing Workflow with Tag Validation
 * Compliance: SOC2-Type-II | Standard: ISO-27001
 *
 * Features:
 * - Tag compliance validation before publish
 * - 2FA flow support (--otp flag)
 * - Dry-run mode for CI/CD validation
 * - Monorepo workspace publishing
 * - Publishing compliance audit trail
 */

import { $ } from "bun";

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface PublishOptions {
  dryRun: boolean;
  otp?: string;
  tag: string;
  access: "public" | "restricted";
  registry?: string;
  workspace?: string;
  skipTests: boolean;
  skipTagValidation: boolean;
  verbose: boolean;
  tolerateRepublish: boolean;
  authType: "web" | "legacy";
  gzipLevel: number;
  ignoreScripts: boolean;
}

interface PublishResult {
  success: boolean;
  package: string;
  version: string;
  registry: string;
  timestamp: string;
  tagCompliance: boolean;
  auditHash?: string;
  error?: string;
}

interface ComplianceCheck {
  name: string;
  status: "pass" | "fail" | "warn";
  message: string;
}

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════

const DEFAULT_REGISTRY = "https://registry.npmjs.org";
const DUOPLUS_REGISTRY = "https://registry.duoplus.bun.sh";

const TAG_REGEX = /\[([A-Z0-9_]+)\]\[([A-Z0-9_]+)\]\[([A-Z0-9_]+)\]\[([A-Z0-9_]+)\]\[#REF:([A-Z0-9_-]+)\]/gi;

// Publishing Options Cross-Reference Matrix (Bun v1.3+)
// Reference: https://bun.sh/docs/cli/publish
const PUBLISH_OPTIONS = {
  "--access": { bun: "--access <public|restricted>", npm: "--access", description: "Package access level (unscoped always public)" },
  "--tag": { bun: "--tag <name>", npm: "--tag", description: "Distribution tag (default: latest)" },
  "--dry-run": { bun: "--dry-run", npm: "--dry-run", description: "Simulate publish without actually publishing" },
  "--otp": { bun: "--otp <token>", npm: "--otp", description: "2FA one-time password (skips interactive prompt)" },
  "--registry": { bun: "--registry <url>", npm: "--registry", description: "Target registry URL" },
  "--tolerate-republish": { bun: "--tolerate-republish", npm: "N/A", description: "Exit 0 if version already exists (CI-friendly)" },
  "--auth-type": { bun: "--auth-type <web|legacy>", npm: "N/A", description: "2FA authentication method (default: web)" },
  "--gzip-level": { bun: "--gzip-level <0-9>", npm: "N/A", description: "Compression level (default: 9)" },
  "--ignore-scripts": { bun: "--ignore-scripts", npm: "--ignore-scripts", description: "Skip lifecycle scripts" },
  "--verbose": { bun: "--verbose", npm: "--verbose", description: "Show detailed logging" },
  "--silent": { bun: "--silent", npm: "--silent", description: "Suppress all output" },
} as const;

// ═══════════════════════════════════════════════════════════
// ARGUMENT PARSING
// ═══════════════════════════════════════════════════════════

function parseArgs(): PublishOptions {
  const args = process.argv.slice(2);

  return {
    dryRun: args.includes("--dry-run"),
    otp: args.find(a => a.startsWith("--otp="))?.split("=")[1],
    tag: args.find(a => a.startsWith("--tag="))?.split("=")[1] || "latest",
    access: (args.find(a => a.startsWith("--access="))?.split("=")[1] as "public" | "restricted") || "restricted",
    registry: args.find(a => a.startsWith("--registry="))?.split("=")[1],
    workspace: args.find(a => a.startsWith("--workspace="))?.split("=")[1],
    skipTests: args.includes("--skip-tests"),
    skipTagValidation: args.includes("--skip-tag-validation"),
    verbose: args.includes("--verbose") || args.includes("-v"),
    // Bun-native options (v1.3+)
    tolerateRepublish: args.includes("--tolerate-republish"),
    authType: (args.find(a => a.startsWith("--auth-type="))?.split("=")[1] as "web" | "legacy") || "web",
    gzipLevel: parseInt(args.find(a => a.startsWith("--gzip-level="))?.split("=")[1] || "9"),
    ignoreScripts: args.includes("--ignore-scripts"),
  };
}

// ═══════════════════════════════════════════════════════════
// TAG COMPLIANCE VALIDATION
// ═══════════════════════════════════════════════════════════

async function validateTagCompliance(): Promise<ComplianceCheck[]> {
  const checks: ComplianceCheck[] = [];

  // Check 1: Run tag enforcer
  try {
    await $`ENFORCEMENT_STAGE=publish bun run scripts/git/tag-enforcer-v6.ts`.quiet();
    checks.push({
      name: "Tag Enforcer",
      status: "pass",
      message: "All tags comply with DuoPlus v6.1 standard",
    });
  } catch {
    checks.push({
      name: "Tag Enforcer",
      status: "fail",
      message: "Tag compliance validation failed",
    });
  }

  // Check 2: Verify package.json has required fields
  const pkgFile = Bun.file("package.json");
  if (await pkgFile.exists()) {
    const pkg = await pkgFile.json();

    if (pkg.name && pkg.version && pkg.description) {
      checks.push({
        name: "Package Metadata",
        status: "pass",
        message: `${pkg.name}@${pkg.version} metadata complete`,
      });
    } else {
      checks.push({
        name: "Package Metadata",
        status: "fail",
        message: "Missing required fields: name, version, or description",
      });
    }

    // Check 3: Verify no npm commands in scripts (E-027)
    const scripts = pkg.scripts || {};
    const hasNpmPublish = Object.values(scripts).some((s: unknown) =>
      typeof s === "string" && /npm (publish|pack)/.test(s)
    );

    if (hasNpmPublish) {
      checks.push({
        name: "E-027 Toolchain Purity",
        status: "fail",
        message: "Found npm publish/pack in scripts - use bun publish",
      });
    } else {
      checks.push({
        name: "E-027 Toolchain Purity",
        status: "pass",
        message: "Bun-native toolchain verified",
      });
    }
  }

  // Check 4: Verify lockfile exists
  const lockfile = Bun.file("bun.lockb");
  if (await lockfile.exists()) {
    checks.push({
      name: "Lockfile Present",
      status: "pass",
      message: "bun.lockb exists for reproducible builds",
    });
  } else {
    checks.push({
      name: "Lockfile Present",
      status: "warn",
      message: "No bun.lockb - run 'bun install' first",
    });
  }

  return checks;
}

// ═══════════════════════════════════════════════════════════
// AUDIT TRAIL
// ═══════════════════════════════════════════════════════════

async function createAuditRecord(result: PublishResult): Promise<string> {
  const auditDir = ".tags/audit";
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const auditFile = `${auditDir}/publish-${timestamp}.json`;

  // Ensure audit directory exists
  await $`mkdir -p ${auditDir}`.quiet();

  const auditRecord = {
    ...result,
    environment: {
      node: process.version,
      bun: Bun.version,
      platform: process.platform,
      arch: process.arch,
    },
    git: {
      branch: (await $`git rev-parse --abbrev-ref HEAD`.text()).trim(),
      commit: (await $`git rev-parse HEAD`.text()).trim(),
      dirty: (await $`git status --porcelain`.text()).trim().length > 0,
    },
  };

  await Bun.write(auditFile, JSON.stringify(auditRecord, null, 2));

  // Generate hash for integrity
  const hasher = new Bun.CryptoHasher("sha256");
  hasher.update(JSON.stringify(auditRecord));
  return hasher.digest("hex").substring(0, 16);
}

// ═══════════════════════════════════════════════════════════
// WORKSPACE PUBLISHING (MONOREPO)
// ═══════════════════════════════════════════════════════════

async function getWorkspacePackages(): Promise<string[]> {
  const pkgFile = Bun.file("package.json");
  if (!(await pkgFile.exists())) return [];

  const pkg = await pkgFile.json();
  const workspaces = pkg.workspaces || [];

  if (Array.isArray(workspaces)) {
    // Resolve workspace globs
    const packages: string[] = [];
    for (const pattern of workspaces) {
      const result = await $`ls -d ${pattern} 2>/dev/null || true`.text();
      packages.push(...result.trim().split("\n").filter(Boolean));
    }
    return packages;
  }

  return [];
}

async function publishWorkspace(workspace: string, options: PublishOptions): Promise<PublishResult> {
  console.log(`\n📦 Publishing workspace: ${workspace}`);

  const pkgPath = `${workspace}/package.json`;
  const pkgFile = Bun.file(pkgPath);

  if (!(await pkgFile.exists())) {
    return {
      success: false,
      package: workspace,
      version: "unknown",
      registry: options.registry || DEFAULT_REGISTRY,
      timestamp: new Date().toISOString(),
      tagCompliance: false,
      error: `No package.json found in ${workspace}`,
    };
  }

  const pkg = await pkgFile.json();
  const registry = options.registry || DEFAULT_REGISTRY;

  // Build publish command with Bun-native options (v1.3+)
  const args: string[] = [
    "--tag", options.tag,
    "--access", options.access,
    "--registry", registry,
    "--gzip-level", String(options.gzipLevel),
  ];

  // Bun-native flags
  if (options.dryRun) args.push("--dry-run");
  if (options.otp) args.push("--otp", options.otp);
  if (options.tolerateRepublish) args.push("--tolerate-republish");
  if (options.authType === "legacy") args.push("--auth-type", "legacy");
  if (options.ignoreScripts) args.push("--ignore-scripts");

  try {
    await $`cd ${workspace} && bun publish ${args}`;

    return {
      success: true,
      package: pkg.name,
      version: pkg.version,
      registry,
      timestamp: new Date().toISOString(),
      tagCompliance: true,
    };
  } catch (error) {
    return {
      success: false,
      package: pkg.name,
      version: pkg.version,
      registry,
      timestamp: new Date().toISOString(),
      tagCompliance: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ═══════════════════════════════════════════════════════════
// MAIN PUBLISH FLOW
// ═══════════════════════════════════════════════════════════

async function displayHeader(options: PublishOptions) {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║           DUOPLUS BUN-NATIVE PUBLISHING WORKFLOW v1.0             ║
║           SOC2 Type II | ISO-27001 Compliant                      ║
╚═══════════════════════════════════════════════════════════════════╝
`);

  if (options.dryRun) {
    console.log("🔍 DRY-RUN MODE - No packages will be published\n");
  }
}

async function runPrePublishChecks(options: PublishOptions): Promise<boolean> {
  console.log("🔒 Running pre-publish checks...\n");

  // Tag compliance validation
  if (!options.skipTagValidation) {
    console.log("📋 Tag Compliance Validation:");
    const checks = await validateTagCompliance();

    let hasFailure = false;
    for (const check of checks) {
      const icon = check.status === "pass" ? "✅" : check.status === "warn" ? "⚠️" : "❌";
      console.log(`   ${icon} ${check.name}: ${check.message}`);
      if (check.status === "fail") hasFailure = true;
    }

    if (hasFailure) {
      console.log("\n❌ Tag compliance validation failed. Fix issues before publishing.");
      return false;
    }
    console.log("");
  }

  // Run tests
  if (!options.skipTests) {
    console.log("🧪 Running tests...");
    try {
      await $`bun test`.quiet();
      console.log("   ✅ All tests passed\n");
    } catch {
      console.log("   ❌ Tests failed. Fix tests before publishing.\n");
      return false;
    }
  }

  // Build
  console.log("🔨 Building package...");
  try {
    await $`bun run build`.quiet();
    console.log("   ✅ Build successful\n");
  } catch {
    console.log("   ❌ Build failed\n");
    return false;
  }

  return true;
}

async function publish(options: PublishOptions): Promise<PublishResult> {
  const pkgFile = Bun.file("package.json");
  const pkg = await pkgFile.json();
  const registry = options.registry || DEFAULT_REGISTRY;

  console.log(`📦 Publishing ${pkg.name}@${pkg.version}`);
  console.log(`   Registry: ${registry}`);
  console.log(`   Tag: ${options.tag}`);
  console.log(`   Access: ${options.access}`);
  if (options.tolerateRepublish) {
    console.log(`   Tolerate Republish: enabled (CI-friendly)`);
  }

  // Build publish command with Bun-native options (v1.3+)
  // Reference: https://bun.sh/docs/cli/publish
  const args: string[] = [
    "--tag", options.tag,
    "--access", options.access,
    "--registry", registry,
    "--gzip-level", String(options.gzipLevel),
  ];

  // Bun-native flags
  if (options.dryRun) args.push("--dry-run");
  if (options.otp) args.push("--otp", options.otp);
  if (options.tolerateRepublish) args.push("--tolerate-republish");
  if (options.authType === "legacy") args.push("--auth-type", "legacy");
  if (options.ignoreScripts) args.push("--ignore-scripts");
  if (options.verbose) args.push("--verbose");

  try {
    if (options.verbose) {
      await $`bun publish ${args}`;
    } else {
      await $`bun publish ${args}`.quiet();
    }

    const result: PublishResult = {
      success: true,
      package: pkg.name,
      version: pkg.version,
      registry,
      timestamp: new Date().toISOString(),
      tagCompliance: true,
    };

    // Create audit record
    if (!options.dryRun) {
      result.auditHash = await createAuditRecord(result);
    }

    return result;
  } catch (error) {
    return {
      success: false,
      package: pkg.name,
      version: pkg.version,
      registry,
      timestamp: new Date().toISOString(),
      tagCompliance: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  const options = parseArgs();

  await displayHeader(options);

  // Pre-publish checks
  const checksPass = await runPrePublishChecks(options);
  if (!checksPass) {
    process.exit(1);
  }

  // Workspace publishing
  if (options.workspace === "all") {
    const workspaces = await getWorkspacePackages();
    if (workspaces.length === 0) {
      console.log("⚠️  No workspaces found. Publishing root package...\n");
    } else {
      console.log(`📦 Publishing ${workspaces.length} workspace packages...\n`);

      const results: PublishResult[] = [];
      for (const ws of workspaces) {
        const result = await publishWorkspace(ws, options);
        results.push(result);
      }

      // Summary
      console.log("\n" + "─".repeat(50));
      console.log("📊 PUBLISH SUMMARY\n");

      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      console.log(`   ✅ Successful: ${successful.length}`);
      console.log(`   ❌ Failed: ${failed.length}`);

      if (failed.length > 0) {
        console.log("\n   Failed packages:");
        for (const f of failed) {
          console.log(`     - ${f.package}: ${f.error}`);
        }
        process.exit(1);
      }

      process.exit(0);
    }
  }

  // Single package publishing
  console.log("");
  const result = await publish(options);

  console.log("\n" + "─".repeat(50));

  if (result.success) {
    console.log(`\n✅ Successfully published ${result.package}@${result.version}`);
    if (result.auditHash) {
      console.log(`   Audit hash: ${result.auditHash}`);
    }
    if (options.dryRun) {
      console.log("\n   (Dry-run mode - no actual publish occurred)");
    }
  } else {
    console.log(`\n❌ Failed to publish ${result.package}`);
    console.log(`   Error: ${result.error}`);
    process.exit(1);
  }
}

// ═══════════════════════════════════════════════════════════
// ENTRY POINT
// ═══════════════════════════════════════════════════════════

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
