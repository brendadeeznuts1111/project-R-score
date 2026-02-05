// Enhanced S3 storage with proper content disposition support
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command
} from "@aws-sdk/client-s3";
import { feature } from "bun:bundle";

export interface StorageMetadata {
  algorithm: string;
  accountId: string;
  timestamp: string;
  contentType: string;
  size: number;
  checksum?: string;
}

export interface UploadOptions {
  contentDisposition?: "attachment" | "inline" | "custom";
  customFilename?: string;
  metadata?: Record<string, string>;
  contentType?: string;
}

/**
 * Enhanced S3 storage client with proper content disposition support
 */
export class EnhancedS3Storage {
  private client: S3Client;
  private bucket: string;

  constructor(bucket: string, region: string = "us-east-1") {
    this.client = new S3Client({ region });
    this.bucket = bucket;
  }

  /**
   * Store weave data with enhanced content disposition
   */
  async storeWeave(
    filename: string,
    stream: ReadableStream,
    metadata: StorageMetadata,
    options: UploadOptions = {}
  ): Promise<{ key: string; etag: string; url: string }> {
    const contentDisposition = this.buildContentDisposition(filename, metadata, options);
    const contentType = options.contentType || "application/octet-stream";

    const uploadParams = {
      Bucket: this.bucket,
      Key: filename,
      Body: stream,
      ContentType: contentType,
      ContentDisposition: contentDisposition,
      Metadata: {
        ...metadata,
        algorithm: metadata.algorithm,
        accountId: metadata.accountId,
        timestamp: metadata.timestamp,
        size: metadata.size.toString(),
        ...(feature("DEBUG") && { debugMode: "true" })
      }
    };

    try {
      const result = await this.client.send(new PutObjectCommand(uploadParams));

      const url = `https://${this.bucket}.s3.amazonaws.com/${filename}`;

      if (feature("DEBUG")) {
        console.log(`Stored weave: ${filename}`, {
          disposition: contentDisposition,
          metadata: uploadParams.Metadata,
          url
        });
      }

      return {
        key: filename,
        etag: result.ETag || "",
        url
      };
    } catch (error) {
      console.error("Failed to store weave:", error);
      throw error;
    }
  }

