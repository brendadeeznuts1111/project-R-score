#!/usr/bin/env bun
/**
 * src/cli/skill-deploy.ts
 * Deployment CLI for Skills
 * - Build and deploy to R2
 * - Version management
 * - Rollback support
 * - CDN configuration
 */

import { parseArgs } from "util";
import { R2ExecutableBuilder, createR2BuilderFromEnv } from "../lib/executable-builder-r2";
import { SkillIntegrity } from "../lib/hash-utils";
import { EnhancedOutput } from "./enhanced-output";
import type { BuildTarget } from "../lib/executable-builder";

// ═══════════════════════════════════════════════════════════════════════════
// CLI Configuration
// ═══════════════════════════════════════════════════════════════════════════

const HELP = `
Skill Deployment CLI

Usage: skill-deploy <command> [options]

Commands:
  deploy <skill>     Build and deploy a skill to R2
  version <skill>    Create a versioned build
  rollback <skill>   Rollback to a previous version
  history <skill>    Show version history
  compare <skill>    Compare two versions
  prune <skill>      Remove old versions
  integrity <skill>  Check skill integrity

Options:
  --version, -v <version>   Specify version (default: from skill.json)
  --target, -t <target>     Build target (linux-x64, macos-arm64, etc.)
  --compress                Enable gzip compression
  --cdn                     Configure CDN distribution
  --keep <n>                Number of versions to keep (prune)
  --help, -h                Show this help

Examples:
  skill-deploy deploy my-skill --compress --cdn
  skill-deploy version my-skill -v 2.0.0
  skill-deploy rollback my-skill -v 1.5.0
  skill-deploy history my-skill
  skill-deploy compare my-skill -v 1.0.0 --compare-to 2.0.0
  skill-deploy prune my-skill --keep 5
  skill-deploy integrity my-skill

Environment Variables:
  R2_ACCOUNT_ID        Cloudflare account ID
  R2_ACCESS_KEY_ID     R2 access key ID
  R2_SECRET_ACCESS_KEY R2 secret access key
  R2_BUCKET            R2 bucket name
  R2_PUBLIC_URL        Public URL for the bucket (optional)
`;

// ═══════════════════════════════════════════════════════════════════════════
// Main CLI
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(HELP);
    process.exit(0);
  }

  const command = args[0];
  const restArgs = args.slice(1);

  try {
    switch (command) {
      case "deploy":
        await deployCommand(restArgs);
        break;
      case "version":
        await versionCommand(restArgs);
        break;
      case "rollback":
        await rollbackCommand(restArgs);
        break;
      case "history":
        await historyCommand(restArgs);
        break;
      case "compare":
        await compareCommand(restArgs);
        break;
      case "prune":
        await pruneCommand(restArgs);
        break;
      case "integrity":
        await integrityCommand(restArgs);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        console.log(HELP);
        process.exit(1);
    }
  } catch (error: any) {
    EnhancedOutput.error(error.message);
    process.exit(1);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Commands
// ═══════════════════════════════════════════════════════════════════════════

async function deployCommand(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      version: { type: "string", short: "v" },
      target: { type: "string", short: "t" },
      compress: { type: "boolean", default: false },
      cdn: { type: "boolean", default: false },
    },
    allowPositionals: true,
  });

  const skillId = positionals[0];
  if (!skillId) {
    throw new Error("Skill ID is required");
  }

  EnhancedOutput.printHeader(`Deploying: ${skillId}`);

  // Check if R2 is configured
  const hasR2 = process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID;
  if (!hasR2) {
    EnhancedOutput.warn("R2 not configured - building locally only");
  }

  const builder = createR2BuilderFromEnv();

  // Display skill info
  await displaySkillInfo(skillId);

  // Calculate integrity hash
  const spinner = EnhancedOutput.createSpinner("Calculating integrity hash...");
  const skillHash = SkillIntegrity.calculateSkillHash(`./skills/${skillId}`);
  spinner.stop(`Integrity hash: ${skillHash}`);

  // Build target
  let target: BuildTarget | undefined;
  if (values.target) {
    target = `bun-${values.target}` as BuildTarget;
  }

  // Build and deploy
  const deploySpinner = EnhancedOutput.createSpinner("Building and deploying...");

  const result = await builder.buildAndDeploy(skillId, {
    target,
    compress: values.compress,
    deployToR2: hasR2,
    cdnEnabled: values.cdn,
    compressBundle: values.compress,
    metadata: {
      integrityHash: skillHash,
      deployedAt: new Date().toISOString(),
    },
  });

  deploySpinner.stop(result.success ? "Build complete" : "Build failed");

  // Display results
  EnhancedOutput.displayBuildResults([result]);

  if (result.deployment?.uploaded) {
    console.log("\n\x1b[1mDeployment URLs:\x1b[0m");
    result.deployment.urls.forEach((url, i) => {
      console.log(`  ${i + 1}. ${url}`);
    });
  }

  if (result.deployment?.cdnConfig) {
    console.log("\n\x1b[1mCDN Configuration:\x1b[0m");
    console.log(`  Domain: ${result.deployment.cdnConfig.domain}`);
    console.log(`  Cache TTL: ${result.deployment.cdnConfig.cacheTtl}s`);
  }

  if (result.deployment?.error) {
    EnhancedOutput.warn(`Deployment warning: ${result.deployment.error}`);
  }
}

