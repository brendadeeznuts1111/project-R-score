#!/usr/bin/env bun
/**
 * src/cli/deploy-s3.ts
 * S3/R2 Deployment CLI
 * - Build and upload skills to R2
 * - Deploy to CDN
 * - Install from remote
 * - List versions
 */

import { parseArgs } from "util";
import {
  S3ExecutableBuilder,
  createS3BuilderFromEnv,
} from "../lib/executable-builder-s3";
import { BunR2Storage, createBunR2StorageFromEnv } from "../storage/bun-r2-storage";
import { EnhancedOutput } from "./enhanced-output";

// ═══════════════════════════════════════════════════════════════════════════
// CLI Help
// ═══════════════════════════════════════════════════════════════════════════

const HELP = `
S3/R2 Skill Deployment CLI

Usage: deploy-s3 <command> <skill-id> [options]

Commands:
  upload <skill-id> [platforms...]   Build and upload skill to R2
  upload-batch <skill-ids...>        Upload multiple skills concurrently
  deploy <skill-id>                  Upload + deploy to CDN
  install <skill-id> [version]       Install skill from remote
  list <skill-id>                    List available versions
  delete <skill-id> <version>        Delete a specific version
  info <skill-id>                    Show skill info from remote
  verify <skill-id>                  Verify uploads by checksum
  cleanup <skill-id>                 Remove old versions (keep last N)
  debug <skill-id>                   Interactive debug shell for skill
  metrics                            Show storage performance metrics

Options:
  --version, -v <version>  Specify version
  --platform, -p <platform>  Target platform (linux-x64, macos-arm64, etc.)
  --compress               Enable gzip compression
  --all-platforms          Build for all platforms
  --concurrency, -c <num>  Concurrent uploads for batch (default: 3)
  --keep, -k <num>         Versions to keep for cleanup (default: 5)
  --help, -h               Show this help

Platforms:
  linux-x64, linux-arm64, macos-x64, macos-arm64, windows-x64

Environment Variables:
  R2_ACCOUNT_ID        Cloudflare account ID
  R2_ACCESS_KEY_ID     R2 access key ID
  R2_SECRET_ACCESS_KEY R2 secret access key
  R2_BUCKET            R2 bucket name
  R2_ENDPOINT          R2 endpoint URL (optional)
  R2_PUBLIC_URL        Public URL for downloads (optional)

Examples:
  deploy-s3 upload weather linux-x64 macos-arm64
  deploy-s3 upload weather --all-platforms --compress
  deploy-s3 upload-batch weather calendar todo --concurrency 5
  deploy-s3 deploy weather
  deploy-s3 install weather latest
  deploy-s3 install weather 1.2.0 --platform linux-arm64
  deploy-s3 list weather
  deploy-s3 verify weather
  deploy-s3 cleanup weather --keep 3
  deploy-s3 metrics
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

  // Check R2 configuration
  const hasR2 =
    process.env.R2_BUCKET &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY;

  if (!hasR2 && command !== "help") {
    EnhancedOutput.error("R2 not configured. Set the following environment variables:");
    console.log("  R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY");
    console.log("  Optional: R2_ACCOUNT_ID, R2_ENDPOINT, R2_PUBLIC_URL");
    process.exit(1);
  }

  try {
    switch (command) {
      case "upload":
        await uploadCommand(restArgs);
        break;

      case "upload-batch":
        await uploadBatchCommand(restArgs);
        break;

      case "deploy":
        await deployCommand(restArgs);
        break;

      case "install":
        await installCommand(restArgs);
        break;

      case "list":
        await listCommand(restArgs);
        break;

      case "delete":
        await deleteCommand(restArgs);
        break;

      case "info":
        await infoCommand(restArgs);
        break;

      case "verify":
        await verifyCommand(restArgs);
        break;

      case "cleanup":
        await cleanupCommand(restArgs);
        break;

      case "metrics":
        await metricsCommand(restArgs);
        break;

      case "debug":
        await debugCommand(restArgs);
        break;

      default:
        EnhancedOutput.error(`Unknown command: ${command}`);
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

async function uploadCommand(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      version: { type: "string", short: "v" },
      compress: { type: "boolean", default: false },
      "all-platforms": { type: "boolean", default: false },
    },
    allowPositionals: true,
  });

  const skillId = positionals[0];
  if (!skillId) {
    throw new Error("Skill ID is required");
  }

  EnhancedOutput.printHeader(`Uploading: ${skillId}`);

  const builder = createS3BuilderFromEnv();
  if (!builder) {
    throw new Error("Failed to create S3 builder");
  }

  // Determine platforms
  let platforms = positionals.slice(1);
  if (values["all-platforms"] || platforms.length === 0) {
    platforms = [
      "linux-x64",
      "linux-arm64",
      "macos-x64",
      "macos-arm64",
      "windows-x64",
    ];
  }

  console.log(`Platforms: ${platforms.join(", ")}\n`);

  const result = await builder.buildAndUpload(
    skillId,
    {
      compress: true,
      minify: true,
      metadata: {
        version: values.version || "1.0.0",
      },
    },
    {
      platforms,
      compress: values.compress,
      downloadName: skillId,
      public: true,
      metadata: {
        uploadedBy: process.env.USER || "unknown",
        uploadedFrom: process.platform,
      },
    }
  );

  // Display results
  console.log("\nUpload Results:");
  console.log("─".repeat(80));

  if (result.uploads.length > 0) {
    const tableData = result.uploads.map((upload) => ({
      Platform: upload.platform,
      Status: upload.success
        ? "\x1b[32m✓ Success\x1b[0m"
        : "\x1b[31m✗ Failed\x1b[0m",
      Size: EnhancedOutput.formatBytes(upload.size),
      Checksum: upload.checksum.slice(0, 8),
    }));

    console.log(
      EnhancedOutput.table(tableData, {
        columns: [
          { key: "Platform", width: 15 },
          { key: "Status", width: 12 },
          { key: "Size", width: 12, align: "right" },
          { key: "Checksum", width: 10 },
        ],
        border: "rounded",
      })
    );
  }

  if (result.errors.length > 0) {
    console.log("\nErrors:");
    result.errors.forEach((error) => EnhancedOutput.error(error));
  }

  console.log(`\nTotal size: ${EnhancedOutput.formatBytes(result.totalSize)}`);
  console.log(`Total time: ${(result.totalTime / 1000).toFixed(2)}s`);

  // Create manifest
  console.log("\nCreating distribution manifest...");
  const manifest = await builder.createDistributionManifest(skillId);

  EnhancedOutput.success(`Manifest: ${manifest.manifestUrl}`);
  EnhancedOutput.success(`Latest: ${manifest.latestUrl}`);
}

async function deployCommand(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      version: { type: "string", short: "v" },
      compress: { type: "boolean", default: false },
      domain: { type: "string" },
    },
    allowPositionals: true,
  });

  const skillId = positionals[0];
  if (!skillId) {
    throw new Error("Skill ID is required");
  }

  EnhancedOutput.printHeader(`Deploying: ${skillId}`);

  const builder = createS3BuilderFromEnv();
  if (!builder) {
    throw new Error("Failed to create S3 builder");
  }

  // First upload
  console.log("1. Uploading executables...\n");
  await uploadCommand([
    skillId,
    "--all-platforms",
    values.compress ? "--compress" : "",
  ].filter(Boolean));

  // Deploy to CDN
  console.log("\n2. Deploying to CDN...\n");
  const deployment = await builder.deployToCDN(skillId, {
    routes: values.domain ? [values.domain] : undefined,
    cacheTtl: 3600,
    cors: true,
  });

  console.log("CDN Deployment:");
  console.log("─".repeat(60));
  console.log(`  Worker URL: ${deployment.workerUrl}`);
  console.log(`  Manifest: ${deployment.manifestUrl}`);
  console.log(`  Latest: ${deployment.latestUrl}`);
  if (deployment.customDomain) {
    console.log(`  Custom Domain: https://${deployment.customDomain}`);
  }
  console.log(`  Versions: ${deployment.stats.versions}`);
  console.log(`  Platforms: ${deployment.stats.totalPlatforms}`);

  EnhancedOutput.success("Deployment complete!");
}