  /**
   * Store screenshot with inline disposition for preview
   */
  async storeScreenshot(
    accountId: string,
    imageBuffer: ArrayBuffer,
    options: UploadOptions = {}
  ): Promise<{ key: string; url: string }> {
    const screenshotFilename = `screenshots/${accountId}-${Date.now()}.png`;
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(imageBuffer));
        controller.close();
      }
    });

    const disposition =
      options.contentDisposition === "inline"
        ? 'inline; filename="screenshot.png"'
        : `attachment; filename="${options.customFilename || `screenshot-${accountId}.png`}"`;

    return this.storeWeave(
      screenshotFilename,
      stream,
      {
        algorithm: "screenshot",
        accountId,
        timestamp: new Date().toISOString(),
        contentType: "image/png",
        size: imageBuffer.byteLength
      },
      {
        ...options,
        contentDisposition: disposition as "attachment" | "inline",
        contentType: "image/png"
      }
    );
  }

  /**
   * Store configuration file with custom disposition
   */
  async storeConfiguration(
    configName: string,
    configData: string,
    accountId: string,
    options: UploadOptions = {}
  ): Promise<{ key: string; url: string }> {
    const configFilename = `configs/${accountId}/${configName}.json`;
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(configData));
        controller.close();
      }
    });

    const customFilename = options.customFilename || `${configName}-config.json`;
    const disposition =
      options.contentDisposition === "custom"
        ? `attachment; filename="${customFilename}"`
        : `attachment; filename="${customFilename}"`;

    return this.storeWeave(
      configFilename,
      stream,
      {
        algorithm: "json-config",
        accountId,
        timestamp: new Date().toISOString(),
        contentType: "application/json",
        size: configData.length
      },
      {
        ...options,
        contentDisposition: disposition as "attachment" | "custom",
        contentType: "application/json"
      }
    );
  }

  /**
   * Build content disposition string based on options
   */
  private buildContentDisposition(
    _filename: string,
    metadata: StorageMetadata,
    options: UploadOptions
  ): string {
    const baseFilename =
      options.customFilename || `${metadata.algorithm}-${metadata.accountId}.bin`;

    switch (options.contentDisposition) {
      case "inline":
        return `inline; filename="${baseFilename}"`;

      case "attachment":
        return `attachment; filename="${baseFilename}"`;

      case "custom": {
        const customName = options.customFilename || baseFilename;
        return `attachment; filename="${customName}"`;
      }

      default:
        // Default to attachment with generated filename
        return `attachment; filename="${baseFilename}"`;
    }
  }

  /**
   * Retrieve weave with metadata and enhanced header processing
   */
  async retrieveWeave(
    filename: string
  ): Promise<{ stream: ReadableStream; metadata: StorageMetadata; headers?: Headers }> {
    try {
      const result = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: filename
        })
      );

      const metadata = this.parseMetadata(result.Metadata || {});

      // Create Headers object from S3 response if available
      let headers: Headers | undefined;
      if (result.Metadata) {
        headers = new Headers();

        // Add standard headers from S3 response
        if (result.ContentType) {
          headers.set("content-type", result.ContentType);
        }
        if (result.ContentLength) {
          headers.set("content-length", result.ContentLength.toString());
        }
        if (result.ETag) {
          headers.set("etag", result.ETag);
        }
        if (result.LastModified) {
          headers.set("last-modified", result.LastModified.toISOString());
        }

        // Add custom metadata headers using Headers.entries() pattern
        const metadata = result.Metadata || {};
        for (const [key, value] of Object.entries(metadata)) {
          headers.set(`x-amz-meta-${key.toLowerCase()}`, value);
        }

        // Debug headers using our utility
        S3HeaderUtils.debugHeaders(headers, `retrieveWeave(${filename})`);
      }

      return {
        stream: result.Body as ReadableStream,
        metadata,
        headers
      };
    } catch (error) {
      console.error("Failed to retrieve weave:", error);
      throw error;
    }
  }

  /**
   * Enhanced retrieval with full header analysis using Headers.entries()
   */
  async retrieveWeaveWithHeaders(filename: string): Promise<{
    stream: ReadableStream;
    metadata: StorageMetadata;
    headers: Headers;
    s3Metadata: Record<string, string>;
    debugInfo: Record<string, string>;
  }> {
    const result = await this.retrieveWeave(filename);

    if (!result.headers) {
      throw new Error("No headers available in S3 response");
    }

    // Extract different types of headers using Headers.entries()
    const s3Metadata = S3HeaderUtils.getS3Headers(result.headers);
    const debugInfo = {
      totalHeaders: [...result.headers.entries()].length.toString(),
      contentLength: result.headers.get("content-length") || "unknown",
      contentType: result.headers.get("content-type") || "unknown",
      lastModified: result.headers.get("last-modified") || "unknown",
      etag: result.headers.get("etag") || "unknown"
    };

    return {
      stream: result.stream,
      metadata: result.metadata,
      headers: result.headers,
      s3Metadata,
      debugInfo
    };
  }

  /**
   * Parse S3 metadata to StorageMetadata format
   */
  private parseMetadata(metadata: Record<string, string>): StorageMetadata {
    return {
      algorithm: metadata.algorithm || "unknown",
      accountId: metadata.accountId || "unknown",
      timestamp: metadata.timestamp || new Date().toISOString(),
      contentType: metadata.contentType || "application/octet-stream",
      size: parseInt(metadata.size || "0"),
      checksum: metadata.checksum
    };
  }

  /**
   * Delete weave from storage
   */
  async deleteWeave(filename: string): Promise<boolean> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: filename
        })
      );

      if (feature("DEBUG")) {
        console.log(`Deleted weave: ${filename}`);
      }

      return true;
    } catch (error) {
      console.error("Failed to delete weave:", error);
      return false;
    }
  }

  /**
   * List weaves for account
   */
  async listWeaves(accountId: string): Promise<Array<{ key: string; metadata: StorageMetadata }>> {
    try {
      const result = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: `${accountId}/`
        })
      );

      return (result.Contents || []).map((obj) => ({
        key: obj.Key || "",
        metadata: {
          algorithm: "unknown",
          accountId,
          timestamp: obj.LastModified?.toISOString() || new Date().toISOString(),
          contentType: "application/octet-stream",
          size: obj.Size || 0
        }
      }));
    } catch (error) {
      console.error("Failed to list weaves:", error);
      return [];
    }
  }
}

/**
 * Bun-optimized header utilities for S3 operations
 * Leverages Headers.entries() for efficient header processing
 */
export class S3HeaderUtils {
  /**
   * Convert S3 response headers to a plain object using Bun's optimized approach
   * ~10× faster than Object.fromEntries(headers.entries())
   */
  static convertHeadersToObject(headers: Headers): Record<string, string> {
    // Bun optimization: direct Object.fromEntries(headers) is faster
    return Object.fromEntries(headers);
  }

  /**
   * Extract S3-specific metadata from response headers
   */
  static extractS3Metadata(headers: Headers): StorageMetadata {
    const headerObj = this.convertHeadersToObject(headers);

    return {
      algorithm: headerObj["x-amz-meta-algorithm"] || "unknown",
      accountId: headerObj["x-amz-meta-accountid"] || "unknown",
      timestamp: headerObj["x-amz-meta-timestamp"] || new Date().toISOString(),
      contentType: headerObj["content-type"] || "application/octet-stream",
      size: parseInt(headerObj["content-length"] || "0"),
      checksum: headerObj["x-amz-checksum-crc32"]
    };
  }

  /**
   * Log all headers for debugging using Headers.entries()
   */
  static debugHeaders(headers: Headers, context: string): void {
    if (feature("DEBUG")) {
      console.log(`🔍 Headers for ${context}:`);

      // Using Headers.entries() for iteration
      for (const [key, value] of headers.entries()) {
        console.log(`  ${key}: ${value}`);
      }
    }
  }

