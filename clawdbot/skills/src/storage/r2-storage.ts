/**
 * src/storage/r2-storage.ts
 * Cloudflare R2 Storage Integration
 * - S3-compatible API
 * - Zero egress costs
 * - Built-in CDN distribution
 * - Integrity verification
 *
 * @deprecated Use `bun-r2-storage.ts` instead. This module uses the AWS SDK
 * while the new module uses Bun's native S3 client for better performance.
 * Migration: Replace `R2Storage` with `BunR2Storage` from `./bun-r2-storage`.
 */

import { SkillIntegrity, type FileManifest } from "../lib/hash-utils";

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl?: string;
  region?: string;
}

export interface UploadResult {
  success: boolean;
  url: string;
  key: string;
  size: number;
  checksum: string;
  duration: number;
  metadata: Record<string, any>;
  error?: string;
}

export interface DownloadResult {
  success: boolean;
  path?: string;
  size?: number;
  metadata: any;
  verified?: boolean;
  error?: string;
}

export interface SkillVersion {
  version: string;
  uploaded: Date;
  size: number;
  checksum: string;
  downloadUrl: string;
}

export interface CDNConfig {
  skillId: string;
  domain: string;
  endpoints: Array<{
    version: string;
    url: string;
    size: number;
  }>;
  cacheTtl: number;
  createdAt: string;
}

export interface R2Object {
  key: string;
  size: number;
  lastModified: Date;
  etag: string;
  metadata: Record<string, any>;
  publicUrl?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// R2Storage Class
// ═══════════════════════════════════════════════════════════════════════════

export class R2Storage {
  private config: R2Config;
  private endpoint: string;

  constructor(config: R2Config) {
    this.config = {
      region: "auto",
      ...config,
    };

    this.endpoint = `https://${this.config.accountId}.r2.cloudflarestorage.com`;
  }

  /**
   * Upload a skill bundle to R2
   */
  async uploadSkillBundle(
    skillId: string,
    bundlePath: string,
    options: {
      compress?: boolean;
      version?: string;
      metadata?: Record<string, any>;
      public?: boolean;
    } = {}
  ): Promise<UploadResult> {
    const startTime = performance.now();

    try {
      // Read and optionally compress bundle
      let bundleData: Uint8Array;
      let contentType = "application/octet-stream";

      const originalData = await Bun.file(bundlePath).bytes();

      if (options.compress) {
        bundleData = Bun.gzipSync(originalData);
        contentType = "application/gzip";
      } else {
        bundleData = originalData;
      }

      // Calculate checksum using Bun.hash
      const checksum = Bun.hash.crc32(bundleData).toString(16).padStart(8, "0");

      // Create metadata
      const metadata = {
        skillId,
        version: options.version || "1.0.0",
        uploaded: new Date().toISOString(),
        size: bundleData.length,
        originalSize: originalData.length,
        compressed: options.compress || false,
        checksum,
        ...options.metadata,
      };

      // Generate object key
      const timestamp = Date.now();
      const ext = options.compress ? ".tar.gz" : ".tar";
      const key = `skills/${skillId}/v${metadata.version}/${timestamp}${ext}`;

      // Upload to R2
      const uploadResult = await this.putObject(key, bundleData, {
        contentType,
        metadata,
        public: options.public || false,
      });

      const duration = performance.now() - startTime;

      // Also update the "latest" pointer
      await this.putObject(
        `skills/${skillId}/v${metadata.version}/latest`,
        bundleData,
        { contentType, metadata, public: options.public || false }
      );

      return {
        success: true,
        url: uploadResult.url,
        key,
        size: bundleData.length,
        checksum,
        duration,
        metadata,
      };
    } catch (error: any) {
      return {
        success: false,
        url: "",
        key: "",
        size: 0,
        checksum: "",
        duration: performance.now() - startTime,
        metadata: {},
        error: error.message,
      };
    }
  }

  /**
   * Download a skill bundle from R2
   */
  async downloadSkillBundle(
    skillId: string,
    version: string,
    targetPath: string
  ): Promise<DownloadResult> {
    const key = `skills/${skillId}/v${version}/latest`;

    try {
      const { data, metadata } = await this.getObject(key);

      // Verify checksum
      const calculatedChecksum = Bun.hash.crc32(data)
        .toString(16)
        .padStart(8, "0");

      if (metadata.checksum && calculatedChecksum !== metadata.checksum) {
        return {
          success: false,
          error: `Checksum verification failed: expected ${metadata.checksum}, got ${calculatedChecksum}`,
          metadata,
        };
      }

      // Decompress if needed
      let finalData = data;
      if (metadata.compressed) {
        finalData = Bun.gunzipSync(data);
      }

      // Write to file
      await Bun.write(targetPath, finalData);

      return {
        success: true,
        path: targetPath,
        size: finalData.length,
        metadata,
        verified: true,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: null,
      };
    }
  }

