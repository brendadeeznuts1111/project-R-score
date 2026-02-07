/**
 * Unified Cloudflare Client
 * 
 * Combines Domain Management, R2 Storage, and Workers into a single
 * cohesive interface using Bun v1.3.7+ features:
 * - S3 client (alpha) for R2 operations
 * - Worker API (alpha) for edge computing
 * - Profile capture for performance analysis
 * - Presigned URLs for secure sharing
 * - Header case preservation for API compatibility
 */

import { CloudflareClient, type CFZone, type CFDNSRecord } from './client';
import { cfSecretsBridge } from './secrets-bridge';
import { versionManager } from './unified-versioning';

// Bun v1.3.7+ S3 client types (alpha)
interface BunS3Client {
  bucket: (name: string) => BunS3Bucket;
  presign: (key: string, options?: PresignOptions) => Promise<string>;
}

interface BunS3Bucket {
  get: (key: string) => Promise<Response | null>;
  put: (key: string, body: Blob | ArrayBuffer | string, options?: S3PutOptions) => Promise<void>;
  delete: (key: string) => Promise<void>;
  list: (options?: S3ListOptions) => Promise<S3ListResult>;
  presign: (key: string, options?: PresignOptions) => Promise<string>;
}

interface S3PutOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  cacheControl?: string;
}

interface S3ListOptions {
  prefix?: string;
  maxKeys?: number;
  continuationToken?: string;
}

interface S3ListResult {
  objects: Array<{
    key: string;
    size: number;
    lastModified: Date;
    etag: string;
  }>;
  continuationToken?: string;
  isTruncated: boolean;
}

interface PresignOptions {
  method?: 'GET' | 'PUT' | 'DELETE';
  expiresIn?: number; // seconds
  headers?: Record<string, string>;
}

// Bun v1.3.7+ Worker types (alpha)
interface BunWorker {
  fetch: (request: Request) => Promise<Response>;
  reload: () => Promise<void>;
  dispose: () => Promise<void>;
}

interface WorkerOptions {
  script: string;
  bindings?: Record<string, unknown>;
  compatibilityDate?: string;
}

// Profile capture types
interface ProfileCapture {
  start: () => void;
  stop: () => Promise<ProfileResult>;
}

interface ProfileResult {
  cpu: Array<{
    timestamp: number;
    usage: number;
    samples: number;
  }>;
  memory: Array<{
    timestamp: number;
    heapUsed: number;
    heapTotal: number;
    rss: number;
  }>;
  operations: Array<{
    name: string;
    duration: number;
    timestamp: number;
  }>;
  summary: {
    totalOperations: number;
    averageLatency: number;
    peakMemory: number;
    peakCpu: number;
  };
}

/**
 * Unified Cloudflare Service
 * 
 * Provides integrated access to:
 * - Domain/Zone management
 * - R2 Storage (via Bun S3 client)
 * - Workers (via Bun Worker API)
 * - Performance profiling
 * - Presigned URL generation
 */
export class UnifiedCloudflareService {
  private domainClient: CloudflareClient | null = null;
  private s3Client: BunS3Client | null = null;
  private r2Bucket: BunS3Bucket | null = null;
  private workers: Map<string, BunWorker> = new Map();
  private profileCaptures: Map<string, ProfileCapture> = new Map();
  
  // Configuration
  private config: {
    accountId?: string;
    apiToken?: string;
    r2AccountId?: string;
    r2AccessKeyId?: string;
    r2SecretAccessKey?: string;
    r2BucketName?: string;
  } = {};

  constructor() {
    this.loadConfig();
  }

  private async loadConfig(): Promise<void> {
    // Try to load from secrets first
    const cfCreds = await cfSecretsBridge.getCredentials();
    if (cfCreds) {
      this.config.apiToken = cfCreds.apiToken;
      this.config.accountId = cfCreds.accountId;
    }

    // Environment fallbacks
    this.config.apiToken ||= Bun.env.CLOUDFLARE_API_TOKEN;
    this.config.accountId ||= Bun.env.CLOUDFLARE_ACCOUNT_ID;
    this.config.r2AccountId ||= Bun.env.R2_ACCOUNT_ID;
    this.config.r2AccessKeyId ||= Bun.env.R2_ACCESS_KEY_ID;
    this.config.r2SecretAccessKey ||= Bun.env.R2_SECRET_ACCESS_KEY;
    this.config.r2BucketName ||= Bun.env.R2_BUCKET_NAME || 'factory-wager';
  }

