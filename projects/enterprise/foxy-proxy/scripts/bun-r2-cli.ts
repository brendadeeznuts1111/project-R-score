#!/usr/bin/env bun

// Bun R2 CLI Tool
// Use Bun's built-in capabilities to manage your R2 bucket

// Configuration
const config = {
  accountId: "7a470541a704caaf91e71efccc78fd36",
  accessKeyId: "38249351bba711763bc4a9c066ea84f4",
  secretAccessKey: "2c6c0a87aa35efd4292eef13e7db0de92900de05665b7fc4f2f8a99247c967f6",
  bucketName: "foxy-proxy-storage",
  endpoint: "https://7a470541a704caaf91e71efccc78fd36.r2.cloudflarestorage.com"
} as const;

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
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// List objects in bucket using wrangler
async function listObjects(): Promise<void> {
  colorLog("cyan", "📋 Listing objects in bucket: " + config.bucketName);
  console.log("");

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
      console.log("");
      console.log(stdout);
    } else {
      colorLog("red", "❌ Error listing objects:");
      console.log(stderr);
    }
  } catch (error) {
    colorLog("red", "❌ Error listing objects: " + error);
  }
}

// Upload file to bucket using wrangler
async function uploadFile(localPath: string, remoteName?: string): Promise<void> {
  const key = remoteName || localPath.split("/").pop() || "uploaded-file";

  colorLog("cyan", "📤 Uploading file to bucket: " + config.bucketName);
  console.log("");
  console.log(`📁 Local file: ${localPath}`);
  console.log(`📝 Remote name: ${key}`);
  console.log("");

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
      console.log("");
      colorLog("blue", "📊 Upload Details:");
      console.log(`   • File: ${key}`);
      console.log(`   • Size: ${fileSize} KB`);
      console.log(`   • Bucket: ${config.bucketName}`);
      console.log("");
      colorLog("blue", "🌐 Access URLs:");
      console.log("   • Web Interface: http://localhost:5173");
      console.log(`   • Direct URL: ${config.endpoint}/${config.bucketName}/${key}`);
    } else {
      colorLog("red", "❌ Upload failed:");
      console.log(stderr);
    }
  } catch (error) {
    colorLog("red", "❌ Upload error: " + error);
  }
}

// Download file from bucket
async function downloadFile(remoteKey: string, localPath?: string) {
  const outputPath = localPath || remoteKey.split("/").pop() || "downloaded-file";

  colorLog("cyan", "📥 Downloading file from R2:");
  console.log(`   Remote: ${remoteKey}`);
  console.log(`   Local: ${outputPath}`);
  console.log("");

  try {
    const response = await client.getObject({
      Bucket: config.bucketName,
      Key: remoteKey
    });

    if (response.Body) {
      await Bun.write(outputPath, response.Body);
      colorLog("green", "✅ Download successful: " + outputPath);

      const stats = await Bun.file(outputPath).stat();
      console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);
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
  console.log("");
  console.log(`   Name: ${config.bucketName}`);
  console.log(`   Account ID: ${config.accountId}`);
  console.log(`   Endpoint: ${config.endpoint}`);
  console.log("");

  // Try to list objects to show bucket activity
  try {
    const response = await client.listObjects({
      Bucket: config.bucketName
    });

    const count = response.Contents?.length || 0;
    colorLog("green", `   Objects: ${count} file(s)`);

    if (count > 0) {
      console.log("   Status: Active and accessible");
    } else {
      console.log("   Status: Ready for uploads");
    }
  } catch (error) {
    colorLog("red", "   Status: Connection error");
  }
}

// Show help
function showHelp() {
  colorLog("cyan", "🚀 Bun R2 CLI Tool");
  colorLog("cyan", "==================");
  console.log("");
  colorLog("yellow", "Usage:");
  console.log("   bun x scripts/bun-r2-cli.ts <command> [options]");
  console.log("");
  colorLog("yellow", "Commands:");
  console.log("   list                    - List all files in bucket");
  console.log("   upload <file> [name]    - Upload a file");
  console.log("   download <key> [output] - Download a file");
  console.log("   delete <key>            - Delete a file");
  console.log("   info                    - Show bucket information");
  console.log("   help                    - Show this help");
  console.log("");
  colorLog("yellow", "Examples:");
  console.log("   bun x scripts/bun-r2-cli.ts list");
  console.log("   bun x scripts/bun-r2-cli.ts upload ./photo.jpg");
  console.log("   bun x scripts/bun-r2-cli.ts upload ./data.json backup/data.json");
  console.log("   bun x scripts/bun-r2-cli.ts download test-upload.txt");
  console.log("   bun x scripts/bun-r2-cli.ts delete old-file.txt");
  console.log("");
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
