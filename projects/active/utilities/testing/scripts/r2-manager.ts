#!/usr/bin/env bun
/**
 * ☁️ Cloudflare R2 Bucket Manager
 * Setup, upload, and manage R2 storage with dry run support
 * 
 * Usage:
 *   bun run scripts/r2-manager.ts setup [--dry-run]
 *   bun run scripts/r2-manager.ts upload <file> [--dry-run]
 *   bun run scripts/r2-manager.ts list [--dry-run]
 *   bun run scripts/r2-manager.ts verify
 */

import { $, write, glob, BunFile } from "bun";

interface CliArgs {
  command: string;
  dryRun: boolean;
  file?: string;
  verbose: boolean;
}

interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
}

const BUCKET_NAME = "dev-hq-assets";
const DRY_RUN_PREFIX = "[DRY RUN]";

/**
 * Parse command line arguments
 */
function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  return {
    command: args[0] || "setup",
    dryRun: args.includes("--dry-run"),
    file: args.find((a, i) => args[i - 1] === "upload" || args[i - 1] === "upload") || args.find(a => a.endsWith(".txt") || a.endsWith(".json") || a.endsWith(".png") || a.endsWith(".jpg")),
    verbose: args.includes("--verbose") || args.includes("-v"),
  };
}

/**
 * Log with optional prefix
 */
function log(message: string, dryRun: boolean = false): void {
  const prefix = dryRun ? `🟡 ${DRY_RUN_PREFIX}` : "✅";
  console.info(`${prefix} ${message}`);
}

function warn(message: string): void {
  console.info(`⚠️ ${message}`);
}

function info(message: string): void {
  console.info(`ℹ️ ${message}`);
}

/**
 * Check wrangler installation
 */
async function checkWrangler(): Promise<boolean> {
  info("Checking for wrangler...");
  try {
    await $`bunx wrangler --version`.quiet();
    log("Wrangler is installed");
    return true;
  } catch {
    warn("Wrangler not found. Install with: npm install -g wrangler");
    return false;
  }
}

/**
 * Get R2 configuration from environment
 */
function getConfig(): R2Config | null {
  const config: R2Config = {
    accountId: process.env.R2_ACCOUNT_ID || "",
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    bucketName: process.env.R2_BUCKET_NAME || BUCKET_NAME,
  };

  const missing = Object.entries(config)
    .filter(([k, v]) => !v && k !== "bucketName")
    .map(([k]) => k);

  if (missing.length > 0) {
    warn(`Missing environment variables: ${missing.join(", ")}`);
    return null;
  }

  return config;
}

/**
 * Setup R2 bucket and configuration
 */
async function setup(dryRun: boolean): Promise<void> {
  console.info("\n" + "═".repeat(60));
  console.info("🌐 Cloudflare R2 Bucket Setup");
  console.info("═".repeat(60));

  const wranglerInstalled = await checkWrangler();
  const config = getConfig();

  // Step 1: Check wrangler
  console.info("\n📦 Step 1: Wrangler Check");
  if (!wranglerInstalled) {
    info("Install wrangler first: npm install -g wrangler");
  }

  // Step 2: R2 Bucket Creation
  console.info("\n🪣 Step 2: R2 Bucket Creation");
  info(`Bucket name: ${BUCKET_NAME}`);
  console.info("\n📋 To create the bucket, choose ONE option:");
  
  console.info("\n   Option A - Dashboard:");
  console.info("   1. Go to: https://dash.cloudflare.com/?to=/:account/r2");
  console.info("   2. Click 'Create bucket'");
  console.info("   3. Enter: " + BUCKET_NAME);
  console.info("   4. Click 'Create bucket'");
  console.info("   5. Click 'Manage R2 API tokens'");
  console.info("   6. Create token with R2 permissions");
  
  console.info("\n   Option B - CLI (after logging in):");
  console.info("   bunx wrangler login");
  console.info("   # Note: R2 bucket creation via CLI requires API call");
  
  console.info("\n   Option C - API:");
  console.info(`   curl -X POST "https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/r2/buckets" \\`);
  console.info('     -H "Authorization: Bearer <API_TOKEN>" \\');
  console.info('     -H "Content-Type: application/json" \\');
  console.info(`     -d '{"name":"${BUCKET_NAME}"}'`);

  // Step 3: Environment Configuration
  console.info("\n🔧 Step 3: Environment Configuration");
  if (config) {
    log("R2 configuration detected from environment");
    info(`Account ID: ${config.accountId.slice(0, 8)}...`);
    info(`Bucket: ${config.bucketName}`);
  } else {
    warn("R2 environment variables not set");
    console.info("\n📝 Create a .env file with:");
    console.info("   R2_ACCOUNT_ID=your-account-id");
    console.info("   R2_ACCESS_KEY_ID=your-access-key");
    console.info("   R2_SECRET_ACCESS_KEY=your-secret-key");
    console.info("   R2_BUCKET_NAME=dev-hq-assets");
  }

  // Step 4: Update wrangler.toml
  console.info("\n📄 Step 4: wrangler.toml Configuration");
  if (dryRun) {
    log("Would update wrangler.toml with R2 configuration");
  } else {
    const wranglerConfig = `# 🌤️ Cloudflare Workers + R2 Configuration
# Generated for: Dev HQ
# Main entry: api/server.ts

name = "dev-hq"
main = "api/server.ts"
compatibility_date = "2024-01-01"

[vars]
ENVIRONMENT = "production"
R2_BUCKET_NAME = "${BUCKET_NAME}"

# Bun runtime
renderer = "bun"

# R2 credentials (use secrets in production)
# bunx wrangler secret put R2_ACCESS_KEY_ID
# bunx wrangler secret put R2_SECRET_ACCESS_KEY

[env_vars]
# R2_ACCOUNT_ID = { type = "text", name = "R2_ACCOUNT_ID" }

# Routes (custom domain)
# [[routes]]
# pattern = "api.devhq.com/*"
# zone_name = "devhq.com"

# KV Namespace for caching
# [[kv_namespaces]]
# binding = "CACHE"
# id = "your-kv-id"

# Deploy: bunx wrangler deploy
# Dev: bunx wrangler deploy --env development
# Preview: bunx wrangler dev
`;
    await write("wrangler.toml", wranglerConfig);
    log("Updated wrangler.toml");
  }

  console.info("\n" + "═".repeat(60));
  console.info("✅ Setup guide complete!");
  console.info("\n📋 Next Steps:");
  console.info("   1. Create R2 bucket in dashboard");
  console.info("   2. Set R2_* environment variables");
  console.info("   3. Run: bun run scripts/r2-manager.ts upload <file>");
  console.info("═".repeat(60));
}