async function installCommand(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      platform: { type: "string", short: "p" },
    },
    allowPositionals: true,
  });

  const skillId = positionals[0];
  if (!skillId) {
    throw new Error("Skill ID is required");
  }

  const version = positionals[1] || "latest";

  EnhancedOutput.printHeader(`Installing: ${skillId}`);

  const builder = createS3BuilderFromEnv();
  if (!builder) {
    throw new Error("Failed to create S3 builder");
  }

  const platform = values.platform || builder.detectPlatform();
  console.log(`Version: ${version}`);
  console.log(`Platform: ${platform}\n`);

  const result = await builder.installFromRemote(skillId, version, platform);

  if (!result.success) {
    throw new Error(result.error || "Installation failed");
  }

  console.log("\nInstallation Details:");
  console.log("─".repeat(60));
  console.log(`  Skill: ${result.skillId}`);
  console.log(`  Version: ${result.version}`);
  console.log(`  Platform: ${result.platform}`);
  console.log(`  Path: ${result.installedPath}`);
  console.log(`  Size: ${EnhancedOutput.formatBytes(result.size)}`);
  console.log(`  Checksum: ${result.checksum}`);

  EnhancedOutput.success("Installation complete!");

  console.log("\nTo run:");
  if (result.platform.includes("windows")) {
    console.log(`  ${result.installedPath}`);
  } else {
    console.log(`  ./${result.installedPath}`);
  }
}

