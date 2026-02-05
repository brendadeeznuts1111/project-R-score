export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl?: string;
}

export interface UploadResult {
  key: string;
  url: string;
  etag?: string;
}

export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
}

export interface R2FileInfo {
  key: string;
  size?: number;
  lastModified?: Date;
}

/**
 * Abstract base class for R2 clients
 */
export abstract class R2Client {
  protected config: R2Config;
  protected missingConfigKeys: string[];

  constructor(config: R2Config) {
    this.config = config;
    this.missingConfigKeys = this.getMissingConfigKeys(config);
  }

  private getMissingConfigKeys(config: R2Config): string[] {
    const missing: string[] = [];
    if (!config.accountId) {
      missing.push("VITE_R2_ACCOUNT_ID");
    }
    if (!config.accessKeyId) {
      missing.push("VITE_R2_ACCESS_KEY_ID");
    }
    if (!config.secretAccessKey) {
      missing.push("VITE_R2_SECRET_ACCESS_KEY");
    }
    if (!config.bucketName) {
      missing.push("VITE_R2_BUCKET_NAME");
    }
    return missing;
  }

  protected ensureConfigured(): never | void {
    if (this.missingConfigKeys.length > 0) {
      throw new Error(
        `R2 is not configured. Missing environment variables: ${this.missingConfigKeys.join(", ")}`
      );
    }
  }

  abstract uploadFile(file: File, key?: string): Promise<UploadResult>;
  abstract uploadData(
    data: Buffer | string,
    key: string,
    contentType?: string
  ): Promise<UploadResult>;
  abstract deleteFile(key: string): Promise<void>;
  abstract listFiles(prefix?: string): Promise<R2FileInfo[]>;
  abstract fileExists(key: string): Promise<boolean>;
  abstract getFileMetadata(key: string): Promise<FileMetadata | null>;
  abstract getUploadUrl(key: string, contentType?: string, expiresIn?: number): Promise<string>;
  abstract getDownloadUrl(key: string, expiresIn?: number): Promise<string>;
}
