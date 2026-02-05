import { feature } from "bun:bundle";
import { s3, S3Client } from "bun";
import { stringWidth } from "bun";

export interface UploadOptions {
  bucket: string;
  prefix: string;
  userId: string;
  forceDownload?: boolean;
  customFilename?: string;
}

export class UploadEngine {
  private client;

  constructor() {
    const s3Factory = (S3Client as any) || (s3 as any).S3Client || s3;
    if (feature("CLOUD_UPLOAD")) {
      this.client = new s3Factory({
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        region: "auto",
      });
    } else if (feature("LOCAL_DEV")) {
      this.client = new s3Factory({
        accessKeyId: "test",
        secretAccessKey: "test",
        endpoint: "http://localhost:9000",
      });
    }
  }

  async uploadFile(file: File, options: UploadOptions) {
    const start = performance.now();
    
    if (feature("DEBUG")) {
      console.log(this.formatLogEntry(`Uploading ${file.name}`, "info"));
    }

    const buffer = await file.arrayBuffer();
    const key = `${options.prefix}/${Date.now()}-${file.name}`;

    // Premium feature: Enhanced metadata
    const metadata = feature("PREMIUM") 
      ? this.generatePremiumMetadata(file)
      : {};

    await this.client!.write(key, buffer, {
      bucket: options.bucket,
      contentDisposition: this.getContentDisposition(file, options),
      contentType: file.type,
      metadata,
    });

    if (feature("AUDIT_LOG")) {
      await this.logAudit({
        file: file.name,
        size: buffer.byteLength,
        duration: performance.now() - start,
        user: options.userId,
      });
    }

    return { key, url: this.generateUrl(key) };
  }

  private formatLogEntry(message: string, level: "info" | "warn" | "error") {
    const colors = { info: "\x1b[36m", warn: "\x1b[33m", error: "\x1b[31m" };
    const icon = { info: "ℹ", warn: "⚠", error: "✗" };
    const prefix = `${colors[level]}${icon[level]} ${level.toUpperCase()}\x1b[0m`;
    
    // Use improved stringWidth for proper terminal alignment
    const padding = 15 - stringWidth(prefix);
    return `${prefix}${" ".repeat(padding > 0 ? padding : 0)}${message}`;
  }

  private generatePremiumMetadata(file: File) {
    // Only included in premium builds
    return {
      "x-amz-meta-uploaded-by": process.env.USER_ID,
      "x-amz-meta-original-filename": file.name,
      "x-amz-meta-checksum": this.calculateChecksum(file),
      "x-amz-meta-feature-flags": Array.from(this.getActiveFeatures()).join(","),
    };
  }

  private getActiveFeatures() {
    const active = new Set<string>();
    // This method would check which features are enabled
    return active;
  }

  private getContentDisposition(file: File, options: UploadOptions) {
    const type = options.forceDownload ? "attachment" : "inline";
    
    if (feature("PREMIUM") && options.customFilename) {
      // Premium: Support Unicode filenames with proper escaping
      return `${type}; filename*=UTF-8''${encodeURIComponent(options.customFilename)}`;
    }
    
    return `${type}; filename="${file.name}"`;
  }

  private calculateChecksum(file: File) {
    // Basic implementation for premium metadata
    return "sha256:mock-checksum";
  }

  private async logAudit(entry: any) {
    if (feature("DEBUG")) {
      console.log(this.formatLogEntry(`Audit log: ${entry.file} (${entry.size} bytes)`, "info"));
    }
  }

  private generateUrl(key: string) {
    return `https://cdn.example.com/${key}`;
  }
}
