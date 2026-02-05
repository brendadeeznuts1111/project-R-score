#!/usr/bin/env bun

// Enhanced Bun R2 Upload Tool with Content-Disposition Support
// Uses latest Bun features for better file handling

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
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m"
} as const;

function colorLog(color: keyof typeof colors, message: string): void {
  console.log(`${colors[color]}${message}${colors.reset}`);
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
  console.log("");
  console.log(`📁 Local file: ${localPath}`);
  console.log(`🌐 Bucket: ${config.bucketName}`);
  console.log(`📝 Remote name: ${key}`);

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

  console.log("");

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
      console.log("");
      colorLog("blue", "📊 Upload Details:");
      console.log(`   • File: ${key}`);
      console.log(`   • Size: ${fileSize} KB`);
      console.log(`   • Bucket: ${config.bucketName}`);

      if (contentDispositionMsg) {
        console.log(`   • Content-Disposition: ${contentDispositionMsg}`);
      }

      console.log("");
      colorLog("blue", "🌐 Access URLs:");
      console.log("   • Web Interface: http://localhost:5173");
      console.log(`   • Direct URL: ${config.endpoint}/${config.bucketName}/${key}`);

      if (options.forceDownload) {
        console.log("");
        colorLog("yellow", "💡 Download behavior: File will force download when accessed directly");
      } else if (options.inline) {
        console.log("");
        colorLog(
          "yellow",
          "💡 Display behavior: File will display inline in browser when possible"
        );
      }
    } else {
      colorLog("red", "❌ Upload failed:");
      console.log(stderr);
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
  console.log("");
  colorLog("yellow", "Usage:");
  console.log("   bun scripts/bun-r2-enhanced.ts <command> [options]");
  console.log("");
  colorLog("yellow", "Commands:");
  console.log("   upload <file> [name]           - Standard upload");
  console.log("   download <file> [name]         - Force download behavior");
  console.log("   inline <file> [name]           - Inline display behavior");
  console.log("   help                           - Show this help");
  console.log("");
  colorLog("yellow", "Examples:");
  console.log("   bun scripts/bun-r2-enhanced.ts upload ./report.pdf");
  console.log("   bun scripts/bun-r2-enhanced.ts download ./document.pdf quarterly-report.pdf");
  console.log("   bun scripts/bun-r2-enhanced.ts inline ./image.png gallery-photo.png");
  console.log("");
  colorLog("blue", "💡 New Features:");
  console.log("   • Content-Disposition support for download control");
  console.log("   • Custom filename specification");
  console.log("   • Inline vs download behavior");
  console.log("   • Enhanced file handling with latest Bun APIs");
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
