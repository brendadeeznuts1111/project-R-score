#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/s3#bun-s3client-bun-s3 — S3Client
/**
 * R2 Environment Manager CLI
 * Quickly see and read assets across your triple-environment setup.
 */

import { parseArgs } from "util";

import { S3Client } from "bun";

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    env: { type: "string", short: "e", default: "dev" },
    help: { type: "boolean", short: "h" }
  },
  allowPositionals: true
});

if (values.help || positionals.length === 0) {
  console.info(`
R2 Environment Manager
Manage your foxy-proxy deployments across Dev, Staging, and Prod.

Usage:
  bun r2-cli.ts <command> [options]

Commands:
  list, ls           List all assets in the environment
  read <path>        Read and display the contents of an asset
  stat <path>        Show metadata for a specific asset
  envs               Show bucket configuration for all environments

Options:
  -e, --env <env>    Environment: dev, staging, prod (default: dev)
  -h, --help         Show this help message

Examples:
  bun r2-cli.ts ls --env staging
  bun r2-cli.ts read dashboard/dist/index.html --env prod
  `);
  process.exit(0);
}

const command = positionals[0];
const targetPath = positionals[1];
const env = values.env || "dev";

// R2 Configuration mapping
const getEnvConfig = (env: string) => {
  const prefix = env.toUpperCase();
  return {
    accountId: process.env.R2_ACCOUNT_ID || process.env.VITE_R2_ACCOUNT_ID || "",
    accessKeyId: process.env.R2_ACCESS_KEY_ID || process.env.VITE_R2_ACCESS_KEY_ID || "",
    secretAccessKey:
      process.env.R2_SECRET_ACCESS_KEY || process.env.VITE_R2_SECRET_ACCESS_KEY || "",
    bucketName:
      process.env[`VITE_R2_${prefix}_BUCKET_NAME`] ||
      process.env.VITE_R2_BUCKET_NAME ||
      `foxy-proxy-${env}`
  };
};

const config = getEnvConfig(env);

if (!config.accountId || !config.accessKeyId || !config.secretAccessKey) {
  console.error("❌ Error: Missing R2 credentials in environment.");
  process.exit(1);
}

const s3 = new S3Client({
  accessKeyId: config.accessKeyId,
  secretAccessKey: config.secretAccessKey,
  bucket: config.bucketName,
  endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`
});

async function run() {
  try {
    switch (command) {
      case "list":
      case "ls":
        console.info(`📂 Listing assets for ${env.toUpperCase()} (${config.bucketName})...\n`);
        const objects = await s3.list();
        if (!objects.contents || objects.contents.length === 0) {
          console.info("No assets found.");
        } else {
          console.info(`${"KEY".padEnd(50)} ${"SIZE".padEnd(10)} ${"LAST MODIFIED"}`);
          console.info("-".repeat(85));
          for (const obj of objects.contents) {
            const size = ((obj.size || 0) / 1024).toFixed(2) + " KB";
            const date = obj.lastModified ? obj.lastModified.toLocaleString() : "Unknown";
            console.info(`${obj.key.padEnd(50)} ${size.padEnd(10)} ${date}`);
          }
        }
        break;

      case "read":
        if (!targetPath) {
          console.error("❌ Error: Please specify a path to read.");
          process.exit(1);
        }
        const file = s3.file(targetPath);
        if (!(await file.exists())) {
          console.error(`❌ Error: Asset "${targetPath}" not found in ${env}.`);
          process.exit(1);
        }
        console.info(`\n--- CONTENT OF ${targetPath} (${env.toUpperCase()}) ---\n`);
        console.info(await file.text());
        break;

      case "stat":
        if (!targetPath) {
          console.error("❌ Error: Please specify a path.");
          process.exit(1);
        }
        const statFile = s3.file(targetPath);
        const metadata = await statFile.stat();
        console.info(`\n📊 Metadata for ${targetPath}:`);
        console.info(JSON.stringify(metadata, null, 2));
        break;

      case "envs":
        console.info("\n🌍 Configured Environments:");
        ["dev", "staging", "prod"].forEach((e) => {
          const c = getEnvConfig(e);
          console.info(`\n[${e.toUpperCase()}]`);
          console.info(`  Bucket: ${c.bucketName}`);
          console.info(`  Target: https://${c.accountId}.r2.cloudflarestorage.com`);
        });
        break;

      default:
        console.error(`❌ Error: Unknown command "${command}"`);
        process.exit(1);
    }
  } catch (err: any) {
    console.error(`❌ Command failed: ${err.message}`);
    process.exit(1);
  }
}

run();
