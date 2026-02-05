import { execSync } from "child_process";

export interface WranglerConfig {
  accountId: string;
  apiToken: string;
  bucketName: string;
}

export interface R2Credentials {
  accessKeyId: string;
  secretAccessKey: string;
}

/**
 * Wrangler-based R2 authentication helper
 */
export class WranglerAuth {
  private config: WranglerConfig;

  constructor(config: WranglerConfig) {
    this.config = config;
  }

  /**
   * Get R2 credentials using Wrangler CLI
   */
  async getR2Credentials(): Promise<R2Credentials> {
    try {
      // Try to get credentials from wrangler CLI
      execSync("wrangler r2 bucket list", {
        encoding: "utf8",
        env: {
          ...process.env,
          CLOUDFLARE_API_TOKEN: this.config.apiToken,
          CLOUDFLARE_ACCOUNT_ID: this.config.accountId
        }
      });

      // For now, return mock credentials - in production, you'd parse the output
      // or use wrangler's internal APIs
      return {
        accessKeyId: "mock-access-key",
        secretAccessKey: "mock-secret-key"
      };
    } catch (error) {
      throw new Error(
        `Failed to get R2 credentials: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Create R2 bucket if it doesn't exist
   */
  async createBucketIfNotExists(): Promise<void> {
    try {
      const { execSync } = await import("child_process");

      try {
        // Check if bucket exists
        execSync(`wrangler r2 bucket describe ${this.config.bucketName}`, {
          env: {
            ...process.env,
            CLOUDFLARE_API_TOKEN: this.config.apiToken,
            CLOUDFLARE_ACCOUNT_ID: this.config.accountId
          }
        });
      } catch {
        // Create bucket if it doesn't exist
        execSync(`wrangler r2 bucket create ${this.config.bucketName}`, {
          env: {
            ...process.env,
            CLOUDFLARE_API_TOKEN: this.config.apiToken,
            CLOUDFLARE_ACCOUNT_ID: this.config.accountId
          }
        });
      }
    } catch (error) {
      throw new Error(
        `Failed to create bucket: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Get bucket URL
   */
  getBucketUrl(): string {
    return `https://pub-${this.config.accountId}.r2.dev/${this.config.bucketName}`;
  }

  /**
   * Upload file using Wrangler CLI
   */
  async uploadFileWithWrangler(localPath: string, remoteKey: string): Promise<void> {
    try {
      execSync(
        `wrangler r2 object put ${this.config.bucketName}/${remoteKey} --file=${localPath}`,
        {
          env: {
            ...process.env,
            CLOUDFLARE_API_TOKEN: this.config.apiToken,
            CLOUDFLARE_ACCOUNT_ID: this.config.accountId
          }
        }
      );
    } catch (error) {
      throw new Error(
        `Failed to upload file with Wrangler: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Download file using Wrangler CLI
   */
  async downloadFileWithWrangler(remoteKey: string, localPath: string): Promise<void> {
    try {
      execSync(
        `wrangler r2 object get ${this.config.bucketName}/${remoteKey} --file=${localPath}`,
        {
          env: {
            ...process.env,
            CLOUDFLARE_API_TOKEN: this.config.apiToken,
            CLOUDFLARE_ACCOUNT_ID: this.config.accountId
          }
        }
      );
    } catch (error) {
      throw new Error(
        `Failed to download file with Wrangler: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * List files using Wrangler CLI
   */
  async listFilesWithWrangler(): Promise<string[]> {
    try {
      const output = execSync(`wrangler r2 object list ${this.config.bucketName}`, {
        encoding: "utf8",
        env: {
          ...process.env,
          CLOUDFLARE_API_TOKEN: this.config.apiToken,
          CLOUDFLARE_ACCOUNT_ID: this.config.accountId
        }
      });

      // Parse output to get file keys
      const lines = output.split("\n").filter((line) => line.trim());
      return lines
        .map((line) => {
          const match = line.match(/^[^ ]+\s+([^ ]+)/);
          return match ? match[1] : "";
        })
        .filter((key) => key);
    } catch (error) {
      throw new Error(
        `Failed to list files with Wrangler: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
}

/**
 * Default Wrangler auth instance
 */
export const wranglerAuth = new WranglerAuth({
  accountId: import.meta.env.VITE_R2_ACCOUNT_ID || "",
  apiToken: import.meta.env.VITE_CLOUDFLARE_API_TOKEN || "",
  bucketName: import.meta.env.VITE_R2_BUCKET_NAME || "foxy-proxy-storage"
});

/**
 * Hybrid R2 client that uses Bun for HTTP and Wrangler for auth
 */
export class HybridR2Client {
  private wranglerAuth: WranglerAuth;
  private credentials: R2Credentials | null = null;

  constructor() {
    this.wranglerAuth = wranglerAuth;
  }

  /**
   * Initialize credentials
   */
  async init(): Promise<void> {
    this.credentials = await this.wranglerAuth.getR2Credentials();
  }

  /**
   * Ensure credentials are loaded
   */
  private async ensureCredentials(): Promise<R2Credentials> {
    if (!this.credentials) {
      await this.init();
    }
    return this.credentials!;
  }

  /**
   * Upload file using Bun HTTP client with Wrangler auth
   */
  async uploadFile(file: File, key?: string): Promise<{ key: string; url: string }> {
    const credentials = await this.ensureCredentials();
    const fileKey = key || `uploads/${Date.now()}-${file.name}`;

    try {
      const response = await fetch(
        `https://${this.wranglerAuth["config"].accountId}.r2.cloudflarestorage.com/${this.wranglerAuth["config"].bucketName}/${fileKey}`,
        {
          method: "PUT",
          headers: {
            Authorization: `AWS4-HMAC-SHA256 Credential=${credentials.accessKeyId}/20240101/auto/s3/aws4_request, SignedHeaders=host;x-amz-date, Signature=mock-signature`,
            "Content-Type": file.type,
            "x-amz-date": new Date().toISOString().replace(/[:-]|\.\d{3}/g, "")
          },
          body: file
        }
      );

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      return {
        key: fileKey,
        url: this.wranglerAuth.getBucketUrl() + "/" + fileKey
      };
    } catch (error) {
      throw new Error(
        `Failed to upload file: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Create bucket if needed
   */
  async ensureBucket(): Promise<void> {
    await this.wranglerAuth.createBucketIfNotExists();
  }
}

export const hybridR2Client = new HybridR2Client();
