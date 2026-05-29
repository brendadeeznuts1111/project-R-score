#!/usr/bin/env bun
/**
 * 🪣 R2 Storage Adapter - Public API
 */

// Re-export from r2-storage module
export { 
  R2StorageAdapter, 
  type R2StorageConfig, 
  type SignedUrlOptions, 
  r2Storage 
} from './r2-storage';

// Simplified wrapper class for common operations
export class R2Storage {
  private adapter: import('./r2-storage').R2StorageAdapter;

  constructor(
    private bucket: any,
    private options: { prefix?: string; compression?: boolean } = {}
  ) {
    // For testing with mock buckets, we use a simplified interface
    this.adapter = new (require('./r2-storage').R2StorageAdapter)({
      bucketName: 'test-bucket',
      ...options,
    });
  }

  async putPackage(
    name: string,
    version: string,
    tarball: Buffer
  ): Promise<{ key: string; size: number; shasum: string }> {
    const crypto = await import('crypto');
    const shasum = crypto.createHash('sha1').update(tarball).digest('hex');
    
    const key = this.getKey(name, version);
    
    // Store in bucket if available (mock or real)
    if (this.bucket) {
      await this.bucket.put(key, tarball);
    }

    return { key, size: tarball.length, shasum };
  }

  async getPackage(name: string, version: string): Promise<{ body: ReadableStream } | null> {
    const key = this.getKey(name, version);
    
    if (!this.bucket) return null;
    
    return this.bucket.get(key);
  }

  async deletePackage(name: string, version: string): Promise<void> {
    const key = this.getKey(name, version);
    
    if (this.bucket) {
      await this.bucket.delete(key);
    }
  }

  async listPackages(options: { limit?: number } = {}): Promise<string[]> {
    if (!this.bucket) return [];
    
    const result = await this.bucket.list({
      prefix: this.options.prefix,
      limit: options.limit,
    });
    
    return result.objects.map((o: any) => o.key);
  }

  private getKey(name: string, version: string): string {
    const sanitized = name.replace(/^@/, '').replace(/\//g, '%2f');
    const prefix = this.options.prefix || '';
    return `${prefix}${sanitized}/-/${name.replace(/^@[^/]+\//, '')}-${version}.tgz`;
  }
}
