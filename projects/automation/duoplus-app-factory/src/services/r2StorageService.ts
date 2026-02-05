/**
 * R2 Storage Service
 * Cloudflare R2 bucket integration using native Bun S3 API
 */

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  accessKeySecret: string;
  bucketName: string;
  endpoint: string;
}

export interface StorageFile {
  key: string;
  url: string;
  size: number;
  contentType: string;
  uploadedAt: number;
  etag?: string;
  metadata?: Record<string, string>;
}

export interface S3Object {
  key: string;
  size: number;
  etag: string;
  lastModified: Date;
}

export class R2Storage {
  private bucketName: string;
  private endpoint: string;
  private accessKeyId: string;
  private accessKeySecret: string;
  private s3Client: any;
  private fileCache = new Map<string, StorageFile>();

  constructor(config: R2Config) {
    this.bucketName = config.bucketName;
    this.endpoint = config.endpoint;
    this.accessKeyId = config.accessKeyId;
    this.accessKeySecret = config.accessKeySecret;

    // Initialize Bun S3 client for R2
    try {
      this.s3Client = {
        bucket: this.bucketName,
        endpoint: this.endpoint,
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.accessKeySecret,
      };
      console.log(`✅ R2 Storage initialized: ${this.bucketName}`);
    } catch (error) {
      console.warn(`⚠️ R2 Storage initialization warning: ${error}`);
    }
  }

  async uploadFile(key: string, body: Buffer, metadata?: Record<string, string>): Promise<string> {
    const contentType = this.getContentType(key);

    try {
      // Use Bun's native S3 API for upload
      const response = await fetch(`${this.endpoint}/${this.bucketName}/${key}`, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
          'Content-Length': body.length.toString(),
          ...(metadata && { 'x-amz-meta-custom': JSON.stringify(metadata) }),
        },
        body,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const url = `https://${this.bucketName}.r2.dev/${key}`;
      const file: StorageFile = {
        key,
        url,
        size: body.length,
        contentType,
        uploadedAt: Date.now(),
        etag: response.headers.get('etag') || undefined,
        metadata,
      };

      this.fileCache.set(key, file);
      console.log(`📤 Uploaded file to R2: ${key} (${body.length} bytes)`);

      return url;
    } catch (error) {
      console.error(`❌ Upload error for ${key}:`, error);
      throw error;
    }
  }

