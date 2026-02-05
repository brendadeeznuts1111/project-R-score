// packages/core/src/utils/s3-client.ts
/**
 * Enterprise S3/R2 Client Wrapper - Bun v1.3
 * Full support for s3:// protocol, virtual hosted-style URLs, and advanced S3 features
 */

import { s3, S3Client } from "bun";

/**
 * S3 Client Configuration
 */
export interface S3Config {
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
  readonly region: string;
  readonly endpoint?: string;
  readonly bucket?: string;
  readonly virtualHostedStyle?: boolean;
  readonly acl?: ACL;
  readonly sessionToken?: string;
}

/**
 * Storage Class Options for S3
 */
export type StorageClass =
  | 'STANDARD'
  | 'REDUCED_REDUNDANCY'
  | 'STANDARD_IA'
  | 'ONEZONE_IA'
  | 'INTELLIGENT_TIERING'
  | 'GLACIER'
  | 'DEEP_ARCHIVE'
  | 'OUTPOSTS'
  | 'GLACIER_IR';

/**
 * ACL Options for S3
 */
export type ACL =
  | 'public-read'
  | 'private'
  | 'public-read-write'
  | 'authenticated-read'
  | 'aws-exec-read'
  | 'bucket-owner-read'
  | 'bucket-owner-full-control'
  | 'log-delivery-write';

/**
 * Upload Options
 */
export interface UploadOptions {
  readonly contentType?: string;
  readonly storageClass?: StorageClass;
  readonly acl?: ACL;
  readonly metadata?: Record<string, string>;
  readonly cacheControl?: string;
  readonly contentDisposition?: string;
}

/**
 * Presign Options
 */
export interface PresignOptions {
  readonly expiresIn?: number;
  readonly method?: 'GET' | 'PUT' | 'DELETE' | 'HEAD' | 'POST';
  readonly acl?: ACL;
  readonly type?: string;
}

/**
 * Enterprise S3 Client with Bun v1.3 features
 */
export class EnterpriseS3Client {
  private client: any; // Using any to handle both s3 and S3Client types
  private config: S3Config;

  constructor(config: S3Config) {
    this.config = config;

    // Use global s3 client for default configuration, otherwise create custom client
    const isDefaultConfig = this.isDefaultConfig(config);

    if (isDefaultConfig && !config.bucket) {
      // Use global s3 when no bucket specified (uses env vars)
      this.client = s3;
    } else {
      // Create custom S3Client for specific configurations
      this.client = new S3Client({
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
        region: config.region,
        endpoint: config.endpoint,
        bucket: config.bucket,
        acl: config.acl,
        sessionToken: config.sessionToken,
        ...(config.virtualHostedStyle && { virtualHostedStyle: config.virtualHostedStyle }),
      });
    }
  }

  private isDefaultConfig(config: S3Config): boolean {
    // Check if config matches Bun's automatic environment variable loading
    const s3Vars = {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.S3_REGION || process.env.AWS_REGION || 'us-east-1',
      endpoint: process.env.S3_ENDPOINT || process.env.AWS_ENDPOINT,
      bucket: process.env.S3_BUCKET || process.env.AWS_BUCKET
    };

    return (
      config.accessKeyId === s3Vars.accessKeyId &&
      config.secretAccessKey === s3Vars.secretAccessKey &&
      config.region === s3Vars.region &&
      config.endpoint === s3Vars.endpoint &&
      config.bucket === s3Vars.bucket &&
      !config.virtualHostedStyle
    );
  }

  /**
   * List objects in bucket with prefix filtering
   */
  async listObjects(prefix?: string): Promise<Array<{
    key: string;
    size: number;
    lastModified: Date;
  }>> {
    try {
      // Note: Bun v1.3 S3Client.list() implementation may vary
      // This provides a basic structure for when S3 credentials are available
      const objects = await this.client.list();
      if (Array.isArray(objects)) {
        return objects.map((obj: any) => ({
          key: obj.name,
          size: obj.size,
          lastModified: obj.lastModified
        })).filter((obj: any) => !prefix || obj.key.startsWith(prefix));
      }
      return [];
    } catch (error) {
      console.warn('S3 list operation failed:', error);
      return [];
    }
  }