  /**
   * List all versions of a skill
   */
  async listSkillVersions(skillId: string): Promise<SkillVersion[]> {
    const prefix = `skills/${skillId}/`;
    const objects = await this.listObjects(prefix);

    const versions: SkillVersion[] = [];
    const versionMap = new Map<string, R2Object>();

    // Group by version, keep latest for each
    for (const obj of objects) {
      if (obj.key.includes("/latest")) {
        const version = obj.key.split("/")[2]?.replace("v", "") || "1.0.0";
        const existing = versionMap.get(version);
        if (!existing || obj.lastModified > existing.lastModified) {
          versionMap.set(version, obj);
        }
      }
    }

    for (const [version, obj] of versionMap) {
      versions.push({
        version,
        uploaded: obj.lastModified,
        size: obj.size,
        checksum: obj.metadata?.checksum || "",
        downloadUrl: obj.publicUrl || this.getObjectUrl(obj.key),
      });
    }

    return versions.sort(
      (a, b) => b.uploaded.getTime() - a.uploaded.getTime()
    );
  }

  /**
   * Create CDN configuration for a skill
   */
  async createSkillCDN(
    skillId: string,
    options: {
      domain?: string;
      cacheTtl?: number;
      enableCompression?: boolean;
    } = {}
  ): Promise<CDNConfig> {
    // Get all versions
    const versions = await this.listSkillVersions(skillId);

    // Generate CDN configuration
    const cdnConfig: CDNConfig = {
      skillId,
      domain: options.domain || `${skillId}.skills.cdn.example.com`,
      endpoints: versions.map((v) => ({
        version: v.version,
        url: v.downloadUrl,
        size: v.size,
      })),
      cacheTtl: options.cacheTtl || 3600,
      createdAt: new Date().toISOString(),
    };

    // Store CDN config in R2
    await this.putObject(
      `cdn/${skillId}/config.json`,
      JSON.stringify(cdnConfig, null, 2),
      { contentType: "application/json", public: true }
    );

    return cdnConfig;
  }

  /**
   * Delete a specific version
   */
  async deleteVersion(skillId: string, version: string): Promise<boolean> {
    const prefix = `skills/${skillId}/v${version}/`;
    const objects = await this.listObjects(prefix);

    for (const obj of objects) {
      await this.deleteObject(obj.key);
    }

    return true;
  }