async function listCommand(args: string[]) {
  const { positionals } = parseArgs({
    args,
    options: {},
    allowPositionals: true,
  });

  const skillId = positionals[0];
  if (!skillId) {
    throw new Error("Skill ID is required");
  }

  EnhancedOutput.printHeader(`Versions: ${skillId}`);

  const storage = createBunR2StorageFromEnv();
  if (!storage) {
    throw new Error("Failed to create R2 storage");
  }

  const versions = await storage.listSkillVersions(skillId);

  if (versions.length === 0) {
    EnhancedOutput.info("No versions found");
    return;
  }

  // Group by version
  const grouped: Record<string, typeof versions> = {};
  for (const version of versions) {
    if (!grouped[version.version]) {
      grouped[version.version] = [];
    }
    grouped[version.version].push(version);
  }

  for (const [version, platforms] of Object.entries(grouped)) {
    console.log(`\n${version}:`);

    const tableData = platforms.map((p) => ({
      Platform: `${p.platform}-${p.arch}`,
      Size: EnhancedOutput.formatBytes(p.size),
      Uploaded: new Date(p.uploaded).toLocaleDateString(),
      Checksum: p.checksum.slice(0, 8),
    }));

    console.log(
      EnhancedOutput.table(tableData, {
        columns: [
          { key: "Platform", width: 15 },
          { key: "Size", width: 12, align: "right" },
          { key: "Uploaded", width: 12 },
          { key: "Checksum", width: 10 },
        ],
        border: "none",
      })
    );
  }

  console.log(`\nTotal: ${versions.length} builds across ${Object.keys(grouped).length} versions`);
}

async function deleteCommand(args: string[]) {
  const { positionals } = parseArgs({
    args,
    options: {},
    allowPositionals: true,
  });

  const skillId = positionals[0];
  const version = positionals[1];

  if (!skillId || !version) {
    throw new Error("Skill ID and version are required");
  }

  EnhancedOutput.printHeader(`Deleting: ${skillId} v${version}`);

  const storage = createBunR2StorageFromEnv();
  if (!storage) {
    throw new Error("Failed to create R2 storage");
  }

  const versions = await storage.listSkillVersions(skillId);
  const toDelete = versions.filter((v) => v.version === version);

  if (toDelete.length === 0) {
    EnhancedOutput.warn(`Version ${version} not found`);
    return;
  }

  console.log(`Found ${toDelete.length} files to delete:\n`);

  for (const item of toDelete) {
    console.log(`  ${item.platform}-${item.arch}: ${item.key}`);
    await storage.deleteObject(item.key);
  }

  EnhancedOutput.success(`Deleted ${toDelete.length} files`);
}