  /**
   * Upload file with content type and s3:// protocol support
   */
  async uploadFile(
    keyOrUrl: string,
    data: Blob | ArrayBuffer | string,
    options: {
      contentType?: string;
    } = {}
  ): Promise<void> {
    // Support both s3:// URLs and plain keys
    const filePath = this.normalizeFilePath(keyOrUrl);
    const file = this.client.file(filePath);
    await file.write(data);
  }

  /**
   * Download file as ArrayBuffer
   */
  async downloadFile(keyOrUrl: string): Promise<ArrayBuffer> {
    const filePath = this.normalizeFilePath(keyOrUrl);
    const file = this.client.file(filePath);
    return await file.arrayBuffer();
  }

  /**
   * Download file as text with automatic BOM handling (Bun v1.3)
   * Supports UTF-8, UTF-16, and BOM stripping
   */
  async downloadText(keyOrUrl: string): Promise<string> {
    const filePath = this.normalizeFilePath(keyOrUrl);
    const file = this.client.file(filePath);
    return await file.text();
  }

  /**
   * Download and parse file as JSON with BOM handling (Bun v1.3)
   * Automatically strips UTF-8 BOM and handles encoding
   */
  async downloadJSON<T = any>(keyOrUrl: string): Promise<T> {
    const filePath = this.normalizeFilePath(keyOrUrl);
    const file = this.client.file(filePath);
    return await file.json();
  }

  /**
   * Download file as bytes (Uint8Array) with BOM preservation
   */
  async downloadBytes(keyOrUrl: string): Promise<Uint8Array> {
    const filePath = this.normalizeFilePath(keyOrUrl);
    const file = this.client.file(filePath);
    return await file.bytes();
  }

  /**
   * Stream file content for large files (Bun v1.3 streaming support)
   */
  async stream(keyOrUrl: string): Promise<ReadableStream> {
    const filePath = this.normalizeFilePath(keyOrUrl);
    const file = this.client.file(filePath);
    return file.stream();
  }

  /**
   * Get partial file content using range requests (Bun v1.3 slice support)
   */
  async slice(keyOrUrl: string, start: number, end?: number): Promise<any> {
    const filePath = this.normalizeFilePath(keyOrUrl);
    const file = this.client.file(filePath);
    return file.slice(start, end);
  }

  /**
   * Delete file with s3:// protocol support
   */
  async deleteFile(keyOrUrl: string): Promise<void> {
    const filePath = this.normalizeFilePath(keyOrUrl);
    const file = this.client.file(filePath);
    await file.unlink();
  }