  /**
   * Get storage stats for a skill
   */
  async getSkillStats(skillId: string): Promise<{
    totalSize: number;
    versionCount: number;
    oldestVersion: Date | null;
    newestVersion: Date | null;
  }> {
    const versions = await this.listSkillVersions(skillId);

    return {
      totalSize: versions.reduce((sum, v) => sum + v.size, 0),
      versionCount: versions.length,
      oldestVersion: versions.length > 0 ? versions[versions.length - 1].uploaded : null,
      newestVersion: versions.length > 0 ? versions[0].uploaded : null,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Private Methods - R2 Operations
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Put an object to R2
   */
  private async putObject(
    key: string,
    data: Uint8Array | string,
    options: {
      contentType?: string;
      metadata?: Record<string, any>;
      public?: boolean;
    } = {}
  ): Promise<{ url: string; etag: string }> {
    const url = `${this.endpoint}/${this.config.bucket}/${key}`;
    const body = typeof data === "string" ? new TextEncoder().encode(data) : data;

    const headers: Record<string, string> = {
      "Content-Type": options.contentType || "application/octet-stream",
      "Content-Length": body.length.toString(),
      ...this.getAuthHeaders("PUT", key),
    };

    // Add custom metadata headers
    if (options.metadata) {
      headers["x-amz-meta-json"] = JSON.stringify(options.metadata);
    }

    if (options.public) {
      headers["x-amz-acl"] = "public-read";
    }

    const response = await fetch(url, {
      method: "PUT",
      headers,
      body,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`R2 upload failed: ${response.status} - ${error}`);
    }

    const publicUrl = options.public
      ? this.config.publicUrl
        ? `${this.config.publicUrl}/${key}`
        : `${this.endpoint}/${this.config.bucket}/${key}`
      : url;

    return {
      url: publicUrl,
      etag: response.headers.get("etag") || "",
    };
  }

  /**
   * Get an object from R2
   */
  private async getObject(key: string): Promise<{
    data: Uint8Array;
    metadata: Record<string, any>;
  }> {
    const url = `${this.endpoint}/${this.config.bucket}/${key}`;

    const response = await fetch(url, {
      headers: this.getAuthHeaders("GET", key),
    });

    if (!response.ok) {
      throw new Error(`R2 download failed: ${response.status}`);
    }

    const data = new Uint8Array(await response.arrayBuffer());

    // Parse metadata from header
    let metadata = {};
    const metaHeader = response.headers.get("x-amz-meta-json");
    if (metaHeader) {
      try {
        metadata = JSON.parse(metaHeader);
      } catch {
        // Ignore parse errors
      }
    }

    return { data, metadata };
  }

  /**
   * List objects with prefix
   */
  private async listObjects(prefix: string): Promise<R2Object[]> {
    const url = new URL(`${this.endpoint}/${this.config.bucket}`);
    url.searchParams.set("prefix", prefix);
    url.searchParams.set("list-type", "2");

    const response = await fetch(url.toString(), {
      headers: this.getAuthHeaders("GET", ""),
    });

    if (!response.ok) {
      throw new Error(`R2 list failed: ${response.status}`);
    }

    const xml = await response.text();
    return this.parseListResponse(xml);
  }

  /**
   * Delete an object
   */
  private async deleteObject(key: string): Promise<void> {
    const url = `${this.endpoint}/${this.config.bucket}/${key}`;

    const response = await fetch(url, {
      method: "DELETE",
      headers: this.getAuthHeaders("DELETE", key),
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`R2 delete failed: ${response.status}`);
    }
  }

  /**
   * Get object URL
   */
  private getObjectUrl(key: string): string {
    if (this.config.publicUrl) {
      return `${this.config.publicUrl}/${key}`;
    }
    return `${this.endpoint}/${this.config.bucket}/${key}`;
  }

  /**
   * Generate AWS Signature V4 auth headers
   * Simplified implementation - in production use aws4 or similar
   */
  private getAuthHeaders(
    method: string,
    key: string
  ): Record<string, string> {
    const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
    const date = timestamp.slice(0, 8);
    const region = this.config.region || "auto";

    // Simplified auth - in production, use proper AWS Sig V4
    const credential = `${this.config.accessKeyId}/${date}/${region}/s3/aws4_request`;

    return {
      "x-amz-date": timestamp,
      "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
      Authorization: `AWS4-HMAC-SHA256 Credential=${credential}, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=${this.generateSignature(method, key, timestamp)}`,
    };
  }

  /**
   * Generate signature (simplified)
   * In production, implement proper AWS Signature Version 4
   */
  private generateSignature(
    method: string,
    key: string,
    timestamp: string
  ): string {
    const stringToSign = `${method}\n/${this.config.bucket}/${key}\n${timestamp}`;
    // Use Bun.hash for signature (simplified - use HMAC-SHA256 in production)
    return Bun.hash.crc32(stringToSign + this.config.secretAccessKey)
      .toString(16)
      .padStart(64, "0");
  }

  /**
   * Parse XML list response
   */
  private parseListResponse(xml: string): R2Object[] {
    const objects: R2Object[] = [];

    // Simple XML parsing for Contents elements
    const contentMatches = xml.matchAll(
      /<Contents>([\s\S]*?)<\/Contents>/g
    );

    for (const match of contentMatches) {
      const content = match[1];
      const key = content.match(/<Key>(.*?)<\/Key>/)?.[1] || "";
      const size = parseInt(content.match(/<Size>(.*?)<\/Size>/)?.[1] || "0");
      const lastModified = new Date(
        content.match(/<LastModified>(.*?)<\/LastModified>/)?.[1] || ""
      );
      const etag = content.match(/<ETag>(.*?)<\/ETag>/)?.[1] || "";

      objects.push({
        key,
        size,
        lastModified,
        etag: etag.replace(/"/g, ""),
        metadata: {},
        publicUrl: this.config.publicUrl
          ? `${this.config.publicUrl}/${key}`
          : undefined,
      });
    }

    return objects;
  }
}

/**
 * Create R2Storage from environment variables
 */
export function createR2StorageFromEnv(): R2Storage | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    return null;
  }

  return new R2Storage({
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    publicUrl: process.env.R2_PUBLIC_URL,
    region: process.env.R2_REGION,
  });
}

export default R2Storage;