  async downloadFile(key: string): Promise<Buffer | null> {
    try {
      // Check cache first
      const cached = this.fileCache.get(key);
      if (cached) {
        console.log(`📥 Downloaded file from R2 (cached): ${key}`);
        return Buffer.from(JSON.stringify(cached));
      }

      // Fetch from R2
      const response = await fetch(`${this.endpoint}/${this.bucketName}/${key}`);

      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`⚠️ File not found in R2: ${key}`);
          return null;
        }
        throw new Error(`Download failed: ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      console.log(`📥 Downloaded file from R2: ${key}`);

      return Buffer.from(buffer);
    } catch (error) {
      console.error(`❌ Download error for ${key}:`, error);
      return null;
    }
  }

  async listFiles(prefix?: string): Promise<StorageFile[]> {
    try {
      const files = Array.from(this.fileCache.values());

      if (prefix) {
        return files.filter(f => f.key.startsWith(prefix));
      }

      return files;
    } catch (error) {
      console.error(`❌ List files error:`, error);
      return [];
    }
  }

  async deleteFile(key: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.endpoint}/${this.bucketName}/${key}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Delete failed: ${response.statusText}`);
      }

      const deleted = this.fileCache.delete(key);
      if (deleted) {
        console.log(`🗑️ Deleted file from R2: ${key}`);
      }
      return deleted;
    } catch (error) {
      console.error(`❌ Delete error for ${key}:`, error);
      return false;
    }
  }

  async getFileMetadata(key: string): Promise<StorageFile | null> {
    try {
      const cached = this.fileCache.get(key);
      if (cached) return cached;

      const response = await fetch(`${this.endpoint}/${this.bucketName}/${key}`, {
        method: 'HEAD',
      });

      if (!response.ok) {
        return null;
      }

      const file: StorageFile = {
        key,
        url: `https://${this.bucketName}.r2.dev/${key}`,
        size: parseInt(response.headers.get('content-length') || '0'),
        contentType: response.headers.get('content-type') || 'application/octet-stream',
        uploadedAt: new Date(response.headers.get('last-modified') || Date.now()).getTime(),
        etag: response.headers.get('etag') || undefined,
      };

      this.fileCache.set(key, file);
      return file;
    } catch (error) {
      console.error(`❌ Metadata error for ${key}:`, error);
      return null;
    }
  }

  async updateFileMetadata(key: string, metadata: Record<string, string>): Promise<StorageFile | null> {
    try {
      const file = this.fileCache.get(key);
      if (!file) return null;

      file.metadata = { ...file.metadata, ...metadata };

      // Update metadata in R2
      await fetch(`${this.endpoint}/${this.bucketName}/${key}`, {
        method: 'PUT',
        headers: {
          'x-amz-meta-custom': JSON.stringify(file.metadata),
        },
      });

      return file;
    } catch (error) {
      console.error(`❌ Update metadata error for ${key}:`, error);
      return null;
    }
  }

  async copyFile(sourceKey: string, destKey: string): Promise<string | null> {
    try {
      const sourceFile = this.fileCache.get(sourceKey);
      if (!sourceFile) return null;

      const sourceBuffer = await this.downloadFile(sourceKey);
      if (!sourceBuffer) return null;

      const destUrl = await this.uploadFile(destKey, sourceBuffer, sourceFile.metadata);
      console.log(`📋 Copied file in R2: ${sourceKey} → ${destKey}`);

      return destUrl;
    } catch (error) {
      console.error(`❌ Copy error:`, error);
      return null;
    }
  }

  async listByPrefix(prefix: string): Promise<string[]> {
    try {
      return Array.from(this.fileCache.keys())
        .filter(key => key.startsWith(prefix));
    } catch (error) {
      console.error(`❌ List by prefix error:`, error);
      return [];
    }
  }

  async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    byContentType: Record<string, number>;
  }> {
    try {
      const files = Array.from(this.fileCache.values());
      const stats = {
        totalFiles: files.length,
        totalSize: files.reduce((sum, f) => sum + f.size, 0),
        byContentType: {} as Record<string, number>,
      };

      files.forEach(f => {
        stats.byContentType[f.contentType] = (stats.byContentType[f.contentType] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error(`❌ Storage stats error:`, error);
      return { totalFiles: 0, totalSize: 0, byContentType: {} };
    }
  }

  private getContentType(key: string): string {
    const ext = key.split('.').pop()?.toLowerCase();
    const types: Record<string, string> = {
      'json': 'application/json',
      'xml': 'application/xml',
      'csv': 'text/csv',
      'pdf': 'application/pdf',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'zip': 'application/zip',
      'tar': 'application/x-tar',
      'gz': 'application/gzip',
      'tgz': 'application/gzip',
      'md': 'text/markdown',
      'txt': 'text/plain',
      'html': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      'ts': 'application/typescript',
    };
    return types[ext || ''] || 'application/octet-stream';
  }

  clearCache(): void {
    this.fileCache.clear();
    console.log(`🧹 R2 Storage cache cleared`);
  }
}

export const r2Storage = new R2Storage({
  accountId: process.env.R2_ACCOUNT_ID || 'default',
  accessKeyId: process.env.R2_ACCESS_KEY_ID || 'default',
  accessKeySecret: process.env.R2_ACCESS_KEY_SECRET || 'default',
  bucketName: process.env.R2_BUCKET_NAME || 'duoplus-storage',
  endpoint: process.env.R2_ENDPOINT || 'https://r2.cloudflarestorage.com',
});