async function versionCommand(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      version: { type: "string", short: "v" },
      target: { type: "string", short: "t" },
    },
    allowPositionals: true,
  });

  const skillId = positionals[0];
  if (!skillId) {
    throw new Error("Skill ID is required");
  }

  // Get version from args or skill.json
  let version = values.version;
  if (!version) {
    const skillJson = await getSkillJson(skillId);
    version = skillJson?.version || "1.0.0";
  }

  EnhancedOutput.printHeader(`Creating version: ${skillId} v${version}`);

  const builder = createR2BuilderFromEnv();

  const spinner = EnhancedOutput.createSpinner("Creating versioned build...");

  const versionedBuild = await builder.createVersionedBuild(skillId, version, {
    target: values.target ? (`bun-${values.target}` as BuildTarget) : undefined,
  });

  spinner.stop(`Version ${version} created`);

  // Display version info
  console.log("\n\x1b[1mVersion Details:\x1b[0m");
  console.log(`  Build ID: ${versionedBuild.buildId}`);
  console.log(`  Manifest Hash: ${versionedBuild.manifest.manifestHash}`);
  console.log(`  Files: ${versionedBuild.manifest.files.length}`);
  console.log(`  Total Size: ${EnhancedOutput.formatBytes(versionedBuild.manifest.totalSize)}`);
  console.log(`  Dependencies: ${versionedBuild.dependencies.length}`);

  if (versionedBuild.buildResult.success) {
    EnhancedOutput.success(`Executable: ${versionedBuild.buildResult.executablePath}`);
  } else {
    EnhancedOutput.error("Build failed");
  }
}

async function rollbackCommand(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      version: { type: "string", short: "v" },
    },
    allowPositionals: true,
  });

  const skillId = positionals[0];
  if (!skillId) {
    throw new Error("Skill ID is required");
  }

  if (!values.version) {
    throw new Error("Version is required for rollback (-v <version>)");
  }

  EnhancedOutput.printHeader(`Rolling back: ${skillId} to v${values.version}`);

  const builder = createR2BuilderFromEnv();

  const spinner = EnhancedOutput.createSpinner("Rolling back...");

  try {
    const success = await builder.rollbackToVersion(skillId, values.version);
    spinner.stop(`Rolled back to version ${values.version}`);
    EnhancedOutput.success("Rollback complete");
  } catch (error: any) {
    spinner.stop("Rollback failed");
    throw error;
  }
}

async function historyCommand(args: string[]) {
  const { positionals } = parseArgs({
    args,
    options: {},
    allowPositionals: true,
  });

  const skillId = positionals[0];
  if (!skillId) {
    throw new Error("Skill ID is required");
  }

  EnhancedOutput.printHeader(`Version History: ${skillId}`);

  const builder = createR2BuilderFromEnv();
  const history = await builder.getVersionHistory(skillId);

  if (history.length === 0) {
    EnhancedOutput.info("No version history found");
    return;
  }

  const tableData = history.map((v, i) => ({
    "#": i + 1,
    Version: v.version,
    "Build ID": v.buildId.slice(0, 8),
    Timestamp: new Date(v.timestamp).toLocaleString(),
    Files: v.manifest.files.length,
    Size: EnhancedOutput.formatBytes(v.buildResult.size),
    Status: v.buildResult.success ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m",
    Checksum: v.buildResult.checksum.slice(0, 8),
  }));

  console.log(
    EnhancedOutput.table(tableData, {
      columns: [
        { key: "#", width: 3, align: "right" },
        { key: "Version", width: 10 },
        { key: "Build ID", width: 10 },
        { key: "Timestamp", width: 20 },
        { key: "Files", width: 6, align: "right" },
        { key: "Size", width: 12, align: "right" },
        { key: "Status", width: 8 },
        { key: "Checksum", width: 10 },
      ],
      border: "rounded",
    })
  );
}

