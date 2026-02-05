import config from '../src/config/config-loader';
#!/usr/bin/env bun
// src/storage/r2-apple-manager.ts - STRICT R2 VERSION (Bun 1.3.5 Optimized)
import { join } from 'path';
import { S3Client, write, type S3Options } from 'bun';
import { readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

// Add missing global types for Bun 1.3.5+
declare global {
  var URLPattern: any;
}

export const R2_CONSTANTS = {
  MAX_KEYS: 100,
  ZSTD_LEVEL: 3,
  COMPRESSION_TARGET: 80  // %
} as const;

export const R2_DIRS = {
  APPLE: 'accounts/apple-id/',
  REPORTS: 'reports/',
  FILTERED: 'reports/filtered/',
  FAILED: 'reports/failed/',
  SUCCESS: 'successes/',
  FAILURES: 'failures/',
  LOGS: 'logs/',
  ERRORS: 'errors/',
  TEST: 'test/',
  BULK: 'bulk/',
  SCREENSHOTS: 'screenshots/'
} as const;

const S3_ERROR_MAP: Record<string, string> = {
  'ERR_S3_MISSING_CREDENTIALS': 'R2 Credentials incomplete. Ensure S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY are set.',
  'ERR_S3_INVALID_METHOD': 'Invalid HTTP method requested for R2 operation.',
  'ERR_S3_INVALID_PATH': 'The provided key path is invalid for R2.',
  'ERR_S3_INVALID_ENDPOINT': 'The R2 endpoint URL is malformed or unreachable.',
  'ERR_S3_INVALID_SIGNATURE': 'Signature mismatch. Check your R2 Secret Access Key.',
  'ERR_S3_INVALID_SESSION_TOKEN': 'The provided session token is invalid or expired.'
};

export class BunR2AppleManager {
  private presignedUrls: Record<string, string>;
  private bucket: string;
  private scope: string;
  protected s3: S3Client | null = null;

  // Enhanced proxy configuration for fetch calls
  private getProxyConfig(): any {
    if (!Bun.env.PROXY_URL) return undefined;
    
    return {
      proxy: {
        url: Bun.env.PROXY_URL,
        ...(config.getSecret('proxy').authToken && {
          headers: {
            "Proxy-Authorization": `Bearer ${config.getSecret('proxy').authToken}`,
            ...(Bun.env.PROXY_CUSTOM_HEADERS && JSON.parse(Bun.env.PROXY_CUSTOM_HEADERS))
          }
        })
      }
    };
  }

  public getS3Client(): S3Client | null {
    return this.s3;
  }

  /**
   * Translates a logical key into a scoped storage path
   * e.g., 'reports/file.json' -> 'enterprise/reports/file.json'
   */
  private getScopedKey(key: string): string {
    if (this.scope === 'global') return key;
    if (key.startsWith(this.scope + '/')) return key;
    return `${this.scope}/${key}`;
  }

  public getLocalPath(key: string): string {
    const scopedKey = this.getScopedKey(key);
    const baseDir = join(process.cwd(), 'data');
    return join(baseDir, scopedKey);
  }

  private ensureLocalDir(key: string) {
    const fullPath = this.getLocalPath(key);
    const dir = join(fullPath, '..');
    return fullPath;
  }

  constructor(presignedUrls?: Record<string, string>, bucket?: string, scope?: string) {
    this.presignedUrls = presignedUrls || {};
    this.bucket = bucket || Bun.env.S3_BUCKET || 'apple-ids-bucket';
    this.scope = scope || process.env.DASHBOARD_SCOPE || 'global';
    
    try {
      const s3Config: any = {
        bucket: this.bucket,
        timeout: config.getTimeout('storage'),
        ...(Bun.env.PROXY_URL && {
          proxy: {
            url: Bun.env.PROXY_URL,
            ...(config.getSecret('proxy').authToken && {
              headers: {
                "Proxy-Authorization": `Bearer ${config.getSecret('proxy').authToken}`,
                ...(Bun.env.PROXY_CUSTOM_HEADERS && JSON.parse(Bun.env.PROXY_CUSTOM_HEADERS))
              }
            })
          }
        })
      };

      if (Bun.env.S3_ENDPOINT) s3Config.endpoint = Bun.env.S3_ENDPOINT;
      if (Bun.env.S3_REGION) s3Config.region = Bun.env.S3_REGION;
      if (Bun.env.S3_SESSION_TOKEN) s3Config.sessionToken = Bun.env.S3_SESSION_TOKEN;
      if (Bun.env.S3_ACCESS_KEY_ID) s3Config.accessKeyId = Bun.env.S3_ACCESS_KEY_ID;
      if (config.getSecret('s3').secretAccessKey) s3Config.secretAccessKey = config.getSecret('s3').secretAccessKey;

      this.s3 = new S3Client(s3Config);
    } catch (e) {
      this.handleS3Error(e, 'S3Client Initialization');
    }
  }

  async initialize() {
    console.log(`📡 Preconnecting to R2 Bucket: ${this.bucket} [Scope: ${this.scope}]...`);
    if (Bun.env._WORKER_URL) {
      const isHealthy = await this.validateBucketConnection();
      if (!isHealthy) {
        throw new Error(`CRITICAL: R2 Bucket connection through Worker failed.`);
      }
      console.log(`✅ Verified Active Connection to R2 Bucket.`);
    } else {
      console.log(`✅ Bun R2 initialized: ${this.bucket}`);
    }
    return true;
  }

  async validateBucketConnection(): Promise<boolean> {
    if (!Bun.env._WORKER_URL) return false;
    try {
      const url = new URL(Bun.env._WORKER_URL);
      const healthKey = `health-check-${Bun.randomUUIDv7().slice(0, 8)}.tmp`;
      url.searchParams.set('key', healthKey);
      url.searchParams.set('method', 'GET');
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${Bun.env._UPLOAD_SECRET}` }
      });
      return response.status === HTTP_STATUS.NOT_FOUND || response.ok;
    } catch (e) {
      console.error(`❌ Bucket preconnection failed:`, e);
      return false;
    }
  }

  private handleS3Error(e: any, context: string) {
    if (e && e.name === 'S3Error') {
      console.error(`❌ ${context} - SERVICE ERROR (R2): ${e.message}`);
    } else if (e && e.code && S3_ERROR_MAP[e.code]) {
      console.error(`❌ ${context} - RUNTIME ERROR (Bun): ${S3_ERROR_MAP[e.code]}`);
    } else {
      console.error(`❌ ${context} - UNEXPECTED ERROR: ${e?.message || e}`);
    }
  }

  async getPresignedUrl(key: string, method: 'GET' | 'PUT' | 'DELETE' = 'PUT'): Promise<string> {
    const scopedKey = this.getScopedKey(key);
    const cacheKey = `${scopedKey}:${method}`;
    if (this.presignedUrls[cacheKey]) return this.presignedUrls[cacheKey];

    if (this.s3) {
      try {
        const presignedUrl = this.s3.file(scopedKey).presign({
          method,
          expiresIn: 3600,
          acl: 'private'
        });
        this.presignedUrls[cacheKey] = presignedUrl;
        return presignedUrl;
      } catch (error: any) {
        console.warn(`⚠️ Bun presign failed for ${key}:`, error.message);
      }
    }

    const mockUrl = `https://mock-presign.example.com/${this.bucket}/${encodeURIComponent(scopedKey)}?method=${method}&expires=${Date.now() + 3600000}`;
    this.presignedUrls[cacheKey] = mockUrl;
    return mockUrl;
  }

  private async uploadStream(key: string, data: Uint8Array | string, contentType = 'application/json', contentDisposition?: string): Promise<any> {
    const scopedKey = this.getScopedKey(key);
    try {
      const dataBuffer = typeof data === 'string' ? new TextEncoder().encode(data) : data;
      const compressed = Bun.zstdCompressSync(dataBuffer);
      const originalSize = dataBuffer.length;
      const compressedSize = compressed.length;

      const s3file = this.s3?.file(scopedKey, { 
        ...(contentDisposition && { contentDisposition })
      });

      if (Bun.env._WORKER_URL && Bun.env._UPLOAD_WORKER_URL) {
        const response = await fetch(Bun.env._UPLOAD_WORKER_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Bun.env._UPLOAD_SECRET}`,
            'Content-Type': contentType,
            'Content-Encoding': 'zstd',
            'x-amz-meta-original-size': originalSize.toString(),
            ...(contentDisposition && { 'Content-Disposition': contentDisposition })
          },
          body: compressed as any,
          ...this.getProxyConfig()
        });
        if (response.ok) return { success: true, key: scopedKey, size: compressedSize, originalSize, provider: 'worker' };
      }

      if (s3file) {
        // Bun 1.3.4+ supports native contentDisposition in write()
        await s3file.write(compressed as any, { 
          type: contentType,
          contentDisposition: contentDisposition || 'inline' // Default to inline
        });
        return { success: true, key: scopedKey, size: compressedSize, originalSize, provider: 's3file' };
      }

      const presignUrl = await this.getPresignedUrl(key, 'PUT');
      const response = await fetch(presignUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType, 'Content-Encoding': 'zstd' },
        body: compressed as any,
        ...this.getProxyConfig()
      });
      
      return { success: response.ok, key: scopedKey, size: compressedSize, originalSize };
    } catch (error) {
      console.error(`❌ R2 UPLOAD FAILURE for ${key}:`, error);
      throw error;
    }
  }

  async uploadAppleID(data: unknown, filename: string): Promise<any> {
    const key = `${R2_DIRS.APPLE}${filename}${filename.endsWith('.json') ? '' : '.json'}`;
    const result = await this.uploadStream(key, JSON.stringify(data, null, 2));
    if (result.success) {
      await this.mirrorToLocal(key);
    }
    return result;
  }

  async mirrorToLocal(key: string): Promise<boolean> {
    try {
      if (!this.s3) return false;
      const data = await this.readAsBytes(key);
      const localPath = this.ensureLocalDir(key);
      
      if (key.endsWith('.json')) {
        try {
          const decompressed = Bun.zstdDecompressSync(data);
          const json = JSON.parse(new TextDecoder().decode(decompressed));
          await Bun.write(localPath, JSON.stringify(json, null, 2));
        } catch {
          await Bun.write(localPath, data);
        }
      } else {
        await Bun.write(localPath, data);
      }
      
      console.log(`🪞 Mirrored ${key} to ${localPath} (Decoded)`);
      return true;
    } catch (e) {
      console.warn(`⚠️ Local mirror update failed for ${key}`);
      return false;
    }
  }

  async readAsBytes(key: string): Promise<Uint8Array> {
    if (!this.s3) throw new Error('S3Client not initialized');
    const scopedKey = this.getScopedKey(key);
    return this.s3.file(scopedKey).bytes();
  }

  async readAsText(key: string): Promise<string> {
    if (!this.s3) throw new Error('S3Client not initialized');
    try {
      const localPath = this.getLocalPath(key);
      if (existsSync(localPath)) {
        return await Bun.file(localPath).text();
      }
      
      const bytes = await this.readAsBytes(key);
      let text;
      try {
        const decompressed = Bun.zstdDecompressSync(bytes);
        text = new TextDecoder().decode(decompressed);
      } catch {
        text = new TextDecoder().decode(bytes);
      }
      
      // Mirroring to local for performance consistency with readAsJson
      this.ensureLocalDir(key);
      await Bun.write(localPath, text);
      return text;
    } catch (e: any) {
      this.handleS3Error(e, `readAsText(${key})`);
      throw e;
    }
  }

  async readAsJson(key: string): Promise<any> {
    if (!this.s3) throw new Error('S3Client not initialized');
    try {
      const localPath = this.getLocalPath(key);
      if (existsSync(localPath)) {
        const content = await Bun.file(localPath).text();
        return JSON.parse(content);
      }
      
      const bytes = await this.readAsBytes(key);
      let finalData;
      try {
        const decompressed = Bun.zstdDecompressSync(bytes);
        finalData = JSON.parse(new TextDecoder().decode(decompressed));
      } catch {
        finalData = JSON.parse(new TextDecoder().decode(bytes));
      }
      
      this.ensureLocalDir(key);
      await Bun.write(localPath, JSON.stringify(finalData, null, 2));
      return finalData;
    } catch (e) {
      throw e;
    }
  }

  async deleteFile(key: string): Promise<void> {
    if (!this.s3) throw new Error('S3Client not initialized');
    const scopedKey = this.getScopedKey(key);
    await this.s3.file(scopedKey).delete();
    const localPath = this.getLocalPath(key);
    const file = Bun.file(localPath);
    if (await file.exists()) {
      await Bun.$`rm ${localPath}`;
    }
  }

  /**
   * Health metrics for the storage manager
   */
  async getMetrics() {
    const localRoot = join(process.cwd(), 'data');
    let localFileCount = 0;
    
    const countFiles = async (dir: string) => {
      if (!existsSync(dir)) return;
      const files = await readdir(dir, { withFileTypes: true });
      for (const file of files) {
        if (file.isDirectory()) {
          await countFiles(join(dir, file.name));
        } else {
          localFileCount++;
        }
      }
    };
    
    await countFiles(localRoot);

    return {
      status: this.s3 ? 'online' : 'offline',
      bucket: this.bucket,
      scope: this.scope,
      provider: 'Bun Native S3',
      metrics: {
        localMirroredFiles: localFileCount,
        presignedUrlsCached: Object.keys(this.presignedUrls).length,
        region: Bun.env.S3_REGION || 'auto'
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Downloads a file with Content-Disposition for browser naming
   */
  async downloadWithDisposition(key: string, filename: string) {
    if (!this.s3) throw new Error('S3Client not initialized');
    
    const scopedKey = this.getScopedKey(key);
    // Bun 1.3.4+ supports contentDisposition natively in s3.file()
    const contentDisposition = `attachment; filename="${filename}"`;
    const file = this.s3.file(scopedKey, { contentDisposition });
    const bytes = await file.bytes();
    
    // Special handling for compressed files if needed
    let finalBytes: Uint8Array = bytes;
    if (key.endsWith('.json') || key.endsWith('.csv.zst')) {
      try {
        const decompressed = Bun.zstdDecompressSync(bytes);
        finalBytes = new Uint8Array(decompressed.buffer, decompressed.byteOffset, decompressed.byteLength);
      } catch (e) {
        // Fallback to raw if not compressed
      }
    }

    return new Blob([finalBytes as any], { 
      type: filename.endsWith('.csv') ? 'text/csv' : 'application/json'
    });
  }

  /**
   * Uploads a CSV to R2 with direct download disposition
   */
  async uploadCSV(csvData: string, filename: string): Promise<any> {
    const key = `exports/${filename}${filename.endsWith('.csv') ? '' : '.csv'}`;
    const contentDisposition = `attachment; filename="${filename.endsWith('.csv') ? filename : filename + '.csv'}"`;
    return this.uploadStream(key, csvData, 'text/csv', contentDisposition);
  }

  /**
   * Uploads a screenshot with inline disposition for DuoPlus embeds
   */
  async uploadScreenshot(pngData: Uint8Array, key: string, metadata: unknown = {}): Promise<any> {
    const start = Bun.nanoseconds();
    if (!this.s3) throw new Error('S3Client not initialized');

    const scopedKey = this.getScopedKey(key);
    const s3file = this.s3.file(scopedKey);
    await s3file.write(pngData, {
      type: 'image/png',
      contentDisposition: 'inline; filename="screenshot.png"'
    });

    const timeMs = (Bun.nanoseconds() - start) / 1e6;
    
    // Construct the public URL for R2 if endpoint is provided
    const endpoint = Bun.env.S3_ENDPOINT || '';
    let embedUrl = '';
    if (process.env.PRODUCTION_SIM === '1') {
      embedUrl = `https://sim.r2.dev/${scopedKey}`;
    } else {
      embedUrl = endpoint.includes('r2.cloudflarestorage.com') 
        ? `https://${this.bucket}.${endpoint.split('//')[1]}/${scopedKey}`
        : `${endpoint}/${this.bucket}/${scopedKey}`;
    }

    return {
      success: true, 
      key: scopedKey, 
      timeMs, 
      embedUrl,
      size: pngData.length 
    };
  }

  /**
   * Saves data to local workspace data mirror
   */
  public async saveLocal(data: any, filename: string): Promise<string> {
    const key = `${R2_DIRS.TEST}${filename}`;
    const localPath = this.getLocalPath(key);
    this.ensureLocalDir(key);
    await Bun.write(localPath, JSON.stringify(data, null, 2));
    console.log(`💾 Saved ${filename} to local mirror: ${localPath}`);
    return localPath;
  }

  /**
   * Performs a comprehensive lifecycle audit of the storage system
   */
  public async performLifecycleAudit(): Promise<boolean> {
    console.log('🔍 Starting Storage Lifecycle Audit...');
    const metrics = await this.getMetrics();
    console.log(`📊 Current Status: ${metrics.status} [Scope: ${metrics.scope}]`);
    
    try {
      // Test basic connectivity if S3 is online
      if (this.s3) {
        const testKey = `${R2_DIRS.TEST}audit-${Date.now()}.json`;
        await this.uploadStream(testKey, JSON.stringify({ audit: true, time: new Date().toISOString() }));
        await this.deleteFile(testKey);
        console.log('✅ S3 Write/Delete lifecycle verified');
      }
      return true;
    } catch (e) {
      console.error('❌ Lifecycle Audit Failed:', e);
      return false;
    }
  }

  /**
   * Displays storage statistics and metrics
   */
  public async getStorageStats(): Promise<void> {
    const metrics = await this.getMetrics();
    console.log('\n--- Storage Stats ---');
    console.log(`Bucket: ${metrics.bucket}`);
    console.log(`Status: ${metrics.status}`);
    console.log(`Local Files: ${metrics.metrics.localMirroredFiles}`);
    console.log(`----------------------\n`);
  }

  /**
   * Lists recent objects from a specific directory in R2
   */
  async listRecent(prefix: string, limit = 20) {
    if (!this.s3) throw new Error('S3Client not initialized');
    
    // Note: Bun's S3Client currently doesn't have a high-level list() method in the same way 
    // it has .file(). We'll need to use standard S3 listing if available or fall back.
    // For now, we'll list the local mirror which is synced.
    const localDir = join(process.cwd(), 'data', prefix);
    if (!existsSync(localDir)) return [];

    const files = (await readdir(localDir, { withFileTypes: true }))
      .filter(f => !f.isDirectory())
      .map(f => ({
        key: join(prefix, f.name),
        name: f.name,
        lastModified: new Date().toISOString() // Placeholder as fs stats are slower
      }))
      .slice(0, limit);

    return files;
  }

  /**
   * Generates demo metadata with high-accuracy Unicode and ANSI hyperlinks.
   * Empire-perfect for dashboard inline previews.
   */
  generateDemoMetadata() {
    const publicDomain = Bun.env.R2_PUBLIC_DOMAIN || 'https://pub-295f9061822d480cbe2b81318d88d774.r2.dev';
    return {
      emoji_preview: '🖼️🇺🇸',  // Perfect width (2+2=4)
      zero_width_test: '\u2060',  // Invisible OK (width 0)
      ansi_hyperlink: `\u001b]8;;${publicDomain}\u001b\\Click to R2\u001b[0m`, // OSC 8 width=11
      perf_gain: '3428.0%',
      status: '🚀 LIVE'
    };
  }
}