async function infoCommand(args: string[]) {
  const { positionals } = parseArgs({
    args,
    options: {},
    allowPositionals: true,
  });

  const skillId = positionals[0];
  if (!skillId) {
    throw new Error("Skill ID is required");
  }

  EnhancedOutput.printHeader(`Info: ${skillId}`);

  const storage = createBunR2StorageFromEnv();
  if (!storage) {
    throw new Error("Failed to create R2 storage");
  }

  // Try to get manifest
  const manifestKey = `skills/${skillId}/manifest.json`;
  const manifestInfo = await storage.getObjectInfo(manifestKey);

  if (!manifestInfo) {
    EnhancedOutput.warn("No manifest found - skill may not be deployed");

    // Check for any versions
    const versions = await storage.listSkillVersions(skillId);
    if (versions.length > 0) {
      console.log(`\nFound ${versions.length} uploaded builds:`);
      await listCommand([skillId]);
    } else {
      EnhancedOutput.info("No builds found for this skill");
    }
    return;
  }

  console.log("Manifest Info:");
  console.log("─".repeat(60));
  console.log(`  Size: ${EnhancedOutput.formatBytes(manifestInfo.size)}`);
  console.log(`  Last Modified: ${manifestInfo.lastModified.toLocaleString()}`);
  console.log(`  URL: ${storage.getPublicUrl(manifestKey)}`);

  // Download and show manifest content
  const tempPath = `/tmp/${skillId}-manifest-info.json`;
  const downloadResult = await storage.downloadExecutable(manifestKey, tempPath);

  if (downloadResult.success) {
    const manifest = JSON.parse(await Bun.file(tempPath).text());

    console.log(`\nVersions: ${Object.keys(manifest.versions).length}`);

    for (const [version, info] of Object.entries(manifest.versions) as any) {
      console.log(`  ${version}: ${info.platforms.length} platforms`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Batch Commands
// ═══════════════════════════════════════════════════════════════════════════

async function uploadBatchCommand(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      concurrency: { type: "string", short: "c", default: "3" },
      compress: { type: "boolean", default: false },
      "all-platforms": { type: "boolean", default: false },
    },
    allowPositionals: true,
  });

  const skillIds = positionals;
  if (skillIds.length === 0) {
    throw new Error("At least one skill ID is required");
  }

  const concurrency = parseInt(values.concurrency || "3", 10);

  EnhancedOutput.printHeader(`Batch Upload: ${skillIds.length} skills`);
  console.log(`Concurrency: ${concurrency}\n`);

  const builder = createS3BuilderFromEnv();
  if (!builder) {
    throw new Error("Failed to create S3 builder");
  }

  const results: Array<{ skillId: string; success: boolean; error?: string; time: number }> = [];
  const startTime = Date.now();

  // Process in batches based on concurrency
  for (let i = 0; i < skillIds.length; i += concurrency) {
    const batch = skillIds.slice(i, i + concurrency);
    console.log(`\nProcessing batch ${Math.floor(i / concurrency) + 1}/${Math.ceil(skillIds.length / concurrency)}`);

    const batchPromises = batch.map(async (skillId) => {
      const skillStart = Date.now();
      try {
        console.log(`  Starting: ${skillId}`);

        // Determine platforms
        const platforms = values["all-platforms"]
          ? ["linux-x64", "linux-arm64", "macos-x64", "macos-arm64", "windows-x64"]
          : [builder.detectPlatform()];

        await builder.buildAndUpload(
          skillId,
          { compress: true, minify: true },
          { platforms, compress: values.compress, public: true }
        );

        const time = Date.now() - skillStart;
        results.push({ skillId, success: true, time });
        console.log(`  \x1b[32m✓\x1b[0m ${skillId} (${(time / 1000).toFixed(1)}s)`);
      } catch (error: any) {
        const time = Date.now() - skillStart;
        results.push({ skillId, success: false, error: error.message, time });
        console.log(`  \x1b[31m✗\x1b[0m ${skillId}: ${error.message}`);
      }
    });

    await Promise.all(batchPromises);
  }

  // Summary
  const totalTime = Date.now() - startTime;
  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log("\n" + "─".repeat(60));
  console.log("Batch Upload Summary:");
  console.log(`  Total: ${results.length} skills`);
  console.log(`  Succeeded: \x1b[32m${succeeded}\x1b[0m`);
  console.log(`  Failed: \x1b[31m${failed}\x1b[0m`);
  console.log(`  Total time: ${(totalTime / 1000).toFixed(1)}s`);

  if (failed > 0) {
    console.log("\nFailed uploads:");
    results
      .filter((r) => !r.success)
      .forEach((r) => console.log(`  ${r.skillId}: ${r.error}`));
  }
}

async function verifyCommand(args: string[]) {
  const { positionals } = parseArgs({
    args,
    options: {},
    allowPositionals: true,
  });

  const skillId = positionals[0];
  if (!skillId) {
    throw new Error("Skill ID is required");
  }

  EnhancedOutput.printHeader(`Verifying: ${skillId}`);

  const storage = createBunR2StorageFromEnv();
  if (!storage) {
    throw new Error("Failed to create R2 storage");
  }

  const versions = await storage.listSkillVersions(skillId);
  if (versions.length === 0) {
    EnhancedOutput.warn("No versions found");
    return;
  }

  console.log(`Found ${versions.length} builds to verify\n`);

  let verified = 0;
  let failed = 0;
  const failures: Array<{ key: string; reason: string }> = [];

  for (const version of versions) {
    process.stdout.write(`  Verifying ${version.platform}-${version.arch} v${version.version}... `);

    try {
      // Download to temp file
      const tempPath = `/tmp/verify-${skillId}-${version.platform}-${version.arch}`;
      const result = await storage.downloadExecutable(version.key, tempPath);

      if (!result.success) {
        failed++;
        failures.push({ key: version.key, reason: result.error || "Download failed" });
        console.log("\x1b[31m✗ Download failed\x1b[0m");
        continue;
      }

      // Verify checksum
      const fileData = await Bun.file(tempPath).arrayBuffer();
      const actualChecksum = Bun.hash.crc32(new Uint8Array(fileData)).toString(16).padStart(8, "0");

      if (actualChecksum === version.checksum) {
        verified++;
        console.log("\x1b[32m✓ OK\x1b[0m");
      } else {
        failed++;
        failures.push({
          key: version.key,
          reason: `Checksum mismatch: expected ${version.checksum}, got ${actualChecksum}`,
        });
        console.log("\x1b[31m✗ Checksum mismatch\x1b[0m");
      }

      // Cleanup temp file
      await Bun.write(tempPath, "");
    } catch (error: any) {
      failed++;
      failures.push({ key: version.key, reason: error.message });
      console.log(`\x1b[31m✗ Error: ${error.message}\x1b[0m`);
    }
  }

  console.log("\n" + "─".repeat(60));
  console.log("Verification Summary:");
  console.log(`  Verified: \x1b[32m${verified}\x1b[0m`);
  console.log(`  Failed: \x1b[31m${failed}\x1b[0m`);

  if (failures.length > 0) {
    console.log("\nFailures:");
    failures.forEach((f) => console.log(`  ${f.key}: ${f.reason}`));
    process.exit(1);
  }

  EnhancedOutput.success("All builds verified successfully!");
}

async function cleanupCommand(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      keep: { type: "string", short: "k", default: "5" },
      "dry-run": { type: "boolean", default: false },
    },
    allowPositionals: true,
  });

  const skillId = positionals[0];
  if (!skillId) {
    throw new Error("Skill ID is required");
  }

  const keepCount = parseInt(values.keep || "5", 10);
  const dryRun = values["dry-run"];

  EnhancedOutput.printHeader(`Cleanup: ${skillId}`);
  console.log(`Keeping last ${keepCount} versions${dryRun ? " (dry run)" : ""}\n`);

  const storage = createBunR2StorageFromEnv();
  if (!storage) {
    throw new Error("Failed to create R2 storage");
  }

  const versions = await storage.listSkillVersions(skillId);
  if (versions.length === 0) {
    EnhancedOutput.info("No versions found");
    return;
  }

  // Group by version and sort by date (newest first)
  const versionGroups: Record<string, { version: string; date: Date; items: typeof versions }> = {};
  for (const v of versions) {
    if (!versionGroups[v.version]) {
      versionGroups[v.version] = {
        version: v.version,
        date: new Date(v.uploaded),
        items: [],
      };
    }
    versionGroups[v.version].items.push(v);
    // Use the most recent upload date for the version
    const itemDate = new Date(v.uploaded);
    if (itemDate > versionGroups[v.version].date) {
      versionGroups[v.version].date = itemDate;
    }
  }

  // Sort versions by date (newest first)
  const sortedVersions = Object.values(versionGroups).sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  );

  console.log(`Found ${sortedVersions.length} versions:`);
  sortedVersions.forEach((v, i) => {
    const status = i < keepCount ? "\x1b[32mKEEP\x1b[0m" : "\x1b[33mDELETE\x1b[0m";
    console.log(`  ${v.version} (${v.date.toLocaleDateString()}) - ${v.items.length} builds - ${status}`);
  });

  // Get versions to delete
  const toDelete = sortedVersions.slice(keepCount);
  if (toDelete.length === 0) {
    EnhancedOutput.info("\nNo versions to delete");
    return;
  }

  const deleteCount = toDelete.reduce((sum, v) => sum + v.items.length, 0);
  console.log(`\n${dryRun ? "Would delete" : "Deleting"} ${deleteCount} files from ${toDelete.length} versions...`);

  if (!dryRun) {
    for (const version of toDelete) {
      for (const item of version.items) {
        await storage.deleteObject(item.key);
      }
    }
    EnhancedOutput.success(`Deleted ${deleteCount} files`);
  } else {
    EnhancedOutput.info("Dry run - no files deleted");
  }
}

