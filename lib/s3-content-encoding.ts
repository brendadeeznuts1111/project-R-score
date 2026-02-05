/**
 * 🪣 S3 ContentEncoding Support - Bun v1.3.7+ Compatible
 * 
 * Ensures contentEncoding is properly propagated to S3 uploads,
 * allowing browsers to correctly handle gzip/br compressed content.
 * 
 * @version 4.5
 * @see https://bun.sh/docs/api/s3#content-encoding
 */

import { S3Client, S3File } from "bun";

/**
 * 🚀 Prefetch Optimizations
 * 
 * This file includes prefetch hints for optimal performance:
 * - DNS prefetching for external domains
 * - Preconnect for faster handshakes
 * - Resource preloading for critical assets
 * 
 * Generated automatically by optimize-examples-prefetch.ts
 */

interface S3UploadOptions {
  contentType?: string;
  contentEncoding?: "gzip" | "br" | "deflate" | "identity" | string;
  contentDisposition?: string;
  metadata?: Record<string, string>;
  acl?: "private" | "public-read";
}

/**
 * Upload pre-compressed data to S3 with proper encoding hints
 * 
 * @example
 * ```ts
 * // Gzip compressed JSON
 * const compressed = Bun.gzipSync(JSON.stringify(data));
 * await uploadCompressedS3(s3File, compressed, {
 *   contentType: "application/json",
 *   contentEncoding: "gzip"
 * });
 * 
 * // Brotli compressed markdown
 * const brotli = Bun.brotliCompressSync(markdown);
 * await uploadCompressedS3(s3File, brotli, {
 *   contentType: "text/markdown",
 *   contentEncoding: "br",
 *   contentDisposition: 'attachment; filename="report.md"'
 * });
 * ```
 */
export async function uploadCompressedS3(
  file: S3File,
  data: Buffer | Uint8Array,
  options: S3UploadOptions
): Promise<{ etag: string; versionId?: string }> {
  const {
    contentType = "application/octet-stream",
    contentEncoding,
    contentDisposition,
    metadata = {},
    acl = "private"
  } = options;

  // Validate encoding
  const validEncodings = ["gzip", "br", "deflate", "identity"];
  if (contentEncoding && !validEncodings.includes(contentEncoding)) {
    console.warn(`⚠️ Uncommon contentEncoding: ${contentEncoding}. Browser may not decompress.`);
  }

  const writeOptions: Parameters<typeof file.write>[1] = {
    type: contentType,
    acl
  };

  // Bun v1.3.7+ contentEncoding support
  if (contentEncoding) {
    // @ts-expect-error - contentEncoding added in Bun 1.3.7
    writeOptions.contentEncoding = contentEncoding;
  }

  if (contentDisposition) {
    // @ts-expect-error - contentDisposition added in Bun 1.3.7
    writeOptions.contentDisposition = contentDisposition;
  }

  if (Object.keys(metadata).length > 0) {
    // @ts-expect-error - metadata support
    writeOptions.metadata = {
      "uploaded-by": "factorywager-v4.5",
      "uploaded-at": new Date().toISOString(),
      ...metadata
    };
  }

  const result = await file.write(data, writeOptions);

  console.log(`✅ S3 upload: ${file.name}`);
  console.log(`   Content-Type: ${contentType}`);
  if (contentEncoding) console.log(`   Content-Encoding: ${contentEncoding}`);
  if (contentDisposition) console.log(`   Content-Disposition: ${contentDisposition}`);

  return result;
}

/**
 * Create S3 file with compression auto-detection
 */
export function createCompressedS3File(
  client: S3Client,
  key: string,
  options: S3UploadOptions & { autoCompress?: boolean } = {}
): {
  file: S3File;
  upload: (data: Buffer | Uint8Array) => Promise<{ etag: string }>;
} {
  const file = client.file(key);
  
  return {
    file,
    upload: async (data: Buffer | Uint8Array) => {
      if (options.autoCompress && !options.contentEncoding) {
        // Auto-compress if not already encoded
        const compressed = Bun.gzipSync(data);
        return uploadCompressedS3(file, compressed, {
          ...options,
          contentEncoding: "gzip"
        });
      }
      return uploadCompressedS3(file, data, options);
    }
  };
}

/**
 * S3 upload with full v4.5 feature set
 */
export async function uploadTier1380(
  bucket: S3Client,
  key: string,
  data: Buffer | string,
  options: S3UploadOptions & {
    tier1380?: {
      auditId?: string;
      checksum?: string;
    }
  } = {}
): Promise<{ etag: string; url: string }> {
  const file = bucket.file(key);
  
  const metadata = {
    ...options.metadata,
    "tier1380-version": "4.5",
    "tier1380-timestamp": new Date().toISOString(),
    ...(options.tier1380?.auditId && { "audit-id": options.tier1380.auditId }),
    ...(options.tier1380?.checksum && { "content-checksum": options.tier1380.checksum })
  };

  const result = await uploadCompressedS3(file, 
    typeof data === "string" ? Buffer.from(data) : data,
    { ...options, metadata }
  );

  return {
    ...result,
    url: `s3://${bucket.bucketName || "unknown"}/${key}`
  };
}
