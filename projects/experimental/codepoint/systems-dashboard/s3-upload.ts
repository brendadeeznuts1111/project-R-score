#!/usr/bin/env bun
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { s3Config, uploadPaths, validateS3Config } from "./s3-config.ts";

class S3Uploader {
  private config = s3Config;
  private baseUrl: string;

  constructor() {
    this.baseUrl = `s3://${this.config.bucket}`;
  }

  async uploadFile(localPath: string, s3Key: string): Promise<boolean> {
    try {
      console.info(`📤 Uploading ${localPath} → ${s3Key}`);

      // Read file content
      const fileContent = readFileSync(localPath);
      const stats = statSync(localPath);

      // Determine content type based on file extension
      const contentType = this.getContentType(localPath);

      // Upload using Bun's S3 fetch
      const response = await fetch(`${this.baseUrl}/${s3Key}`, {
        method: "PUT",
        headers: {
          "Content-Type": contentType,
          "Content-Length": stats.size.toString(),
        },
        body: fileContent,
        s3: {
          accessKeyId: this.config.accessKeyId,
          secretAccessKey: this.config.secretAccessKey,
          region: this.config.region,
          endpoint: this.config.endpoint,
        },
      });

      if (response.ok) {
        console.info(`✅ Successfully uploaded ${s3Key}`);
        return true;
      } else {
        console.error(
          `❌ Failed to upload ${s3Key}: ${response.status} ${response.statusText}`
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
    s3Prefix: string = ""
  ): Promise<boolean> {
    try {
      const files = this.getFiles(dirPath);
      let allSuccessful = true;

      for (const filePath of files) {
        const relativePath = filePath.replace(dirPath, "").replace(/^\//, "");
        const s3Key = s3Prefix ? `${s3Prefix}/${relativePath}` : relativePath;

        const success = await this.uploadFile(filePath, s3Key);
        if (!success) allSuccessful = false;
      }

      return allSuccessful;
    } catch (error) {
      console.error(`❌ Error uploading directory ${dirPath}:`, error);
      return false;
    }
  }

  async uploadDashboard(): Promise<boolean> {
    console.info("🚀 Starting dashboard upload to S3...");

    if (!validateS3Config()) {
      console.error(
        "❌ S3 configuration is invalid. Please check your environment variables."
      );
      console.info(
        "Required: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET"
      );
      return false;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const s3Prefix = `dashboard-${timestamp}`;

    let allSuccessful = true;

    // Upload main dashboard files
    console.info("📁 Uploading dashboard files...");
    for (const file of uploadPaths.dashboard) {
      const localPath = join(process.cwd(), file);
      const s3Key = `${s3Prefix}/${basename(file)}`;
      const success = await this.uploadFile(localPath, s3Key);
      if (!success) allSuccessful = false;
    }

    // Upload documentation files
    console.info("📚 Uploading documentation...");
    for (const pattern of uploadPaths.docs) {
      const files = this.getFilesByPattern(pattern);
      for (const file of files) {
        const s3Key = `${s3Prefix}/docs/${basename(file)}`;
        const success = await this.uploadFile(file, s3Key);
        if (!success) allSuccessful = false;
      }
    }

    // Upload build files if they exist
    const distPath = join(process.cwd(), "dist");
    if (statSync(distPath).isDirectory()) {
      console.info("🏗️ Uploading build files...");
      const success = await this.uploadDirectory(distPath, `${s3Prefix}/dist`);
      if (!success) allSuccessful = false;
    }

    // Create a manifest file
    await this.createManifest(s3Prefix);

    if (allSuccessful) {
      console.info(`🎉 All files uploaded successfully to S3!`);
      console.info(`📂 S3 Location: ${this.baseUrl}/${s3Prefix}/`);
      console.info(
        `🔗 Access your dashboard at: https://${this.config.bucket}.s3.amazonaws.com/${s3Prefix}/index.html`
      );
    } else {
      console.info("⚠️ Some files failed to upload. Check the logs above.");
    }

    return allSuccessful;
  }

  private async createManifest(s3Prefix: string): Promise<void> {
    const manifest = {
      timestamp: new Date().toISOString(),
      version: s3Prefix,
      files: {
        dashboard: uploadPaths.dashboard,
        docs: uploadPaths.docs,
        build: uploadPaths.build,
      },
      config: {
        bucket: this.config.bucket,
        region: this.config.region,
      },
    };

    const manifestContent = JSON.stringify(manifest, null, 2);
    const response = await fetch(`${this.baseUrl}/${s3Prefix}/manifest.json`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: manifestContent,
      s3: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
        region: this.config.region,
      },
    });

    if (response.ok) {
      console.info("📋 Manifest created successfully");
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

    // This is a simplified implementation - in production, you'd use a proper glob library
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
      const uploader = new S3Uploader();
      await uploader.uploadDashboard();
      break;

    case "validate":
    case "check":
      if (validateS3Config()) {
        console.info("✅ S3 configuration is valid");
      } else {
        console.info("❌ S3 configuration is invalid");
        console.info(
          "Required: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET"
        );
      }
      break;

    default:
      console.info("📋 S3 Dashboard Uploader");
      console.info("");
      console.info("Commands:");
      console.info("  upload, up    - Upload dashboard to S3");
      console.info("  validate, check - Validate S3 configuration");
      console.info("");
      console.info("Environment Variables:");
      console.info("  AWS_ACCESS_KEY_ID  - AWS access key");
      console.info("  AWS_SECRET_ACCESS_KEY  - AWS secret key");
      console.info("  S3_BUCKET          - S3 bucket name");
      console.info("  AWS_REGION         - AWS region (default: us-east-1)");
      console.info("  S3_ENDPOINT        - Custom S3 endpoint (optional)");
      break;
  }
}

if (import.meta.main) {
  main().catch(console.error);
}

export default S3Uploader;