async function metricsCommand(_args: string[]) {
  EnhancedOutput.printHeader("Storage Metrics");

  const storage = createBunR2StorageFromEnv();
  if (!storage) {
    throw new Error("Failed to create R2 storage");
  }

  const metrics = storage.getMetrics();

  console.log("Upload Statistics:");
  console.log("─".repeat(40));
  console.log(`  Total uploads: ${metrics.uploads.total}`);
  console.log(`  Total bytes: ${EnhancedOutput.formatBytes(metrics.uploads.bytes)}`);
  console.log(`  Errors: ${metrics.uploads.errors}`);

  console.log("\nDownload Statistics:");
  console.log("─".repeat(40));
  console.log(`  Total downloads: ${metrics.downloads.total}`);
  console.log(`  Total bytes: ${EnhancedOutput.formatBytes(metrics.downloads.bytes)}`);
  console.log(`  Errors: ${metrics.downloads.errors}`);

  console.log("\nLatency Percentiles:");
  console.log("─".repeat(40));
  console.log(`  P50: ${metrics.p50Latency.toFixed(0)}ms`);
  console.log(`  P95: ${metrics.p95Latency.toFixed(0)}ms`);
  console.log(`  P99: ${metrics.p99Latency.toFixed(0)}ms`);
  console.log(`  Avg: ${metrics.avgLatency.toFixed(0)}ms`);

  console.log(`\nLast reset: ${metrics.lastReset}`);

  if (metrics.uploads.total === 0 && metrics.downloads.total === 0) {
    console.log("\nNo operations recorded yet in this session.");
  }
}