  // ==================== Domain Management ====================

  async getDomainClient(): Promise<CloudflareClient> {
    if (!this.domainClient) {
      if (!this.config.apiToken) {
        throw new Error('Cloudflare API token not configured. Run: bun run cf:secrets:setup');
      }
      this.domainClient = new CloudflareClient({
        apiToken: this.config.apiToken,
        accountId: this.config.accountId,
      });
    }
    return this.domainClient;
  }

  async listZones(): Promise<CFZone[]> {
    const client = await this.getDomainClient();
    return client.listZones();
  }

  async listDNSRecords(zoneId: string): Promise<CFDNSRecord[]> {
    const client = await this.getDomainClient();
    return client.listDNSRecords(zoneId);
  }

  // ==================== R2 Storage (Bun S3 Alpha) ====================

  /**
   * Initialize Bun S3 client for R2
   * Uses Bun v1.3.7+ S3 client API
   */
  private async getS3Client(): Promise<BunS3Client> {
    if (this.s3Client) return this.s3Client;

    // Check if Bun.S3 is available (v1.3.7+)
    if (typeof Bun === 'undefined' || !('S3' in Bun)) {
      throw new Error('Bun.S3 client not available. Requires Bun v1.3.7+');
    }

    // Initialize S3 client with R2 credentials
    const s3 = (Bun as unknown as { S3: new (config: unknown) => BunS3Client }).S3;
    
    this.s3Client = new s3({
      endpoint: `https://${this.config.r2AccountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: this.config.r2AccessKeyId || '',
        secretAccessKey: this.config.r2SecretAccessKey || '',
      },
      region: 'auto',
    });

    return this.s3Client;
  }

  /**
   * Get R2 bucket instance
   */
  async getR2Bucket(): Promise<BunS3Bucket> {
    if (this.r2Bucket) return this.r2Bucket;

    const s3 = await this.getS3Client();
    this.r2Bucket = s3.bucket(this.config.r2BucketName || 'factory-wager');
    return this.r2Bucket;
  }

  /**
   * Upload file to R2
   */
  async uploadToR2(
    key: string,
    data: Blob | ArrayBuffer | string,
    options?: S3PutOptions
  ): Promise<void> {
    const bucket = await this.getR2Bucket();
    
    // Capture profile if active
    const startTime = performance.now();
    
    await bucket.put(key, data, {
      contentType: options?.contentType,
      metadata: options?.metadata,
      cacheControl: options?.cacheControl,
    });

    // Log operation for profiling
    this.logOperation('r2.upload', performance.now() - startTime);
  }

  /**
   * Download file from R2
   */
  async downloadFromR2(key: string): Promise<Response | null> {
    const bucket = await this.getR2Bucket();
    const startTime = performance.now();
    
    const response = await bucket.get(key);
    
    this.logOperation('r2.download', performance.now() - startTime);
    return response;
  }

  /**
   * List R2 objects
   */
  async listR2Objects(options?: S3ListOptions): Promise<S3ListResult> {
    const bucket = await this.getR2Bucket();
    return bucket.list(options);
  }

  /**
   * Generate presigned URL for R2
   * Uses Bun v1.3.7+ presign feature
   */
  async presignR2Url(
    key: string,
    options: PresignOptions = {}
  ): Promise<string> {
    const bucket = await this.getR2Bucket();
    
    return bucket.presign(key, {
      method: options.method || 'GET',
      expiresIn: options.expiresIn || 3600, // 1 hour default
      headers: options.headers,
    });
  }

  // ==================== Workers (Bun Worker API Alpha) ====================

  /**
   * Deploy or update a Cloudflare Worker
   * Uses Bun v1.3.7+ Worker API
   */
  async deployWorker(name: string, script: string, bindings?: Record<string, unknown>): Promise<BunWorker> {
    // Check if Bun.Worker API is available
    if (typeof Bun === 'undefined' || !('Worker' in Bun)) {
      throw new Error('Bun.Worker API not available. Requires Bun v1.3.7+');
    }

    const workerOptions: WorkerOptions = {
      script,
      bindings,
      compatibilityDate: new Date().toISOString().split('T')[0],
    };

    // Create worker using Bun's Worker API
    const WorkerConstructor = (Bun as unknown as { 
      Worker: new (options: WorkerOptions) => BunWorker 
    }).Worker;
    
    const worker = new WorkerConstructor(workerOptions);
    this.workers.set(name, worker);
    
    return worker;
  }

  /**
   * Invoke a deployed worker
   */
  async invokeWorker(name: string, request: Request): Promise<Response> {
    const worker = this.workers.get(name);
    if (!worker) {
      throw new Error(`Worker "${name}" not found`);
    }
    
    return worker.fetch(request);
  }

  /**
   * Reload a worker
   */
  async reloadWorker(name: string): Promise<void> {
    const worker = this.workers.get(name);
    if (!worker) {
      throw new Error(`Worker "${name}" not found`);
    }
    
    await worker.reload();
  }

  /**
   * Remove a worker
   */
  async removeWorker(name: string): Promise<void> {
    const worker = this.workers.get(name);
    if (worker) {
      await worker.dispose();
      this.workers.delete(name);
    }
  }

  // ==================== Performance Profiling ====================

  /**
   * Start performance profiling
   */
  startProfiling(name: string): void {
    if (typeof Bun === 'undefined' || !('profile' in Bun)) {
      console.warn('Bun.profile API not available');
      return;
    }

    const profile = (Bun as unknown as { 
      profile: (options: { type: 'cpu' | 'memory' | 'all' }) => ProfileCapture 
    }).profile;

    const capture = profile({ type: 'all' });
    this.profileCaptures.set(name, capture);
    capture.start();
  }

  /**
   * Stop profiling and get results
   */
  async stopProfiling(name: string): Promise<ProfileResult | null> {
    const capture = this.profileCaptures.get(name);
    if (!capture) return null;

    const result = await capture.stop();
    this.profileCaptures.delete(name);
    return result;
  }

  // ==================== Header Case Preservation ====================

  /**
   * Make API request with header case preservation
   * Bun v1.3.7+ fetch() preserves header case
   */
  async fetchWithPreservedHeaders(
    url: string,
    options: RequestInit & { preserveHeaders?: string[] } = {}
  ): Promise<Response> {
    const { preserveHeaders = [], ...fetchOptions } = options;
    
    // Bun v1.3.7+ automatically preserves header case
    // We just need to ensure headers are properly formatted
    const headers = new Headers(fetchOptions.headers);
    
    // Add headers that need case preservation
    preserveHeaders.forEach(headerName => {
      const value = headers.get(headerName.toLowerCase());
      if (value) {
        headers.delete(headerName.toLowerCase());
        // Re-add with original case - Bun preserves this
        headers.set(headerName, value);
      }
    });

    return fetch(url, { ...fetchOptions, headers });
  }

  // ==================== Unified Operations ====================

  /**
   * Deploy full stack: Domain + R2 + Worker
   */
  async deployStack(config: {
    domain: string;
    workerScript: string;
    r2Assets: Array<{ key: string; data: Blob | string }>;
    bindings?: Record<string, unknown>;
    version?: string;
  }): Promise<{
    zone: CFZone;
    worker: BunWorker;
    presignedUrls: string[];
    deploymentVersion: string;
  }> {
    // Start profiling
    this.startProfiling('deploy-stack');
    const startTime = performance.now();

    // Determine version
    const currentVersion = config.version || '1.0.0';
    let newVersion = currentVersion;
    
    // Check for existing resource versions
    const existingDomain = versionManager.getResource(`domain:${config.domain}`);
    if (existingDomain) {
      newVersion = versionManager.bumpVersion(existingDomain.currentVersion, 'patch');
    }

    try {
      // 1. Ensure domain zone exists
      const client = await this.getDomainClient();
      let zones = await client.listZones(config.domain);
      let zone = zones.find(z => z.name === config.domain);
      
      if (!zone) {
        zone = await client.createZone(config.domain);
      }

      // Register domain version
      await versionManager.registerResource(`domain:${config.domain}`, newVersion, {
        type: 'zone',
        domain: config.domain,
      });

      // 2. Upload assets to R2
      const presignedUrls: string[] = [];
      for (const asset of config.r2Assets) {
        await this.uploadToR2(asset.key, asset.data);
        const url = await this.presignR2Url(asset.key, { expiresIn: 86400 });
        presignedUrls.push(url);
      }

      // Register R2 version
      await versionManager.registerResource(`r2:${config.domain}`, newVersion, {
        type: 'r2',
        assets: config.r2Assets.map(a => a.key),
      });

      // 3. Deploy worker
      const worker = await this.deployWorker(
        `${config.domain}-worker`,
        config.workerScript,
        {
          ...config.bindings,
          R2_BUCKET: this.config.r2BucketName,
          DEPLOYMENT_VERSION: newVersion,
        }
      );

      // Register worker version
      await versionManager.registerResource(`worker:${config.domain}`, newVersion, {
        type: 'worker',
        domain: config.domain,
      });

      // 4. Create DNS record pointing to worker
      await client.createDNSRecord(zone.id, {
        type: 'CNAME',
        name: config.domain,
        content: 'workers.dev',
        proxied: true,
        ttl: 1,
      });

      // Record deployment
      const deployment = versionManager.recordDeployment({
        domain: newVersion,
        worker: newVersion,
        r2Assets: newVersion,
        secrets: '1.0.0',
        changelog: versionManager.generateChangelog(currentVersion, newVersion),
      });

      // Stop profiling
      const profile = await this.stopProfiling('deploy-stack');
      
      console.log(`✅ Stack deployed in ${(performance.now() - startTime).toFixed(2)}ms`);
      console.log(`   Version: ${newVersion}`);
      if (profile) {
        console.log(`   Peak CPU: ${profile.summary.peakCpu.toFixed(1)}%`);
        console.log(`   Peak Memory: ${(profile.summary.peakMemory / 1024 / 1024).toFixed(1)}MB`);
      }

      return { zone, worker, presignedUrls, deploymentVersion: newVersion };
    } catch (error) {
      await this.stopProfiling('deploy-stack');
      throw error;
    }
  }

  // ==================== Private Helpers ====================

  private operationLog: Array<{
    name: string;
    duration: number;
    timestamp: number;
  }> = [];

  private logOperation(name: string, duration: number): void {
    this.operationLog.push({
      name,
      duration,
      timestamp: Date.now(),
    });

    // Keep log manageable
    if (this.operationLog.length > 1000) {
      this.operationLog = this.operationLog.slice(-500);
    }
  }

  /**
   * Get operation statistics
   */
  getOperationStats(): {
    total: number;
    averageDuration: number;
    byType: Record<string, { count: number; avgDuration: number }>;
  } {
    const byType: Record<string, { count: number; totalDuration: number }> = {};
    
    for (const op of this.operationLog) {
      if (!byType[op.name]) {
        byType[op.name] = { count: 0, totalDuration: 0 };
      }
      byType[op.name].count++;
      byType[op.name].totalDuration += op.duration;
    }

    const total = this.operationLog.length;
    const totalDuration = this.operationLog.reduce((sum, op) => sum + op.duration, 0);

    return {
      total,
      averageDuration: total > 0 ? totalDuration / total : 0,
      byType: Object.fromEntries(
        Object.entries(byType).map(([name, stats]) => [
          name,
          { count: stats.count, avgDuration: stats.totalDuration / stats.count }
        ])
      ),
    };
  }
}

// Singleton instance
export const unifiedCloudflare = new UnifiedCloudflareService();
export default unifiedCloudflare;