async function compareCommand(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      version: { type: "string", short: "v" },
      "compare-to": { type: "string" },
    },
    allowPositionals: true,
  });

  const skillId = positionals[0];
  if (!skillId) {
    throw new Error("Skill ID is required");
  }

  if (!values.version || !values["compare-to"]) {
    throw new Error("Both --version and --compare-to are required");
  }

  EnhancedOutput.printHeader(`Comparing: ${values.version} vs ${values["compare-to"]}`);

  const builder = createR2BuilderFromEnv();

  const diff = await builder.compareVersions(
    skillId,
    values.version,
    values["compare-to"]
  );

  console.log("\n\x1b[1mDifferences:\x1b[0m");
  console.log(`  Added: ${diff.added.length}`);
  console.log(`  Removed: ${diff.removed.length}`);
  console.log(`  Modified: ${diff.modified.length}`);
  console.log(`  Unchanged: ${diff.unchanged.length}`);

  if (diff.added.length > 0) {
    console.log("\n\x1b[32mAdded:\x1b[0m");
    diff.added.slice(0, 10).forEach((f) => console.log(`  + ${f}`));
    if (diff.added.length > 10) {
      console.log(`  ... and ${diff.added.length - 10} more`);
    }
  }

  if (diff.removed.length > 0) {
    console.log("\n\x1b[31mRemoved:\x1b[0m");
    diff.removed.slice(0, 10).forEach((f) => console.log(`  - ${f}`));
    if (diff.removed.length > 10) {
      console.log(`  ... and ${diff.removed.length - 10} more`);
    }
  }

  if (diff.modified.length > 0) {
    console.log("\n\x1b[33mModified:\x1b[0m");
    diff.modified.slice(0, 10).forEach((f) => console.log(`  ~ ${f}`));
    if (diff.modified.length > 10) {
      console.log(`  ... and ${diff.modified.length - 10} more`);
    }
  }
}

async function pruneCommand(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      keep: { type: "string", default: "5" },
    },
    allowPositionals: true,
  });

  const skillId = positionals[0];
  if (!skillId) {
    throw new Error("Skill ID is required");
  }

  const keepCount = parseInt(values.keep || "5");

  EnhancedOutput.printHeader(`Pruning versions: ${skillId}`);
  console.log(`Keeping latest ${keepCount} versions\n`);

  const builder = createR2BuilderFromEnv();

  const spinner = EnhancedOutput.createSpinner("Pruning old versions...");

  const deleted = await builder.pruneVersions(skillId, keepCount);

  spinner.stop(`Pruned ${deleted} old versions`);
}

async function integrityCommand(args: string[]) {
  const { positionals } = parseArgs({
    args,
    options: {},
    allowPositionals: true,
  });

  const skillId = positionals[0];
  if (!skillId) {
    throw new Error("Skill ID is required");
  }

  EnhancedOutput.printHeader(`Integrity Check: ${skillId}`);

  const skillDir = `./skills/${skillId}`;

  // Check if skill exists
  const skillFile = Bun.file(`${skillDir}/skill.json`);
  if (!(await skillFile.exists())) {
    throw new Error(`Skill not found: ${skillId}`);
  }

  const spinner = EnhancedOutput.createSpinner("Generating integrity report...");

  const report = await SkillIntegrity.generateReport(skillId);

  spinner.stop("Report generated");

  console.log("\n\x1b[1mIntegrity Report:\x1b[0m");
  console.log(`  Skill ID: ${report.skillId}`);
  console.log(`  Valid: ${report.valid ? "\x1b[32mYes\x1b[0m" : "\x1b[31mNo\x1b[0m"}`);
  console.log(`  Hash: ${report.hash}`);
  console.log(`  Timestamp: ${report.timestamp}`);

  if (report.manifest) {
    console.log(`\n\x1b[1mManifest:\x1b[0m`);
    console.log(`  Manifest Hash: ${report.manifest.manifestHash}`);
    console.log(`  Total Files: ${report.manifest.files.length}`);
    console.log(`  Total Size: ${EnhancedOutput.formatBytes(report.manifest.totalSize)}`);
  }

  if (report.verification) {
    console.log(`\n\x1b[1mVerification:\x1b[0m`);
    console.log(`  Verified: ${report.verification.verifiedFiles}/${report.verification.totalFiles}`);

    if (report.verification.mismatchedFiles.length > 0) {
      console.log(`\n\x1b[33mMismatched Files:\x1b[0m`);
      report.verification.mismatchedFiles.forEach((f) =>
        console.log(`  ~ ${f}`)
      );
    }

    if (report.verification.missingFiles.length > 0) {
      console.log(`\n\x1b[31mMissing Files:\x1b[0m`);
      report.verification.missingFiles.forEach((f) =>
        console.log(`  - ${f}`)
      );
    }

    if (report.verification.extraFiles.length > 0) {
      console.log(`\n\x1b[32mExtra Files:\x1b[0m`);
      report.verification.extraFiles.forEach((f) =>
        console.log(`  + ${f}`)
      );
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

async function displaySkillInfo(skillId: string) {
  const skillJson = await getSkillJson(skillId);

  if (skillJson) {
    console.log("\n\x1b[1mSkill Info:\x1b[0m");
    console.log(`  Name: ${skillJson.name || skillId}`);
    console.log(`  Version: ${skillJson.version || "1.0.0"}`);
    console.log(`  Description: ${skillJson.description || "N/A"}`);
    console.log(`  Author: ${skillJson.author || "Unknown"}`);
    console.log("");
  }
}

async function getSkillJson(skillId: string): Promise<any> {
  const skillJsonPath = `./skills/${skillId}/skill.json`;
  const file = Bun.file(skillJsonPath);

  if (await file.exists()) {
    try {
      return JSON.parse(await file.text());
    } catch {
      return null;
    }
  }

  return null;
}

// Run CLI
main();