async function debugCommand(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      exec: { type: "string", short: "e" },
      run: { type: "boolean", short: "r" },
      build: { type: "boolean", short: "b" },
    },
    allowPositionals: true,
  });

  const skillId = positionals[0];
  if (!skillId) {
    throw new Error("Skill ID is required");
  }

  const skillDir = `./skills/${skillId}`;
  const skillDirExists = await Bun.file(`${skillDir}/skill.json`).exists();

  if (!skillDirExists) {
    throw new Error(`Skill not found: ${skillId}`);
  }

  // Load skill config
  const skillConfig = await Bun.file(`${skillDir}/skill.json`).json();
  const fullSkillDir = `${process.cwd()}/${skillDir}`;

  // Non-interactive mode: execute specific command
  if (values.exec || values.run || values.build) {
    EnhancedOutput.printHeader(`Debug: ${skillId}`);

    const commands: string[] = [];

    if (values.build) {
      commands.push(`bun build src/index.ts --compile --outfile dist/${skillId}`);
    }
    if (values.run) {
      const runArgs = positionals.slice(1).join(" ");
      commands.push(`bun run src/index.ts ${runArgs}`);
    }
    if (values.exec) {
      commands.push(values.exec);
    }

    commands.push("exit");

    let commandIndex = 0;
    const proc = Bun.spawn(["bash"], {
      terminal: {
        cols: process.stdout.columns || 80,
        rows: process.stdout.rows || 24,
        data(terminal, data) {
          process.stdout.write(data);

          // When we see a prompt, send next command
          if (data.includes("$ ") && commandIndex < commands.length) {
            setTimeout(() => {
              terminal.write(commands[commandIndex++] + "\n");
            }, 50);
          }
        },
      },
      env: {
        ...process.env,
        SKILL_ID: skillId,
        SKILL_DIR: fullSkillDir,
        TERM: "xterm-256color",
      },
      cwd: skillDir,
    });

    await proc.exited;
    proc.terminal?.close();

    console.log("\n\x1b[32m✓\x1b[0m Debug command completed");
    return;
  }

  // Interactive mode
  EnhancedOutput.printHeader(`Debug Shell: ${skillId}`);
  console.log(`  Skill: ${skillConfig.name || skillId}`);
  console.log(`  Version: ${skillConfig.version || "unknown"}`);
  console.log(`  Directory: ${skillDir}`);
  console.log("");
  console.log("  \x1b[36mCommands:\x1b[0m");
  console.log("    skill-run     Run the skill");
  console.log("    skill-build   Build the skill");
  console.log("    skill-test    Run tests");
  console.log("    exit          Exit debug shell");
  console.log("");
  console.log("  \x1b[33mPress Ctrl+D or type 'exit' to quit\x1b[0m");
  console.log("─".repeat(60));

  // Check if we have a TTY for interactive mode
  if (!process.stdin.isTTY) {
    console.log("\n\x1b[33mNo TTY detected. Use non-interactive mode:\x1b[0m");
    console.log(`  deploy-s3 debug ${skillId} --run [args]     Run the skill`);
    console.log(`  deploy-s3 debug ${skillId} --build          Build the skill`);
    console.log(`  deploy-s3 debug ${skillId} --exec "cmd"     Execute command`);
    return;
  }

  // Create shell init script
  const shellRcContent = `
# Skill Debug Shell - ${skillId}
export SKILL_ID="${skillId}"
export SKILL_DIR="${fullSkillDir}"
export SKILL_VERSION="${skillConfig.version || "1.0.0"}"
export PATH="$SKILL_DIR/node_modules/.bin:$PATH"

# Custom prompt
export PS1="\\[\\033[1;35m\\][${skillId}]\\[\\033[0m\\] \\[\\033[1;34m\\]\\w\\[\\033[0m\\] $ "

# Skill helper functions
skill-run() {
  echo "Running ${skillId}..."
  bun run "$SKILL_DIR/src/index.ts" "$@"
}

skill-build() {
  echo "Building ${skillId}..."
  bun build "$SKILL_DIR/src/index.ts" --compile --outfile "$SKILL_DIR/dist/${skillId}"
  echo "Built: $SKILL_DIR/dist/${skillId}"
}

skill-test() {
  echo "Testing ${skillId}..."
  if [ -f "$SKILL_DIR/src/index.test.ts" ]; then
    bun test "$SKILL_DIR/src/index.test.ts"
  else
    echo "No tests found at $SKILL_DIR/src/index.test.ts"
  fi
}

skill-upload() {
  echo "Uploading ${skillId}..."
  cd "$SKILL_DIR/../.." && bun src/cli/deploy-s3.ts upload ${skillId} --all-platforms
}

skill-info() {
  echo "Skill: ${skillConfig.name || skillId}"
  echo "Version: ${skillConfig.version || "unknown"}"
  echo "Directory: $SKILL_DIR"
  echo ""
  ls -la "$SKILL_DIR"
}

# Welcome message
echo ""
echo "🔧 Skill debug shell ready. Type 'skill-info' for details."
echo ""

cd "$SKILL_DIR"
`;

  const shellRcPath = `/tmp/skill-debug-${skillId}-${Date.now()}.sh`;
  await Bun.write(shellRcPath, shellRcContent);

  // Spawn bash with PTY using inline terminal option
  const proc = Bun.spawn(["bash", "--rcfile", shellRcPath], {
    terminal: {
      cols: process.stdout.columns || 80,
      rows: process.stdout.rows || 24,
      data(_term, data) {
        process.stdout.write(data);
      },
    },
    env: {
      ...process.env,
      SKILL_ID: skillId,
      SKILL_DIR: fullSkillDir,
      TERM: process.env.TERM || "xterm-256color",
    },
    cwd: skillDir,
  });

  // Handle terminal resize
  const resizeHandler = () => {
    proc.terminal?.resize(process.stdout.columns, process.stdout.rows);
  };
  process.stdout.on("resize", resizeHandler);

  // Set raw mode and forward stdin
  process.stdin.setRawMode(true);
  process.stdin.resume();

  const stdinHandler = (chunk: Buffer) => {
    proc.terminal?.write(chunk);
  };
  process.stdin.on("data", stdinHandler);

  // Wait for process to exit
  await proc.exited;

  // Cleanup
  process.stdin.removeListener("data", stdinHandler);
  process.stdout.removeListener("resize", resizeHandler);
  process.stdin.setRawMode(false);
  proc.terminal?.close();

  // Remove temp file
  Bun.spawnSync(["rm", "-f", shellRcPath]);

  console.log("\n\x1b[32m✓\x1b[0m Debug session ended");
}

// ═══════════════════════════════════════════════════════════════════════════
// Run CLI
// ═══════════════════════════════════════════════════════════════════════════

main().catch((error) => {
  EnhancedOutput.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
