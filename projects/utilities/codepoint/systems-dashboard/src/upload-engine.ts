#!/usr/bin/env bun
import { stringWidth } from "bun";
import { feature } from "bun:bundle";
import { readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";

// Feature flag utilities
function hasFeature(flag: string): boolean {
  if (globalThis.__FEATURES__) {
    return globalThis.__FEATURES__.has(flag);
  }
  return feature(flag as any);
}

// Upload options interface
interface UploadOptions {
  bucket: string;
  prefix: string;
  userId?: string;
  forceDownload?: boolean;
  customFilename?: string;
  provider: "s3" | "r2";
}

// Upload progress interface
interface UploadProgress {
  name: string;
  progress: number;
  status: "uploading" | "complete" | "error" | "queued";
  size: number;
  speed?: number;
  eta?: number;
}

// Audit log interface
interface AuditLog {
  file: string;
  size: number;
  duration: number;
  user?: string;
  provider: string;
  timestamp: string;
}

class UploadEngine {
  private config: any;
  private provider: "s3" | "r2";
  private auditLogs: AuditLog[] = [];

  constructor(provider: "s3" | "r2" = "s3") {
    this.provider = provider;
    this.initializeConfig();
  }

  private initializeConfig() {
    if (this.provider === "r2") {
      this.config = {
        accountId:
          process.env.CLOUDFLARE_ACCOUNT_ID || process.env.R2_ACCOUNT_ID || "",
        accessKeyId:
          process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ||
          process.env.R2_ACCESS_KEY_ID ||
          "",
        secretAccessKey:
          process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ||
          process.env.R2_SECRET_ACCESS_KEY ||
          "",
        bucket: process.env.R2_BUCKET || "bun-dashboard-enhancements",
        endpoint: process.env.R2_ENDPOINT || "",
      };

      // Construct R2 endpoint if not provided
      if (!this.config.endpoint && this.config.accountId) {
        this.config.endpoint = `https://${this.config.accountId}.r2.cloudflarestorage.com`;
      }
    } else {
      this.config = {
        accessKeyId:
          process.env.AWS_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY || "",
        secretAccessKey:
          process.env.AWS_SECRET_ACCESS_KEY || process.env.S3_SECRET_KEY || "",
        region: process.env.AWS_REGION || process.env.S3_REGION || "us-east-1",
        bucket: process.env.S3_BUCKET || "bun-dashboard-enhancements",
        endpoint: process.env.S3_ENDPOINT,
      };
    }
  }

  async uploadFile(
    filePath: string,
    options: UploadOptions
  ): Promise<{ key: string; url: string }> {
    const start = performance.now();

    if (hasFeature("DEBUG")) {
      console.log(
        this.formatLogEntry(
          `Uploading ${basename(filePath)} to ${this.provider.toUpperCase()}`,
          "info"
        )
      );
    }

    // Read file content
    const fileContent = readFileSync(filePath);
    const stats = statSync(filePath);
    const fileName = basename(filePath);

    const key = `${options.prefix}/${Date.now()}-${fileName}`;
    const baseUrl =
      this.provider === "r2"
        ? `${this.config.endpoint}/${this.config.bucket}`
        : `s3://${this.config.bucket}`;

    // Premium feature: Enhanced metadata
    const metadata = hasFeature("PREMIUM")
      ? this.generatePremiumMetadata(filePath, stats)
      : {};

    // Upload using Bun's S3-compatible fetch
    const response = await fetch(`${baseUrl}/${key}`, {
      method: "PUT",
      headers: {
        "Content-Type": this.getContentType(filePath),
        "Content-Length": stats.size.toString(),
        "Content-Disposition": this.getContentDisposition(fileName, options),
        ...metadata,
      },
      body: fileContent,
      s3: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
        region: this.provider === "r2" ? "auto" : this.config.region,
        endpoint: this.config.endpoint,
      },
    });

    const duration = performance.now() - start;

    if (response.ok) {
      if (hasFeature("DEBUG")) {
        console.log(
          this.formatLogEntry(
            `Successfully uploaded ${fileName} (${(stats.size / 1024).toFixed(1)}KB)`,
            "info"
          )
        );
      }

      if (hasFeature("AUDIT_LOG")) {
        await this.logAudit({
          file: fileName,
          size: stats.size,
          duration,
          user: options.userId,
          provider: this.provider.toUpperCase(),
          timestamp: new Date().toISOString(),
        });
      }

      const url = this.generateUrl(key);
      return { key, url };
    } else {
      console.error(
        `❌ Failed to upload ${fileName}: ${response.status} ${response.statusText}`
      );
      throw new Error(`Upload failed: ${response.statusText}`);
    }
  }

  async uploadDashboard(): Promise<boolean> {
    console.log(
      `🚀 Starting dashboard upload to ${this.provider.toUpperCase()}...`
    );

    if (!this.validateConfig()) {
      console.error(
        `❌ ${this.provider.toUpperCase()} configuration is invalid.`
      );
      this.printConfigurationHelp();
      return false;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const prefix = `dashboard-${timestamp}`;

    let allSuccessful = true;

    // Upload main dashboard files
    const dashboardFiles = [
      "SystemsDashboard.tsx",
      "vite.config.ts",
      "index.html",
      "src/main.tsx",
      "package.json",
    ];

    console.log("📁 Uploading dashboard files...");
    for (const file of dashboardFiles) {
      try {
        const localPath = join(process.cwd(), file);
        await this.uploadFile(localPath, {
          bucket: this.config.bucket,
          prefix,
          provider: this.provider,
        });
      } catch (error) {
        allSuccessful = false;
        console.error(`Failed to upload ${file}:`, error);
      }
    }

    // Upload documentation files
    console.log("📚 Uploading documentation...");
    const docFiles = [
      "../README.md",
      "../BUN_INSPECT_*.md",
      "../session-1/headers-api-matrix.ts",
      "../session-1/bun-apis-matrix.ts",
    ];

    for (const pattern of docFiles) {
      const files = this.getFilesByPattern(pattern);
      for (const file of files) {
        try {
          await this.uploadFile(file, {
            bucket: this.config.bucket,
            prefix: `${prefix}/docs`,
            provider: this.provider,
          });
        } catch (error) {
          allSuccessful = false;
          console.error(`Failed to upload documentation ${file}:`, error);
        }
      }
    }

    // Create manifest
    await this.createManifest(prefix, timestamp);

    if (allSuccessful) {
      console.log(
        `🎉 All files uploaded successfully to ${this.provider.toUpperCase()}!`
      );

      const baseUrl =
        this.provider === "r2"
          ? `${this.config.endpoint}/${this.config.bucket}`
          : `https://${this.config.bucket}.s3.amazonaws.com`;

      console.log(
        `📂 ${this.provider.toUpperCase()} Location: ${baseUrl}/${prefix}/`
      );

      if (this.provider === "r2") {
        console.log(
          `🔗 Public URL: https://pub-${this.config.accountId}.r2.dev/${prefix}/index.html`
        );
      } else {
        console.log(
          `🔗 S3 URL: https://${this.config.bucket}.s3.amazonaws.com/${prefix}/index.html`
        );
      }

      // Premium feature: Show upload metrics
      if (hasFeature("METRICS")) {
        this.showUploadMetrics();
      }
    } else {
      console.log("⚠️ Some files failed to upload. Check the logs above.");
    }

    return allSuccessful;
  }

  private formatLogEntry(message: string, level: "info" | "warn" | "error") {
    const colors = { info: "\x1b[36m", warn: "\x1b[33m", error: "\x1b[31m" };
    const icons = { info: "ℹ", warn: "⚠", error: "✗" };
    const prefix = `${colors[level]}${icons[level]} ${level.toUpperCase()}\x1b[0m`;

    // Use improved stringWidth for proper terminal alignment
    const padding = 15 - stringWidth(prefix);
    return `${prefix}${" ".repeat(padding > 0 ? padding : 0)}${message}`;
  }

  private generatePremiumMetadata(filePath: string, stats: any) {
    // Only included in premium builds
    const fileName = basename(filePath);
    return {
      "x-amz-meta-uploaded-by": process.env.USER_ID || "dashboard-system",
      "x-amz-meta-original-filename": fileName,
      "x-amz-meta-file-size": stats.size.toString(),
      "x-amz-meta-last-modified": stats.mtime.toISOString(),
      "x-amz-meta-feature-flags": this.getActiveFeatures().join(","),
      "x-amz-meta-upload-engine": "bun-dashboard-v2",
    };
  }

  private getActiveFeatures(): string[] {
    const features = [];
    if (hasFeature("PREMIUM")) features.push("premium");
    if (hasFeature("DEBUG")) features.push("debug");
    if (hasFeature("AUDIT_LOG")) features.push("audit");
    if (hasFeature("METRICS")) features.push("metrics");
    return features;
  }

  private getContentDisposition(fileName: string, options: UploadOptions) {
    const type = options.forceDownload ? "attachment" : "inline";

    if (hasFeature("PREMIUM") && options.customFilename) {
      // Premium: Support Unicode filenames with proper escaping
      return `${type}; filename*=UTF-8''${encodeURIComponent(options.customFilename)}`;
    }

    return `${type}; filename="${fileName}"`;
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

  private generateUrl(key: string): string {
    if (this.provider === "r2") {
      return `https://pub-${this.config.accountId}.r2.dev/${key}`;
    } else {
      return `https://${this.config.bucket}.s3.amazonaws.com/${key}`;
    }
  }

  private async logAudit(log: AuditLog) {
    this.auditLogs.push(log);

    if (hasFeature("DEBUG")) {
      console.log(
        this.formatLogEntry(
          `Audit: ${log.file} (${(log.size / 1024).toFixed(1)}KB) in ${log.duration.toFixed(0)}ms`,
          "info"
        )
      );
    }

    // In production, you'd send this to a logging service
    if (hasFeature("AUDIT_LOG") && process.env.AUDIT_WEBHOOK) {
      try {
        await fetch(process.env.AUDIT_WEBHOOK, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(log),
        });
      } catch (error) {
        console.warn("Failed to send audit log:", error);
      }
    }
  }

  private async createManifest(prefix: string, timestamp: string) {
    const manifest = {
      timestamp,
      version: prefix,
      provider: this.provider,
      features: this.getActiveFeatures(),
      files: {
        dashboard: [
          "SystemsDashboard.tsx",
          "vite.config.ts",
          "index.html",
          "src/main.tsx",
          "package.json",
        ],
        docs: [
          "README.md",
          "BUN_INSPECT_*.md",
          "headers-api-matrix.ts",
          "bun-apis-matrix.ts",
        ],
      },
      config: {
        bucket: this.config.bucket,
        region: this.provider === "r2" ? "auto" : this.config.region,
        endpoint: this.config.endpoint,
      },
      uploadEngine: "bun-dashboard-v2",
    };

    const manifestContent = JSON.stringify(manifest, null, 2);
    const baseUrl =
      this.provider === "r2"
        ? `${this.config.endpoint}/${this.config.bucket}`
        : `s3://${this.config.bucket}`;

    const response = await fetch(`${baseUrl}/${prefix}/manifest.json`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: manifestContent,
      s3: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
        region: this.provider === "r2" ? "auto" : this.config.region,
        endpoint: this.config.endpoint,
      },
    });

    if (response.ok) {
      console.log("📋 Manifest created successfully");
    }
  }

  private validateConfig(): boolean {
    if (this.provider === "r2") {
      return !!(
        this.config.accountId &&
        this.config.accessKeyId &&
        this.config.secretAccessKey &&
        this.config.bucket
      );
    } else {
      return !!(
        this.config.accessKeyId &&
        this.config.secretAccessKey &&
        this.config.bucket
      );
    }
  }

  private printConfigurationHelp() {
    if (this.provider === "r2") {
      console.log(
        "Required: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY, R2_BUCKET"
      );
    } else {
      console.log(
        "Required: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET"
      );
    }
  }

  private getFilesByPattern(pattern: string): string[] {
    // Simple glob pattern matching
    const glob = pattern.replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*");
    const regex = new RegExp(glob);

    const files: string[] = [];
    const baseDir = pattern.split("/")[0] || ".";

    try {
      const { readdirSync, existsSync } = require("node:fs");
      if (existsSync(baseDir)) {
        const entries = readdirSync(baseDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isFile() && regex.test(entry.name)) {
            files.push(require("node:path").join(baseDir, entry.name));
          }
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not read directory ${baseDir}:`, error);
    }

    return files;
  }

  private showUploadMetrics() {
    if (this.auditLogs.length === 0) return;

    const totalSize = this.auditLogs.reduce((sum, log) => sum + log.size, 0);
    const avgDuration =
      this.auditLogs.reduce((sum, log) => sum + log.duration, 0) /
      this.auditLogs.length;
    const totalDuration = this.auditLogs.reduce(
      (sum, log) => sum + log.duration,
      0
    );

    console.log("\n📊 Upload Metrics:");
    console.log(`  Files uploaded: ${this.auditLogs.length}`);
    console.log(`  Total size: ${(totalSize / 1024).toFixed(1)}KB`);
    console.log(`  Average upload time: ${avgDuration.toFixed(0)}ms`);
    console.log(`  Total upload time: ${totalDuration.toFixed(0)}ms`);
    console.log(
      `  Average speed: ${(totalSize / (totalDuration / 1000) / 1024).toFixed(1)}KB/s`
    );
  }
}

export { UploadEngine, type AuditLog, type UploadOptions, type UploadProgress };