  /**
   * Check if file exists with s3:// protocol support
   */
  async fileExists(keyOrUrl: string): Promise<boolean> {
    try {
      const filePath = this.normalizeFilePath(keyOrUrl);
      const file = this.client.file(filePath);
      await file.exists();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file metadata with s3:// protocol support
   */
  async getFileMetadata(keyOrUrl: string): Promise<{
    size: number;
    lastModified: Date;
    contentType?: string;
    etag?: string;
  } | null> {
    try {
      const filePath = this.normalizeFilePath(keyOrUrl);
      const file = this.client.file(filePath);
      const stat = await file.stat();

      return {
        size: stat.size,
        lastModified: stat.lastModified,
        contentType: file.type,
        etag: stat.etag
      };
    } catch {
      return null;
    }
  }

  /**
   * Generate presigned URL for file access
   */
  presign(keyOrUrl: string, options: PresignOptions = {}): string {
    const filePath = this.normalizeFilePath(keyOrUrl);
    const file = this.client.file(filePath);

    return file.presign({
      expiresIn: options.expiresIn || 86400, // 24 hours default
      method: options.method || 'GET',
      acl: options.acl,
      type: options.type,
    });
  }

  /**
   * Write data to S3 with full UploadOptions support (Bun v1.3.6+)
   * Now supports contentDisposition for controlling download behavior
   */
  async writeFile(keyOrUrl: string, data: any, options: UploadOptions = {}): Promise<void> {
    const filePath = this.normalizeFilePath(keyOrUrl);
    const file = this.client.file(filePath);

    // Use Bun's S3 write with full options support
    await file.write(data, {
      type: options.contentType,
      acl: options.acl,
      storageClass: options.storageClass,
      metadata: options.metadata,
      cacheControl: options.cacheControl,
      contentDisposition: options.contentDisposition, // NEW: Bun v1.3.6+
    });
  }

  /**
   * Create a streaming writer for large file uploads
   */
  createWriter(keyOrUrl: string, options: {
    contentType?: string;
    retry?: number;
    queueSize?: number;
    partSize?: number;
  } = {}) {
    const filePath = this.normalizeFilePath(keyOrUrl);
    const file = this.client.file(filePath);

    return file.writer({
      type: options.contentType,
      retry: options.retry || 3,
      queueSize: options.queueSize || 10,
      partSize: options.partSize || 5 * 1024 * 1024, // 5MB chunks
    });
  }



  /**
   * Normalize file path to support s3:// URLs
   */
  normalizeFilePath(keyOrUrl: string): string {
    // If it's already an s3:// URL, use as-is
    if (keyOrUrl.startsWith('s3://')) {
      return keyOrUrl;
    }

    // If it's a plain key, construct s3:// URL with bucket
    return `s3://${this.config.bucket}/${keyOrUrl}`;
  }

  /**
   * Create virtual hosted-style client (Bun v1.3 feature)
   */
  static createVirtualHosted(config: Omit<S3Config, 'virtualHostedStyle'>): EnterpriseS3Client {
    return new EnterpriseS3Client({
      ...config,
      virtualHostedStyle: true
    });
  }

  /**
   * Create R2-compatible client (Cloudflare R2)
   */
  static createR2Client(config: Omit<S3Config, 'endpoint'> & { accountId?: string }): EnterpriseS3Client {
    return new EnterpriseS3Client({
      ...config,
      endpoint: `https://${config.accountId || config.accessKeyId}.r2.cloudflarestorage.com`,
      virtualHostedStyle: true
    });
  }

  /**
   * Create AWS S3 client
   */
  static createS3Client(config: Omit<S3Config, 'endpoint'>): EnterpriseS3Client {
    return new EnterpriseS3Client({
      ...config,
      endpoint: `https://s3.${config.region}.amazonaws.com`
    });
  }

  /**
   * Create Google Cloud Storage client
   */
  static createGCSClient(config: Omit<S3Config, 'endpoint'>): EnterpriseS3Client {
    return new EnterpriseS3Client({
      ...config,
      endpoint: 'https://storage.googleapis.com'
    });
  }

  /**
   * Create DigitalOcean Spaces client
   */
  static createSpacesClient(config: Omit<S3Config, 'endpoint' | 'region'> & { region: string }): EnterpriseS3Client {
    return new EnterpriseS3Client({
      ...config,
      endpoint: `https://${config.region}.digitaloceanspaces.com`
    });
  }

  /**
   * Create MinIO client
   */
  static createMinIOClient(config: Omit<S3Config, 'endpoint'> & { endpoint: string }): EnterpriseS3Client {
    return new EnterpriseS3Client({
      ...config,
      endpoint: config.endpoint // e.g., 'http://localhost:9000'
    });
  }

  /**
   * Create Supabase client
   */
  static createSupabaseClient(config: Omit<S3Config, 'endpoint'> & { projectId: string }): EnterpriseS3Client {
    return new EnterpriseS3Client({
      ...config,
      endpoint: `https://${config.projectId}.supabase.co/storage/v1/s3`
    });
  }
}

/**
 * Global S3 client instance (configured via environment)
 * Uses Bun's automatic environment variable loading as documented
 */
export const s3Client = (process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID) &&
                       (process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY) ?
  new EnterpriseS3Client({
    accessKeyId: process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY!,
    region: process.env.S3_REGION || process.env.AWS_REGION || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT || process.env.AWS_ENDPOINT,
    bucket: process.env.S3_BUCKET || process.env.AWS_BUCKET
  }) : null;

/**
 * R2 Client for Cloudflare R2 storage
 */
export const r2Client = process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY ?
  EnterpriseS3Client.createR2Client({
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    region: 'auto',
    bucket: process.env.R2_BUCKET,
    accountId: process.env.R2_ACCOUNT_ID
  }) : null;

/**
 * S3 Error types (matching Bun's S3Error codes)
 */
export interface S3Error extends Error {
  code: 'ERR_S3_MISSING_CREDENTIALS' | 'ERR_S3_INVALID_METHOD' | 'ERR_S3_INVALID_PATH' |
        'ERR_S3_INVALID_ENDPOINT' | 'ERR_S3_INVALID_SIGNATURE' | string;
}

/**
 * Utility function to check if an error is an S3Error
 */
export function isS3Error(error: any): error is S3Error {
  return error && typeof error === 'object' && 'code' in error && error.code.startsWith('ERR_S3');
}

/**
 * Pre-configured clients for common services
 */
export const createAWSClient = (config: Omit<S3Config, 'endpoint'>) =>
  EnterpriseS3Client.createS3Client(config);

export const createGCSClient = (config: Omit<S3Config, 'endpoint'>) =>
  EnterpriseS3Client.createGCSClient(config);

export const createSpacesClient = (config: Omit<S3Config, 'endpoint'> & { region: string }) =>
  EnterpriseS3Client.createSpacesClient(config);

export const createMinIOClient = (config: Omit<S3Config, 'endpoint'> & { endpoint: string }) =>
  EnterpriseS3Client.createMinIOClient(config);

export const createSupabaseClient = (config: Omit<S3Config, 'endpoint'> & { projectId: string }) =>
  EnterpriseS3Client.createSupabaseClient(config);

/**
 * Static S3 operations using Bun's S3Client static methods
 * These provide direct access to Bun's native S3 operations
 */
export class S3Operations {
  private static async getS3Client() {
    const { S3Client } = await import('bun');
    return S3Client;
  }

  /**
   * Write data to S3 using Bun's S3Client.write static method
   * Now supports contentDisposition for controlling download behavior (Bun v1.3.6+)
   */
  static async write(key: string, data: any, options?: {
    type?: string;
    acl?: ACL;
    metadata?: Record<string, string>;
    contentDisposition?: string; // NEW: Control download behavior
    storageClass?: StorageClass;
    cacheControl?: string;
  } & S3Config): Promise<void> {
    const S3Client = await this.getS3Client();
    await S3Client.write(key, data, options);
  }

  /**
   * Delete file from S3 using Bun's S3Client static method
   */
  static async delete(key: string, options?: S3Config): Promise<void> {
    const S3Client = await this.getS3Client();
    await S3Client.delete(key, options);
  }

  /**
   * Check if file exists using Bun's S3Client static method
   */
  static async exists(key: string, options?: S3Config): Promise<boolean> {
    const S3Client = await this.getS3Client();
    return await S3Client.exists(key, options);
  }

  /**
   * Get file size using Bun's S3Client static method
   */
  static async size(key: string, options?: S3Config): Promise<number> {
    const S3Client = await this.getS3Client();
    return await S3Client.size(key, options);
  }

  /**
   * Get file stats using Bun's S3Client static method
   */
  static async stat(key: string, options?: S3Config): Promise<any> {
    const S3Client = await this.getS3Client();
    return await S3Client.stat(key, options);
  }

  /**
   * List objects using Bun's S3Client.list static method
   */
  static async list(options?: {
    prefix?: string;
    maxKeys?: number;
    startAfter?: string;
    fetchOwner?: boolean;
  } & S3Config): Promise<any> {
    const S3Client = await this.getS3Client();
    return await S3Client.list(options, options);
  }

  /**
   * Presign URL using Bun's S3Client static method
   */
  static async presign(key: string, options?: {
    expiresIn?: number;
    method?: 'GET' | 'PUT' | 'DELETE' | 'HEAD' | 'POST';
    acl?: ACL;
    type?: string;
  } & S3Config): Promise<string> {
    const S3Client = await this.getS3Client();
    return S3Client.presign(key, options);
  }
}