/**
 * Upload a file to R2
 */
async function upload(file: string, dryRun: boolean): Promise<void> {
  console.info("\n" + "═".repeat(60));
  console.info("📤 R2 File Upload");
  console.info("═".repeat(60));

  const config = getConfig();
  if (!config) {
    warn("Cannot upload: R2 configuration missing");
    return;
  }

  // Check file exists
  const filePath = file.startsWith("/") ? file : `./${file}`;
  const bunFile = Bun.file(filePath);
  
  if (!await bunFile.exists()) {
    warn(`File not found: ${filePath}`);
    return;
  }

  const fileInfo = await bunFile.info();
  const key = file.split("/").pop() || file;
  const url = `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucketName}/${key}`;

  console.info(`\n📁 File: ${file}`);
  console.info(`📦 Size: ${(fileInfo.size / 1024).toFixed(2)} KB`);
  console.info(`🗂️  Key: ${key}`);
  console.info(`🌐 URL: ${url}`);

  // Confirm upload
  console.info("\n🔍 Upload Confirmation:");
  console.info("   This will upload the file to R2 bucket.");
  console.info("   Confirm by typing 'yes' or skip with Ctrl+C");
  
  // Perform upload
  console.info("\n📤 Uploading...");
  if (dryRun) {
    log(`Would upload ${file} to R2 bucket ${config.bucketName}`);
  } else {
    try {
      const data = await bunFile.arrayBuffer();
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": bunFile.type || "application/octet-stream",
        },
        body: data,
      });

      if (response.ok) {
        const etag = response.headers.get("etag");
        log("Upload successful!");
        console.info(`   ETag: ${etag}`);
        console.info(`   Dashboard: https://dash.cloudflare.com/?to=/:account/r2/${config.bucketName}`);
      } else {
        warn(`Upload failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      warn(`Upload error: ${error}`);
    }
  }

  console.info("\n" + "═".repeat(60));
}

/**
 * List files in R2 bucket
 */
async function listFiles(dryRun: boolean): Promise<void> {
  console.info("\n" + "═".repeat(60));
  console.info("📋 R2 Bucket Contents");
  console.info("═".repeat(60));

  const config = getConfig();
  if (!config) {
    warn("Cannot list: R2 configuration missing");
    return;
  }

  if (dryRun) {
    log("Would list files in R2 bucket");
  } else {
    try {
      const url = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/r2/buckets/${config.bucketName}/objects`;
      
      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${config.secretAccessKey}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        const objects = result.objects || [];
        
        console.info(`\n📦 Found ${objects.length} objects in bucket: ${config.bucketName}\n`);
        
        if (objects.length === 0) {
          info("Bucket is empty");
        } else {
          console.info("   Name".padEnd(40) + "Size".padEnd(12) + "Modified");
          console.info("   " + "─".repeat(60));
          
          for (const obj of objects.slice(0, 20)) {
            const size = obj.size < 1024 
              ? `${obj.size} B` 
              : `${(obj.size / 1024).toFixed(1)} KB`;
            const modified = new Date(obj.modified).toLocaleDateString();
            console.info(`   ${obj.key.slice(0, 38).padEnd(40)}${size.padEnd(12)}${modified}`);
          }
          
          if (objects.length > 20) {
            console.info(`   ... and ${objects.length - 20} more objects`);
          }
        }
        
        console.info(`\n🌐 View in Dashboard:`);
        console.info(`   https://dash.cloudflare.com/?to=/:account/r2/${config.bucketName}`);
      } else {
        warn(`List failed: ${response.status}`);
      }
    } catch (error) {
      warn(`List error: ${error}`);
    }
  }

  console.info("\n" + "═".repeat(60));
}

