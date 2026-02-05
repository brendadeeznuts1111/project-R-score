#!/usr/bin/env bun
/**
 * 🪣 R2 Storage Adapter for NPM Registry (Bun v1.3.7+ Optimized)
 * 
 * Handles package storage, retrieval, and metadata management in Cloudflare R2
 * Leverages Bun v1.3.7 features: contentEncoding, signed URLs, header preservation
 */

import { styled, FW_COLORS } from '../theme/colors';
import type { 
  PackageManifest, 
  PackageVersion, 
  RegistryStats,
  PackageStats 
} from './registry-types';

export interface R2StorageConfig {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  endpoint?: string;
  prefix?: string;
  compression?: 'gzip' | 'br' | 'deflate' | null;
}

export interface SignedUrlOptions {
  expiresIn?: number; // seconds
  contentDisposition?: string; // e.g., 'attachment; filename="package.tgz"'
  contentType?: string;
  responseContentDisposition?: string; // Bun v1.3.7: for presigned URLs
  responseContentType?: string; // Bun v1.3.7: for presigned URLs
}

export class R2StorageAdapter {
  private config: R2StorageConfig;
  private baseUrl: string;
  private publicUrl: string;

  constructor(config: Partial<R2StorageConfig> = {}) {
    this.config = {
      accountId: config.accountId || process.env.R2_ACCOUNT_ID || '',
      accessKeyId: config.accessKeyId || process.env.R2_ACCESS_KEY_ID || '',
      secretAccessKey: config.secretAccessKey || process.env.R2_SECRET_ACCESS_KEY || '',
      bucketName: config.bucketName || process.env.R2_REGISTRY_BUCKET || 'npm-registry',
      endpoint: config.endpoint || process.env.R2_ENDPOINT,
      prefix: config.prefix || 'packages/',
      compression: config.compression || null,
    };

    this.baseUrl = this.config.endpoint || 
      `https://${this.config.accountId}.r2.cloudflarestorage.com`;
    this.publicUrl = `https://pub-${this.config.accountId}.r2.dev`;
  }