  /**
   * Create Headers object from S3 metadata
   */
  static createHeadersFromMetadata(metadata: StorageMetadata): Headers {
    const headers = new Headers();

    // Set standard headers
    headers.set("content-type", metadata.contentType);
    headers.set("content-length", metadata.size.toString());

    // Set S3 custom metadata headers
    headers.set("x-amz-meta-algorithm", metadata.algorithm);
    headers.set("x-amz-meta-accountid", metadata.accountId);
    headers.set("x-amz-meta-timestamp", metadata.timestamp);

    if (metadata.checksum) {
      headers.set("x-amz-checksum-crc32", metadata.checksum);
    }

    return headers;
  }

  /**
   * Filter headers by prefix using Headers.entries()
   */
  static filterHeadersByPrefix(headers: Headers, prefix: string): Record<string, string> {
    const filtered: Record<string, string> = {};

    // Iterate using Headers.entries() for efficient filtering
    for (const [key, value] of headers.entries()) {
      if (key.toLowerCase().startsWith(prefix.toLowerCase())) {
        filtered[key] = value;
      }
    }

    return filtered;
  }

  /**
   * Get S3-specific headers only
   */
  static getS3Headers(headers: Headers): Record<string, string> {
    return this.filterHeadersByPrefix(headers, "x-amz-");
  }
}

/**
 * Factory function for creating enhanced S3 storage
 */
export function createEnhancedS3Storage(bucket: string, region?: string): EnhancedS3Storage {
  return new EnhancedS3Storage(bucket, region);
}

/**
 * Example usage functions for different use cases
 */
export async function storePhoneScreenshot(
  storage: EnhancedS3Storage,
  accountId: string,
  screenshot: ArrayBuffer
) {
  return storage.storeScreenshot(accountId, screenshot, {
    contentDisposition: "inline", // Browser displays instead of downloading
    customFilename: `phone-screenshot-${accountId}.png`
  });
}

export async function storeProxyConfiguration(
  storage: EnhancedS3Storage,
  proxyId: string,
  config: Record<string, unknown>
) {
  const configJson = JSON.stringify(config, null, 2);
  return storage.storeConfiguration(`proxy-${proxyId}`, configJson, proxyId, {
    contentDisposition: "attachment",
    customFilename: `proxy-config-${proxyId}.json`
  });
}

/**
 * Example demonstrating Headers.entries() usage with S3 operations
 */
export async function demonstrateHeadersEntries(storage: EnhancedS3Storage, filename: string) {
  try {
    // Retrieve file with enhanced header processing
    const result = await storage.retrieveWeaveWithHeaders(filename);

    console.log("🔍 Headers.entries() Demonstration:");
    console.log("=====================================");

    // 1. Basic iteration using Headers.entries()
    console.log("\n1. All Headers (using Headers.entries()):");
    for (const [key, value] of result.headers.entries()) {
      console.log(`   ${key}: ${value}`);
    }

    // 2. Convert to array using Headers.entries()
    console.log("\n2. Headers as Array (using [...headers.entries()]):");
    const headersArray = [...result.headers.entries()];
    console.log(`   Total headers: ${headersArray.length}`);
    headersArray.slice(0, 3).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });

    // 3. Convert to object using Bun's optimized approach
    console.log("\n3. Headers as Object (Bun optimization):");
    const headersObject = S3HeaderUtils.convertHeadersToObject(result.headers);
    console.log("   Content-Type:", headersObject["content-type"]);
    console.log("   Content-Length:", headersObject["content-length"]);

    // 4. Filter headers using Headers.entries()
    console.log("\n4. S3-Specific Headers (filtered using Headers.entries()):");
    const s3Headers = S3HeaderUtils.getS3Headers(result.headers);
    Object.entries(s3Headers).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });

    // 5. Debug information
    console.log("\n5. Debug Information:");
    Object.entries(result.debugInfo).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });

    return {
      headersArray,
      headersObject,
      s3Headers,
      debugInfo: result.debugInfo
    };
  } catch (error) {
    console.error("❌ Demonstration failed:", error);
    throw error;
  }
}

/**
 * Performance comparison: Headers.entries() vs Bun optimization
 */
export function compareHeaderPerformance(headers: Headers) {
  const iterations = 10000;

  // Method 1: Traditional Headers.entries() approach
  const start1 = performance.now();
  for (let i = 0; i < iterations; i++) {
    Object.fromEntries(headers.entries());
  }
  const time1 = performance.now() - start1;

  // Method 2: Bun's optimized direct approach
  const start2 = performance.now();
  for (let i = 0; i < iterations; i++) {
    Object.fromEntries(headers);
  }
  const time2 = performance.now() - start2;

  console.log("🚀 Performance Comparison:");
  console.log(`   Headers.entries(): ${time1.toFixed(2)}ms`);
  console.log(`   Bun optimization: ${time2.toFixed(2)}ms`);
  console.log(`   Speed improvement: ${(time1 / time2).toFixed(1)}x faster`);

  return { traditionalTime: time1, optimizedTime: time2, speedup: time1 / time2 };
}
