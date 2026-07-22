#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// Bun R2 CLI Tool — credentials from config/r2-env (never hardcode secrets)

import {
  cloudflareAccountIdFromEnv,
  r2EndpointFromAccount,
} from '../../../../../config/r2-env.ts';

function loadConfig() {
  const accountId = cloudflareAccountIdFromEnv();
  const accessKeyId = Bun.env.R2_ACCESS_KEY_ID || '';
  const secretAccessKey = Bun.env.R2_SECRET_ACCESS_KEY || '';
  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      'Missing R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY (see config/r2-env.ts)'
    );
  }
  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName: Bun.env.R2_BUCKET || 'foxy-proxy-storage',
    endpoint: r2EndpointFromAccount(accountId),
  };
}

const config = loadConfig();

// Colors for output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m"
} as const;

function colorLog(color: keyof typeof colors, message: string): void {
  console.info(`${colors[color]}${message}${colors.reset}`);
}

// List objects in bucket using wrangler
async function listObjects(): Promise<void> {
  colorLog("cyan", "📋 Listing objects in bucket: " + config.bucketName);
  console.info("");

  try {
    colorLog("blue", "🔍 Fetching bucket contents...");

    // Use Bun.spawn to run wrangler command
    const proc = Bun.spawn(["wrangler", "r2", "object", "list", config.bucketName], {
      stdout: "pipe",
      stderr: "pipe"
    });

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    if (exitCode === 0) {
      colorLog("green", "✅ Bucket contents retrieved!");
      console.info("");
      console.info(stdout);
    } else {
      colorLog("red", "❌ Error listing objects:");
      console.info(stderr);
    }
  } catch (error) {
    colorLog("red", "❌ Error listing objects: " + error);
  }
}

// Upload file to bucket using wrangler
async function uploadFile(localPath: string, remoteName?: string): Promise<void> {
  const key = remoteName || localPath.split("/").pop() || "uploaded-file";

  colorLog("cyan", "📤 Uploading file to bucket: " + config.bucketName);
  console.info("");
  console.info(`📁 Local file: ${localPath}`);
  console.info(`📝 Remote name: ${key}`);
  console.info("");

  try {
    const file = Bun.file(localPath);
    if (!(await file.exists())) {
      colorLog("red", "❌ Local file not found: " + localPath);
      return;
    }

    const fileSize = (file.size / 1024).toFixed(2);

    colorLog("blue", "🚀 Uploading to R2...");

    // Use Bun.spawn to run wrangler command
    const proc = Bun.spawn(
      ["wrangler", "r2", "object", "put", `${config.bucketName}/${key}`, "--file", localPath],
      {
        stdout: "pipe",
        stderr: "pipe"
      }
    );

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    if (exitCode === 0) {
      colorLog("green", "✅ Upload successful!");
      console.info("");
      colorLog("blue", "📊 Upload Details:");
      console.info(`   • File: ${key}`);
      console.info(`   • Size: ${fileSize} KB`);
      console.info(`   • Bucket: ${config.bucketName}`);
      console.info("");
      colorLog("blue", "🌐 Access URLs:");
      console.info("   • Web Interface: http://localhost:5173");
      console.info(`   • Direct URL: ${config.endpoint}/${config.bucketName}/${key}`);
    } else {
      colorLog("red", "❌ Upload failed:");
      console.info(stderr);
    }
  } catch (error) {
    colorLog("red", "❌ Upload error: " + error);
  }
}

// Download file from bucket
async function downloadFile(remoteKey: string, localPath?: string) {
  const outputPath = localPath || remoteKey.split("/").pop() || "downloaded-file";

  colorLog("cyan", "📥 Downloading file from R2:");
  console.info(`   Remote: ${remoteKey}`);
  console.info(`   Local: ${outputPath}`);
  console.info("");

  try {
    const response = await client.getObject({
      Bucket: config.bucketName,
      Key: remoteKey
    });

    if (response.Body) {
      await Bun.write(outputPath, response.Body);
      colorLog("green", "✅ Download successful: " + outputPath);

      const stats = await Bun.file(outputPath).stat();
      console.info(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);
    } else {
      colorLog("red", "❌ File not found: " + remoteKey);
    }
  } catch (error) {
    colorLog("red", "❌ Download failed: " + error);
  }
}

// Delete file from bucket
async function deleteFile(remoteKey: string) {
  colorLog("yellow", "🗑️  Deleting file from R2: " + remoteKey);

  try {
    await client.deleteObject({
      Bucket: config.bucketName,
      Key: remoteKey
    });

    colorLog("green", "✅ File deleted successfully");
  } catch (error) {
    colorLog("red", "❌ Delete failed: " + error);
  }
}

// Show bucket info
async function bucketInfo() {
  colorLog("cyan", "📊 R2 Bucket Information:");
  console.info("");
  console.info(`   Name: ${config.bucketName}`);
  console.info(`   Account ID: ${config.accountId}`);
  console.info(`   Endpoint: ${config.endpoint}`);
  console.info("");

  // Try to list objects to show bucket activity
  try {
    const response = await client.listObjects({
      Bucket: config.bucketName
    });

    const count = response.Contents?.length || 0;
    colorLog("green", `   Objects: ${count} file(s)`);

    if (count > 0) {
      console.info("   Status: Active and accessible");
    } else {
      console.info("   Status: Ready for uploads");
    }
  } catch (error) {
    colorLog("red", "   Status: Connection error");
  }
}

// Show help
function showHelp() {
  colorLog("cyan", "🚀 Bun R2 CLI Tool");
  colorLog("cyan", "==================");
  console.info("");
  colorLog("yellow", "Usage:");
  console.info("   bun x scripts/bun-r2-cli.ts <command> [options]");
  console.info("");
  colorLog("yellow", "Commands:");
  console.info("   list                    - List all files in bucket");
  console.info("   upload <file> [name]    - Upload a file");
  console.info("   download <key> [output] - Download a file");
  console.info("   delete <key>            - Delete a file");
  console.info("   info                    - Show bucket information");
  console.info("   help                    - Show this help");
  console.info("");
  colorLog("yellow", "Examples:");
  console.info("   bun x scripts/bun-r2-cli.ts list");
  console.info("   bun x scripts/bun-r2-cli.ts upload ./photo.jpg");
  console.info("   bun x scripts/bun-r2-cli.ts upload ./data.json backup/data.json");
  console.info("   bun x scripts/bun-r2-cli.ts download test-upload.txt");
  console.info("   bun x scripts/bun-r2-cli.ts delete old-file.txt");
  console.info("");
  colorLog("blue", "💡 Web Interface: http://localhost:5173");
}

// Main execution
async function main() {
  const command = process.argv[2];

  switch (command) {
    case "list":
      await listObjects();
      break;
    case "upload":
      if (!process.argv[3]) {
        colorLog("red", "❌ Please specify a file to upload");
        showHelp();
        process.exit(1);
      }
      await uploadFile(process.argv[3], process.argv[4]);
      break;
    case "download":
      if (!process.argv[3]) {
        colorLog("red", "❌ Please specify a remote key to download");
        showHelp();
        process.exit(1);
      }
      await downloadFile(process.argv[3], process.argv[4]);
      break;
    case "delete":
      if (!process.argv[3]) {
        colorLog("red", "❌ Please specify a remote key to delete");
        showHelp();
        process.exit(1);
      }
      await deleteFile(process.argv[3]);
      break;
    case "info":
      await bucketInfo();
      break;
    case "help":
    default:
      showHelp();
      break;
  }
}

// Run the CLI
main().catch(console.error);