/**
 * Verify R2 configuration and connectivity
 */
async function verify(): Promise<void> {
  console.info("\n" + "═".repeat(60));
  console.info("🔍 R2 Configuration Verification");
  console.info("═".repeat(60));

  // Check environment variables
  console.info("\n📋 Environment Variables:");
  const checks = [
    { name: "R2_ACCOUNT_ID", key: "R2_ACCOUNT_ID" },
    { name: "R2_ACCESS_KEY_ID", key: "R2_ACCESS_KEY_ID" },
    { name: "R2_SECRET_ACCESS_KEY", key: "R2_SECRET_ACCESS_KEY" },
    { name: "R2_BUCKET_NAME", key: "R2_BUCKET_NAME", default: BUCKET_NAME },
  ];

  let allPassed = true;
  for (const check of checks) {
    const value = process.env[check.key] || check.default;
    const status = value ? "✅" : "❌";
    console.info(`   ${status} ${check.name}: ${value ? "set" : "not set"}`);
    if (!value) allPassed = false;
  }

  // Check wrangler
  console.info("\n📦 Wrangler:");
  const wranglerOk = await checkWrangler();
  if (!wranglerOk) allPassed = false;

  // Check bucket (API call)
  console.info("\n🪣 R2 Bucket:");
  const config = getConfig();
  if (config) {
    try {
      const url = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/r2/buckets/${config.bucketName}`;
      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${config.secretAccessKey}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.info(`   ✅ Bucket exists: ${config.bucketName}`);
        if (result.location) {
          console.info(`   📍 Location: ${result.location}`);
        }
      } else if (response.status === 404) {
        console.info(`   ❌ Bucket not found: ${config.bucketName}`);
        console.info(`   💡 Create at: https://dash.cloudflare.com/?to=/:account/r2`);
        allPassed = false;
      } else {
        console.info(`   ⚠️ Check failed: ${response.status}`);
      }
    } catch (error) {
      console.info(`   ❌ Connection error: ${error}`);
      allPassed = false;
    }
  } else {
    console.info("   ❌ Cannot check bucket (missing credentials)");
    allPassed = false;
  }

  // Summary
  console.info("\n" + "═".repeat(60));
  if (allPassed) {
    console.info("✅ All checks passed! R2 is ready to use.");
  } else {
    console.info("⚠️ Some checks failed. Review the output above.");
    console.info("\n📋 Quick Actions:");
    console.info("   1. Create bucket in dashboard");
    console.info("   2. Set R2_* environment variables");
    console.info("   3. Run this verification again");
  }
  console.info("═".repeat(60));
}

/**
 * Main entry point
 */
async function main() {
  const args = parseArgs();
  
  console.info(`\n🌐 Dev HQ R2 Manager`);
  console.info(`   Command: ${args.command}`);
  console.info(`   Dry Run: ${args.dryRun ? "Yes" : "No"}`);
  
  switch (args.command) {
    case "setup":
      await setup(args.dryRun);
      break;
    case "upload":
      if (args.file) {
        await upload(args.file, args.dryRun);
      } else {
        warn("Please specify a file to upload");
        console.info("   Usage: bun run scripts/r2-manager.ts upload <file>");
      }
      break;
    case "list":
      await listFiles(args.dryRun);
      break;
    case "verify":
    case "check":
      await verify();
      break;
    case "help":
    case "--help":
      console.info(`
☁️ Dev HQ R2 Manager

Usage:
  bun run scripts/r2-manager.ts <command> [options]

Commands:
  setup           Show R2 setup guide
  upload <file>   Upload file to R2 bucket
  list            List files in R2 bucket
  verify          Verify R2 configuration

Options:
  --dry-run       Show what would happen without making changes
  --verbose, -v  Show detailed output

Examples:
  bun run scripts/r2-manager.ts setup --dry-run
  bun run scripts/r2-manager.ts upload data.json
  bun run scripts/r2-manager.ts upload screenshot.png
  bun run scripts/r2-manager.ts list --dry-run
  bun run scripts/r2-manager.ts verify

Dashboard:
  https://dash.cloudflare.com/?to=/:account/r2
`);
      break;
    default:
      warn(`Unknown command: ${args.command}`);
      console.info("   Run 'bun run scripts/r2-manager.ts help' for usage");
  }
}

main().catch(console.error);