  /**
   * Get the key prefix for a package
   */
  private getPackagePrefix(packageName: string): string {
    // Handle scoped packages (@scope/name)
    const sanitized = packageName.replace(/^@/, '').replace(/\//g, '%2f');
    return `${this.config.prefix}${sanitized}/`;
  }

  /**
   * Get manifest key for a package
   */
  private getManifestKey(packageName: string): string {
    return `${this.getPackagePrefix(packageName)}manifest.json`;
  }

  /**
   * Get tarball key for a package version
   */
  private getTarballKey(packageName: string, version: string): string {
    return `${this.getPackagePrefix(packageName)}${packageName.replace(/^@[^/]+\//, '')}-${version}.tgz`;
  }

  /**
   * Store package manifest in R2
   */
  async storeManifest(manifest: PackageManifest): Promise<void> {
    const key = this.getManifestKey(manifest.name);
    
    try {
      const body = JSON.stringify(manifest, null, 2);
      const headers: Record<string, string> = {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json',
        'x-amz-meta-modified': new Date().toISOString(),
      };

      // Bun v1.3.7: Support contentEncoding for compression
      if (this.config.compression) {
        headers['Content-Encoding'] = this.config.compression;
      }

      const response = await fetch(`${this.baseUrl}/${this.config.bucketName}/${key}`, {
        method: 'PUT',
        headers,
        body,
      });

      if (!response.ok) {
        throw new Error(`Failed to store manifest: ${response.status} ${response.statusText}`);
      }

      console.log(styled(`✅ Stored manifest: ${manifest.name}`, 'success'));
    } catch (error) {
      console.error(styled(`❌ Failed to store manifest: ${error.message}`, 'error'));
      throw error;
    }
  }

  /**
   * Retrieve package manifest from R2
   */
  async getManifest(packageName: string): Promise<PackageManifest | null> {
    const key = this.getManifestKey(packageName);
    
    try {
      // Bun v1.3.7: Headers are preserved with original casing
      const response = await fetch(`${this.baseUrl}/${this.config.bucketName}/${key}`, {
        headers: {
          'Authorization': this.getAuthHeader(),
          'Accept': 'application/json',
        },
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Failed to get manifest: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error.message.includes('404')) {
        return null;
      }
      console.error(styled(`❌ Failed to get manifest: ${error.message}`, 'error'));
      throw error;
    }
  }

  /**
   * Store package tarball in R2 with optional compression
   */
  async storeTarball(
    packageName: string, 
    version: string, 
    data: Buffer | Uint8Array,
    options: {
      compress?: boolean;
      contentEncoding?: 'gzip' | 'br' | 'deflate';
    } = {}
  ): Promise<{ url: string; size: number; compressed?: boolean }> {
    const key = this.getTarballKey(packageName, version);
    
    try {
      // Bun v1.3.7: Support contentEncoding for compression
      let body: Buffer | Uint8Array = data;
      const headers: Record<string, string> = {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/octet-stream',
        'Content-Length': data.length.toString(),
        'x-amz-meta-package': packageName,
        'x-amz-meta-version': version,
        // Bun v1.3.7: Preserve header casing for metadata
        'x-amz-meta-Original-Size': data.length.toString(),
      };

      // Apply compression if requested
      if (options.compress || this.config.compression) {
        const encoding = options.contentEncoding || this.config.compression;
        if (encoding) {
          headers['Content-Encoding'] = encoding;
          // Note: Actual compression would happen here with zlib/brotli
          // For now, we just set the header
        }
      }

      const response = await fetch(`${this.baseUrl}/${this.config.bucketName}/${key}`, {
        method: 'PUT',
        headers,
        body,
      });

      if (!response.ok) {
        throw new Error(`Failed to store tarball: ${response.status} ${response.statusText}`);
      }

      const url = `${this.publicUrl}/${this.config.bucketName}/${key}`;
      console.log(styled(`✅ Stored tarball: ${key} (${(data.length / 1024).toFixed(2)} KB)`, 'success'));
      
      return { 
        url, 
        size: data.length,
        compressed: !!headers['Content-Encoding'],
      };
    } catch (error) {
      console.error(styled(`❌ Failed to store tarball: ${error.message}`, 'error'));
      throw error;
    }
  }

  /**
   * Get tarball URL (public or signed)
   * Bun v1.3.7: Enhanced signed URL support with contentDisposition
   */
  async getTarballUrl(
    packageName: string, 
    version: string,
    options: SignedUrlOptions = {}
  ): Promise<string> {
    const key = this.getTarballKey(packageName, version);
    
    if (!options.expiresIn) {
      return `${this.publicUrl}/${this.config.bucketName}/${key}`;
    }

    // Generate signed URL with Bun v1.3.7 options
    return this.generateSignedUrl(key, options);
  }

  /**
   * Generate signed URL for private access
   * Bun v1.3.7: Supports contentDisposition and type options for presigned URLs
   */
  private async generateSignedUrl(key: string, options: SignedUrlOptions): Promise<string> {
    const expiresIn = options.expiresIn || 3600;
    const expiry = Math.floor(Date.now() / 1000) + expiresIn;
    
    const url = new URL(`${this.baseUrl}/${this.config.bucketName}/${key}`);
    
    // Add query parameters for signed URL
    url.searchParams.set('X-Amz-Expires', expiresIn.toString());
    url.searchParams.set('X-Amz-Date', new Date().toISOString().replace(/[:\-]|\.\d{3}/g, ''));
    
    // Bun v1.3.7: Support response-content-disposition for downloads
    if (options.responseContentDisposition || options.contentDisposition) {
      url.searchParams.set(
        'response-content-disposition', 
        options.responseContentDisposition || options.contentDisposition!
      );
    }
    
    // Bun v1.3.7: Support response-content-type
    if (options.responseContentType || options.contentType) {
      url.searchParams.set(
        'response-content-type',
        options.responseContentType || options.contentType!
      );
    }
    
    // Note: In production, you'd sign this URL with AWS Signature V4
    // For now, return with expiry parameter
    return `${this.publicUrl}/${this.config.bucketName}/${key}?Expires=${expiry}`;
  }

  /**
   * Delete a specific package version
   */
  async deleteVersion(packageName: string, version: string): Promise<void> {
    const manifestKey = this.getManifestKey(packageName);
    const tarballKey = this.getTarballKey(packageName, version);
    
    try {
      // Delete tarball
      await fetch(`${this.baseUrl}/${this.config.bucketName}/${tarballKey}`, {
        method: 'DELETE',
        headers: {
          'Authorization': this.getAuthHeader(),
        },
      });

      // Update manifest
      const manifest = await this.getManifest(packageName);
      if (manifest) {
        delete manifest.versions[version];
        delete manifest.time?.[version];
        
        // Update dist-tags if needed
        for (const [tag, tagVersion] of Object.entries(manifest['dist-tags'])) {
          if (tagVersion === version) {
            delete manifest['dist-tags'][tag];
          }
        }

        await this.storeManifest(manifest);
      }

      console.log(styled(`✅ Deleted version: ${packageName}@${version}`, 'success'));
    } catch (error) {
      console.error(styled(`❌ Failed to delete version: ${error.message}`, 'error'));
      throw error;
    }
  }

  /**
   * Delete entire package
   */
  async deletePackage(packageName: string): Promise<void> {
    const prefix = this.getPackagePrefix(packageName);
    
    try {
      // List and delete all objects with this prefix
      const listResponse = await fetch(
        `${this.baseUrl}/${this.config.bucketName}?list-type=2&prefix=${encodeURIComponent(prefix)}`,
        {
          headers: {
            'Authorization': this.getAuthHeader(),
          },
        }
      );

      if (!listResponse.ok) {
        throw new Error(`Failed to list package objects: ${listResponse.status}`);
      }

      // Parse XML response and delete each object
      const xml = await listResponse.text();
      const keys = this.parseObjectKeys(xml);

      for (const key of keys) {
        await fetch(`${this.baseUrl}/${this.config.bucketName}/${key}`, {
          method: 'DELETE',
          headers: {
            'Authorization': this.getAuthHeader(),
          },
        });
      }

      console.log(styled(`✅ Deleted package: ${packageName}`, 'success'));
    } catch (error) {
      console.error(styled(`❌ Failed to delete package: ${error.message}`, 'error'));
      throw error;
    }
  }

  /**
   * List all packages in registry
   */
  async listPackages(): Promise<string[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/${this.config.bucketName}?list-type=2&prefix=${this.config.prefix}&delimiter=/`,
        {
          headers: {
            'Authorization': this.getAuthHeader(),
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to list packages: ${response.status}`);
      }

      const xml = await response.text();
      return this.parseCommonPrefixes(xml);
    } catch (error) {
      console.error(styled(`❌ Failed to list packages: ${error.message}`, 'error'));
      return [];
    }
  }

  /**
   * Get registry statistics
   */
  async getStats(): Promise<RegistryStats> {
    try {
      const packages = await this.listPackages();
      let totalVersions = 0;
      let totalSize = 0;

      for (const pkg of packages) {
        const manifest = await this.getManifest(pkg);
        if (manifest) {
          totalVersions += Object.keys(manifest.versions).length;
        }
      }

      return {
        packages: packages.length,
        versions: totalVersions,
        totalSize,
        downloads24h: 0, // Would need analytics
        downloads30d: 0,
      };
    } catch (error) {
      console.error(styled(`❌ Failed to get stats: ${error.message}`, 'error'));
      return {
        packages: 0,
        versions: 0,
        totalSize: 0,
        downloads24h: 0,
        downloads30d: 0,
      };
    }
  }

  /**
   * Check if a package version exists
   */
  async exists(packageName: string, version?: string): Promise<boolean> {
    const manifest = await this.getManifest(packageName);
    if (!manifest) return false;
    if (!version) return true;
    return version in manifest.versions;
  }

  /**
   * Get package stats
   */
  async getPackageStats(packageName: string): Promise<PackageStats | null> {
    const manifest = await this.getManifest(packageName);
    if (!manifest) return null;

    return {
      name: packageName,
      versionCount: Object.keys(manifest.versions).length,
      totalDownloads: 0, // Would need analytics
      lastPublished: manifest.time?.modified || new Date().toISOString(),
      size: 0, // Would need to calculate
    };
  }

  /**
   * Generate S3-compatible Authorization header
   * Bun v1.3.7: Headers preserve original casing
   */
  private getAuthHeader(): string {
    // Basic auth for development (implement AWS Signature V4 for production)
    const credentials = btoa(`${this.config.accessKeyId}:${this.config.secretAccessKey}`);
    return `Basic ${credentials}`;
  }

  /**
   * Parse object keys from S3 ListObjects response
   */
  private parseObjectKeys(xml: string): string[] {
    const keys: string[] = [];
    const regex = /<Key>([^<]+)<\/Key>/g;
    let match;
    while ((match = regex.exec(xml)) !== null) {
      keys.push(match[1]);
    }
    return keys;
  }

  /**
   * Parse CommonPrefixes (folders) from S3 ListObjects response
   */
  private parseCommonPrefixes(xml: string): string[] {
    const prefixes: string[] = [];
    const regex = /<CommonPrefixes><Prefix>([^<]+)<\/Prefix><\/CommonPrefixes>/g;
    let match;
    while ((match = regex.exec(xml)) !== null) {
      // Extract package name from prefix
      const prefix = match[1];
      const pkgName = prefix
        .replace(this.config.prefix || '', '')
        .replace(/\/$/, '')
        .replace(/%2f/g, '/');
      if (pkgName) prefixes.push(pkgName);
    }
    return prefixes;
  }

  /**
   * Test R2 connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/${this.config.bucketName}?list-type=2&max-keys=1`, {
        headers: {
          'Authorization': this.getAuthHeader(),
        },
      });

      return response.ok;
    } catch (error) {
      console.error(styled(`❌ Connection test failed: ${error.message}`, 'error'));
      return false;
    }
  }

  /**
   * Get configuration status
   */
  getConfigStatus(): { 
    configured: boolean; 
    missing: string[]; 
    bucket: string;
    compression?: string | null;
  } {
    const missing: string[] = [];
    if (!this.config.accountId) missing.push('R2_ACCOUNT_ID');
    if (!this.config.accessKeyId) missing.push('R2_ACCESS_KEY_ID');
    if (!this.config.secretAccessKey) missing.push('R2_SECRET_ACCESS_KEY');

    return {
      configured: missing.length === 0,
      missing,
      bucket: this.config.bucketName,
      compression: this.config.compression,
    };
  }
}

// Export singleton instance
export const r2Storage = new R2StorageAdapter();

// CLI interface
if (import.meta.main) {
  const storage = new R2StorageAdapter();
  
  console.log(styled('🪣 R2 Storage Adapter Test (Bun v1.3.7+)', 'accent'));
  console.log(styled('=========================================', 'accent'));
  
  const status = storage.getConfigStatus();
  console.log(styled(`\nConfiguration:`, 'info'));
  console.log(styled(`  Bucket: ${status.bucket}`, 'muted'));
  console.log(styled(`  Compression: ${status.compression || 'none'}`, 'muted'));
  console.log(styled(`  Configured: ${status.configured ? '✅' : '❌'}`, status.configured ? 'success' : 'error'));
  
  if (status.missing.length > 0) {
    console.log(styled(`\nMissing:`, 'warning'));
    status.missing.forEach(v => console.log(styled(`  - ${v}`, 'warning')));
  } else {
    console.log(styled(`\nTesting connection...`, 'info'));
    const connected = await storage.testConnection();
    console.log(styled(`  Connection: ${connected ? '✅ OK' : '❌ Failed'}`, connected ? 'success' : 'error'));
  }
}
