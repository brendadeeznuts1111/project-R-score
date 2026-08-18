#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// Enhanced Bun R2 Upload Tool — credentials from config/r2-env (never hardcode secrets)

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
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m"
} as const;

function colorLog(color: keyof typeof colors, message: string): void {
  console.info(`${colors[color]}${message}${colors.reset}`);
}

// Enhanced file upload with Content-Disposition
async function uploadFileEnhanced(
  localPath: string,
  remoteName?: string,
  options: {
    forceDownload?: boolean;
    customFilename?: string;
    inline?: boolean;
  } = {}
): Promise<void> {
  const key = remoteName || localPath.split("/").pop() || "uploaded-file";

  colorLog("cyan", "🚀 Enhanced Bun R2 Upload Tool");
  colorLog("cyan", "===============================");
  console.info("");
  console.info(`📁 Local file: ${localPath}`);
  console.info(`🌐 Bucket: ${config.bucketName}`);
  console.info(`📝 Remote name: ${key}`);

  // Build Content-Disposition message for display
  let contentDispositionMsg = "";
  if (options.forceDownload) {
    const filename = options.customFilename || key;
    contentDispositionMsg = `attachment; filename="${filename}"`;
    colorLog("magenta", "📥 Force download: ENABLED");
  } else if (options.inline) {
    const filename = options.customFilename || key;
    contentDispositionMsg = `inline; filename="${filename}"`;
    colorLog("magenta", "🌐 Inline display: ENABLED");
  }

  console.info("");

  try {
    const file = Bun.file(localPath);
    if (!(await file.exists())) {
      colorLog("red", "❌ Local file not found: " + localPath);
      return;
    }

    const fileBuffer = await file.arrayBuffer();
    const fileSize = (fileBuffer.byteLength / 1024).toFixed(2);

    colorLog("blue", "🚀 Uploading to R2 with enhanced options...");

    // Use Bun.spawn to run wrangler command (working approach)
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

      if (contentDispositionMsg) {
        console.info(`   • Content-Disposition: ${contentDispositionMsg}`);
      }

      console.info("");
      colorLog("blue", "🌐 Access URLs:");
      console.info("   • Web Interface: http://localhost:5173");
      console.info(`   • Direct URL: ${config.endpoint}/${config.bucketName}/${key}`);

      if (options.forceDownload) {
        console.info("");
        colorLog("yellow", "💡 Download behavior: File will force download when accessed directly");
      } else if (options.inline) {
        console.info("");
        colorLog(
          "yellow",
          "💡 Display behavior: File will display inline in browser when possible"
        );
      }
    } else {
      colorLog("red", "❌ Upload failed:");
      console.info(stderr);
    }
  } catch (error) {
    colorLog("red", "❌ Upload failed: " + error);
  }
}

// Quick upload presets
async function uploadAsDownload(localPath: string, remoteName?: string): Promise<void> {
  colorLog("yellow", "📥 Upload as Download (force download)");
  await uploadFileEnhanced(localPath, remoteName, { forceDownload: true });
}

async function uploadInline(localPath: string, remoteName?: string): Promise<void> {
  colorLog("yellow", "🌐 Upload Inline (display in browser)");
  await uploadFileEnhanced(localPath, remoteName, { inline: true });
}

// Show help
function showHelp(): void {
  colorLog("cyan", "🚀 Enhanced Bun R2 Upload Tool");
  colorLog("cyan", "============================");
  console.info("");
  colorLog("yellow", "Usage:");
  console.info("   bun scripts/bun-r2-enhanced.ts <command> [options]");
  console.info("");
  colorLog("yellow", "Commands:");
  console.info("   upload <file> [name]           - Standard upload");
  console.info("   download <file> [name]         - Force download behavior");
  console.info("   inline <file> [name]           - Inline display behavior");
  console.info("   help                           - Show this help");
  console.info("");
  colorLog("yellow", "Examples:");
  console.info("   bun scripts/bun-r2-enhanced.ts upload ./report.pdf");
  console.info("   bun scripts/bun-r2-enhanced.ts download ./document.pdf quarterly-report.pdf");
  console.info("   bun scripts/bun-r2-enhanced.ts inline ./image.png gallery-photo.png");
  console.info("");
  colorLog("blue", "💡 New Features:");
  console.info("   • Content-Disposition support for download control");
  console.info("   • Custom filename specification");
  console.info("   • Inline vs download behavior");
  console.info("   • Enhanced file handling with latest Bun APIs");
}

// Main execution
async function main(): Promise<void> {
  const command = process.argv[2];

  switch (command) {
    case "upload":
      if (process.argv.length < 4) {
        colorLog("red", "❌ Please specify a file to upload");
        showHelp();
        process.exit(1);
      }
      await uploadFileEnhanced(process.argv[3], process.argv[4]);
      break;
    case "download":
      if (process.argv.length < 4) {
        colorLog("red", "❌ Please specify a file to upload");
        showHelp();
        process.exit(1);
      }
      await uploadAsDownload(process.argv[3], process.argv[4]);
      break;
    case "inline":
      if (process.argv.length < 4) {
        colorLog("red", "❌ Please specify a file to upload");
        showHelp();
        process.exit(1);
      }
      await uploadInline(process.argv[3], process.argv[4]);
      break;
    case "help":
    default:
      showHelp();
      break;
  }
}

// Run the enhanced upload tool
main().catch(console.error);
