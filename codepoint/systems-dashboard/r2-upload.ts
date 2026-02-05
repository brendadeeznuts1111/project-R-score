#!/usr/bin/env bun
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { r2Config, r2Options, validateR2Config } from "./r2-config.ts";
import { uploadPaths } from "./s3-config.ts";

class R2Uploader {
  private config = r2Config;
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${this.config.endpoint}/${this.config.bucket}`;
  }

  async uploadFile(localPath: string, r2Key: string): Promise<boolean> {
    try {
      console.log(`📤 Uploading ${localPath} → ${r2Key}`);

      // Read file content
      const fileContent = readFileSync(localPath);
      const stats = statSync(localPath);

      // Determine content type based on file extension
      const contentType = this.getContentType(localPath);

      // Upload using Bun's S3-compatible fetch for R2
      const response = await fetch(`${this.baseUrl}/${r2Key}`, {
        method: "PUT",
        headers: {
          "Content-Type": contentType,
          "Content-Length": stats.size.toString(),
        },
        body: fileContent,
        s3: {
          accessKeyId: this.config.accessKeyId,
          secretAccessKey: this.config.secretAccessKey,
          region: r2Options.region,
          endpoint: this.config.endpoint,
        },
      });

      if (response.ok) {
        console.log(`✅ Successfully uploaded ${r2Key}`);
        return true;
      } else {
        console.error(
          `❌ Failed to upload ${r2Key}: ${response.status} ${response.statusText}`
        );
        return false;
      }
    } catch (error) {
      console.error(`❌ Error uploading ${localPath}:`, error);
      return false;
    }
  }

  async uploadDirectory(
    dirPath: string,
    r2Prefix: string = ""
  ): Promise<boolean> {
    try {
      const files = this.getFiles(dirPath);
      let allSuccessful = true;

      for (const filePath of files) {
        const relativePath = filePath.replace(dirPath, "").replace(/^\//, "");
        const r2Key = r2Prefix ? `${r2Prefix}/${relativePath}` : relativePath;

        const success = await this.uploadFile(filePath, r2Key);
        if (!success) allSuccessful = false;
      }

      return allSuccessful;
    } catch (error) {
      console.error(`❌ Error uploading directory ${dirPath}:`, error);
      return false;
    }
  }

  async uploadDashboard(): Promise<boolean> {
    console.log("🚀 Starting dashboard upload to Cloudflare R2...");

    if (!validateR2Config()) {
      console.error(
        "❌ R2 configuration is invalid. Please check your environment variables."
      );
      console.log(
        "Required: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY, R2_BUCKET"
      );
      return false;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const r2Prefix = `dashboard-${timestamp}`;

    let allSuccessful = true;

    // Upload main dashboard files
    console.log("📁 Uploading dashboard files...");
    for (const file of uploadPaths.dashboard) {
      const localPath = join(process.cwd(), file);
      const r2Key = `${r2Prefix}/${basename(file)}`;
      const success = await this.uploadFile(localPath, r2Key);
      if (!success) allSuccessful = false;
    }

    // Upload documentation files
    console.log("📚 Uploading documentation...");
    for (const pattern of uploadPaths.docs) {
      const files = this.getFilesByPattern(pattern);
      for (const file of files) {
        const r2Key = `${r2Prefix}/docs/${basename(file)}`;
        const success = await this.uploadFile(file, r2Key);
        if (!success) allSuccessful = false;
      }
    }

    // Upload build files if they exist
    const distPath = join(process.cwd(), "dist");
    if (existsSync(distPath) && statSync(distPath).isDirectory()) {
      console.log("🏗️ Uploading build files...");
      const success = await this.uploadDirectory(distPath, `${r2Prefix}/dist`);
      if (!success) allSuccessful = false;
    }

    // Create a manifest file
    await this.createManifest(r2Prefix);

    if (allSuccessful) {
      console.log(`🎉 All files uploaded successfully to R2!`);
      console.log(`📂 R2 Location: ${this.baseUrl}/${r2Prefix}/`);
      console.log(
        `🔗 Public URL: https://pub-${this.config.accountId}.r2.dev/${r2Prefix}/index.html`
      );
    } else {
      console.log("⚠️ Some files failed to upload. Check the logs above.");
    }

    return allSuccessful;
  }

  private async createManifest(r2Prefix: string): Promise<void> {
    const manifest = {
      timestamp: new Date().toISOString(),
      version: r2Prefix,
      provider: "cloudflare-r2",
      files: {
        dashboard: uploadPaths.dashboard,
        docs: uploadPaths.docs,
        build: uploadPaths.build,
      },
      config: {
        bucket: this.config.bucket,
        accountId: this.config.accountId,
        endpoint: this.config.endpoint,
        publicUrl: `https://pub-${this.config.accountId}.r2.dev`,
      },
    };

    const manifestContent = JSON.stringify(manifest, null, 2);
    const response = await fetch(`${this.baseUrl}/${r2Prefix}/manifest.json`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: manifestContent,
      s3: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
        region: r2Options.region,
        endpoint: this.config.endpoint,
      },
    });

    if (response.ok) {
      console.log("📋 Manifest created successfully");
    }
  }

  private getContentType(filePath: string): string {
    const ext = filePath.split(".").pop()?.toLowerCase();
    const contentTypes: Record<string, string> = {
      html: "text/html",
      css: "text/css",
      js: "application/javascript",
      ts: "application/typescript",
      tsx: "application/typescript",
      json: "application/json",
      md: "text/markdown",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      svg: "image/svg+xml",
      ico: "image/x-icon",
    };
    return contentTypes[ext || ""] || "application/octet-stream";
  }

  private getFiles(dirPath: string): string[] {
    const files: string[] = [];

    try {
      const entries = readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);
        if (entry.isFile()) {
          files.push(fullPath);
        } else if (entry.isDirectory()) {
          files.push(...this.getFiles(fullPath));
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not read directory ${dirPath}:`, error);
    }

    return files;
  }

  private getFilesByPattern(pattern: string): string[] {
    // Simple glob pattern matching
    const glob = pattern.replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*");
    const regex = new RegExp(glob);

    const files: string[] = [];
    const baseDir = pattern.split("/")[0] || ".";

    try {
      if (existsSync(baseDir)) {
        const entries = readdirSync(baseDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isFile() && regex.test(entry.name)) {
            files.push(join(baseDir, entry.name));
          }
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not read directory ${baseDir}:`, error);
    }

    return files;
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];

  switch (command) {
    case "upload":
    case "up":
      const uploader = new R2Uploader();
      await uploader.uploadDashboard();
      break;

    case "validate":
    case "check":
      if (validateR2Config()) {
        console.log("✅ R2 configuration is valid");
      } else {
        console.log("❌ R2 configuration is invalid");
        console.log(
          "Required: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY, R2_BUCKET"
        );
      }
      break;

    default:
      console.log("📋 R2 Dashboard Uploader (Cloudflare R2)");
      console.log("");
      console.log("Commands:");
      console.log("  upload, up    - Upload dashboard to R2");
      console.log("  validate, check - Validate R2 configuration");
      console.log("");
      console.log("Environment Variables:");
      console.log("  CLOUDFLARE_ACCOUNT_ID     - Cloudflare account ID");
      console.log("  CLOUDFLARE_R2_ACCESS_KEY_ID  - R2 access key");
      console.log("  CLOUDFLARE_R2_SECRET_ACCESS_KEY  - R2 secret key");
      console.log("  R2_BUCKET              - R2 bucket name");
      console.log("  R2_ENDPOINT            - Custom R2 endpoint (optional)");
      break;
  }
}

if (import.meta.main) {
  main().catch(console.error);
}

export default R2Uploader;
