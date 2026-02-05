#!/usr/bin/env bun
// mcp-tools/asset-server.ts - Production asset server with integrity checks

import manifestJson from "./dist/manifest.json" with { type: "json" };
import { join } from "path";

interface AssetEntry {
  path: string;
  hash: string;
  size: number;
  type: string;
  lastModified: string;
}

interface AssetManifest {
  generated: string;
  version: string;
  assets: AssetEntry[];
}

interface AssetServerConfig {
  port?: number;
  development?: boolean;
  cacheControl?: {
    maxAge: number;
    immutable: boolean;
  };
  headers?: Record<string, string>;
}

export class AssetServer {
  private config: Required<AssetServerConfig>;
  private manifest: AssetEntry[];
  private server: any;
  private integrityCache = new Map<string, Promise<boolean>>();

  constructor(config: AssetServerConfig = {}) {
    this.config = {
      port: this.validatePort(config.port || 3000),
      development: config.development || false,
      cacheControl: {
        maxAge: config.cacheControl?.maxAge || 31536000, // 1 year
        immutable: config.cacheControl?.immutable ?? true,
      },
      headers: {
        'Server': 'Tier-1380-Asset-Server/1.0',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        ...config.headers
      }
    };

    // Load and validate manifest
    this.manifest = this.validateManifest(manifestJson);

    console.log(`🚀 Asset Server initialized`);
    console.log(`📦 Serving ${this.manifest.length} assets from manifest`);
    console.log(`🔐 Integrity checks: ${this.config.cacheControl.immutable ? 'ENABLED' : 'DISABLED'}`);
  }

  private validatePort(port: number): number {
    if (isNaN(port) || port < 1 || port > 65535) {
      throw new Error(`Invalid port: ${port}. Port must be between 1 and 65535`);
    }
    return port;
  }

  private validateManifest(manifest: AssetManifest): AssetEntry[] {
    if (!manifest.assets || !Array.isArray(manifest.assets)) {
      throw new Error('Manifest must contain an assets array');
    }

    return manifest.assets.map((entry, index) => {
      if (!entry.path || !entry.hash) {
        throw new Error(`Invalid manifest entry at index ${index}: missing path or hash`);
      }

      return {
        path: entry.path,
        hash: entry.hash,
        size: entry.size || 0,
        type: entry.type || this.getMimeType(entry.path),
        lastModified: entry.lastModified || new Date().toISOString()
      };
    });
  }

  private getMimeType(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      'html': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      'json': 'application/json',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'ico': 'image/x-icon',
      'woff': 'font/woff',
      'woff2': 'font/woff2',
      'ttf': 'font/ttf',
      'eot': 'application/vnd.ms-fontobject'
    };

    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  private findAsset(url: URL): AssetEntry | null {
    // Try exact path match first
    const pathMatch = this.manifest.find(asset =>
      url.pathname === '/' + asset.path
    );

    if (pathMatch) {
      return pathMatch;
    }

    // Try hash match (for cache-busted URLs) - SECURITY: exact match only
    const hashMatch = this.manifest.find(asset => {
      // Only match if hash appears as filename or in hash-based URL pattern
      const hashPattern = new RegExp(`(^|/)${asset.hash}(\\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|ico)?$)`);
      return hashPattern.test(url.pathname);
    });

    if (hashMatch) {
      return hashMatch;
    }

    // Fallback to filename matching (for development)
    if (this.config.development) {
      const filename = url.pathname.split('/').pop();
      const match = this.manifest.find(asset =>
        asset.path.endsWith('/' + filename)
      );
      return match || null; // Convert undefined to null
    }

    return null;
  }

  private async verifyIntegrityCached(asset: AssetEntry, file: any): Promise<boolean> {
    // Use cached promise to prevent race conditions
    if (this.integrityCache.has(asset.hash)) {
      return this.integrityCache.get(asset.hash)!;
    }

    const promise = this.verifyIntegrity(asset, file);
    this.integrityCache.set(asset.hash, promise);

    // Clear cache after completion (success or failure)
    promise.finally(() => {
      setTimeout(() => this.integrityCache.delete(asset.hash), 5000);
    });

    return promise;
  }

  private async verifyIntegrity(asset: AssetEntry, file: any): Promise<boolean> {
    try {
      const buffer = await file.arrayBuffer();
      const hash = await crypto.subtle.digest('SHA-256', buffer);
      const hashHex = Buffer.from(hash).toString('hex'); // EFFICIENT: use Buffer

      // Compare hashes (case-insensitive)
      return hashHex.toLowerCase() === asset.hash.toLowerCase();
    } catch (error) {
      console.error(`❌ Integrity verification failed for ${asset.path}:`, error);
      return false;
    }
  }

  private parseETags(etagHeader: string): string[] {
    // Parse ETag header, handling multiple ETags and W/ prefixes
    return etagHeader.split(',').map(tag => {
      const trimmed = tag.trim();
      // Remove W/ prefix if present and unquote
      return trimmed.startsWith('W/') ? trimmed.slice(2) : trimmed;
    }).filter(tag => tag.length > 0);
  }

  private buildCacheHeaders(asset: AssetEntry): Record<string, string> {
    const headers: Record<string, string> = {};

    if (this.config.cacheControl.immutable) {
      const maxAge = this.config.cacheControl.maxAge;
      headers['Cache-Control'] = `public, max-age=${maxAge}, immutable`;
    } else {
      headers['Cache-Control'] = 'public, max-age=3600'; // 1 hour for mutable assets
    }

    // Add integrity header for client verification
    headers['X-Content-SHA256'] = asset.hash;

    // Add ETag for conditional requests
    headers['ETag'] = `"${asset.hash}"`;

    // Add content type
    headers['Content-Type'] = asset.type;

    // Add last modified
    headers['Last-Modified'] = new Date(asset.lastModified).toUTCString();

    return headers;
  }

  private async handleAssetRequest(asset: AssetEntry, url: URL, req: Request): Promise<Response> {
    try {
      const filePath = join('./dist', asset.path);
      const file = Bun.file(filePath);

      // Verify file exists
      if (!(await file.exists())) {
        console.warn(`⚠️ Asset file not found: ${filePath}`);
        return new Response('Asset not found', { status: 404 });
      }

      // Verify integrity in production (with caching to prevent race conditions)
      if (!this.config.development && this.config.cacheControl.immutable) {
        const isValid = await this.verifyIntegrityCached(asset, file);
        if (!isValid) {
          console.error(`❌ Integrity check failed for ${asset.path}`);
          return new Response('Asset integrity verification failed', { status: 500 });
        }
      }

      // Build headers
      const headers = {
        ...this.buildCacheHeaders(asset),
        ...this.config.headers
      };

      // Check for conditional request (proper HTTP header parsing)
      const ifNoneMatch = req.headers.get('if-none-match');
      const ifModifiedSince = req.headers.get('if-modified-since');

      if (ifNoneMatch && this.parseETags(ifNoneMatch).includes(`"${asset.hash}"`)) {
        return new Response(null, {
          status: 304,
          headers: {
            ...headers,
            'Content-Length': '0'
          }
        });
      }

      // Serve the file
      return new Response(file, {
        status: 200,
        headers: {
          ...headers,
          'Content-Length': file.size.toString()
        }
      });

    } catch (error) {
      console.error(`❌ Error serving asset ${asset.path}:`, error);
      return new Response('Internal server error', { status: 500 });
    }
  }

  private async handleRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);

    // Log requests in development
    if (this.config.development) {
      console.log(`📡 ${req.method} ${url.pathname}`);
    }

    // Handle health check
    if (url.pathname === '/health') {
      return Response.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        assets: this.manifest.length,
        server: 'Tier-1380-Asset-Server'
      });
    }

    // Handle manifest endpoint
    if (url.pathname === '/manifest.json') {
      return Response.json(manifestJson, {
        headers: {
          'Cache-Control': 'public, max-age=300', // 5 minutes for manifest
          'Content-Type': 'application/json'
        }
      });
    }

    // Find asset in manifest
    const asset = this.findAsset(url);

    if (asset) {
      return await this.handleAssetRequest(asset, url, req);
    }

    // Handle SPA fallback (serve index.html for non-asset routes)
    const indexAsset = this.manifest.find(a => a.path.endsWith('index.html'));
    if (indexAsset && !url.pathname.includes('.')) {
      console.log(`🔄 SPA fallback: serving index.html for ${url.pathname}`);
      return await this.handleAssetRequest(indexAsset, url, req);
    }

    // Asset not found
    return new Response('Asset not found', {
      status: 404,
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=300'
      }
    });
  }

  public start(): void {
    this.server = Bun.serve({
      port: this.config.port,
      fetch: (req) => this.handleRequest(req),
      error(error) {
        console.error('❌ Asset server error:', error);
        return new Response('Internal server error', { status: 500 });
      }
    });

    console.log(`🚀 Asset server running on port ${this.config.port}`);
    console.log(`📊 Health check: http://localhost:${this.config.port}/health`);
    console.log(`📋 Manifest: http://localhost:${this.config.port}/manifest.json`);

    if (this.config.development) {
      console.log(`🔧 Development mode: SPA fallback enabled`);
    }
  }

  public stop(): void {
    if (this.server) {
      this.server.stop();
      console.log('👋 Asset server stopped');
    }
  }

  public getStats(): {
    totalAssets: number;
    totalSize: number;
    assetTypes: Record<string, number>;
  } {
    const totalSize = this.manifest.reduce((sum, asset) => sum + asset.size, 0);
    const assetTypes: Record<string, number> = {};

    this.manifest.forEach(asset => {
      const ext = asset.path.split('.').pop()?.toLowerCase() || 'unknown';
      assetTypes[ext] = (assetTypes[ext] || 0) + 1;
    });

    return {
      totalAssets: this.manifest.length,
      totalSize,
      assetTypes
    };
  }
}

// CLI usage
if (import.meta.main) {
  const config: AssetServerConfig = {
    port: parseInt(process.env.ASSET_PORT || '3000'),
    development: process.env.NODE_ENV === 'development',
    cacheControl: {
      maxAge: process.env.NODE_ENV === 'development' ? 0 : 31536000,
      immutable: process.env.NODE_ENV !== 'development'
    }
  };

  try {
    const server = new AssetServer(config);

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n👋 Shutting down asset server...');
      server.stop();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\n👋 Shutting down asset server...');
      server.stop();
      process.exit(0);
    });

    // Start server
    server.start();

    // Show stats
    const stats = server.getStats();
    console.log(`📊 Asset Statistics:`);
    console.log(`  Total assets: ${stats.totalAssets}`);
    console.log(`  Total size: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Asset types:`, Object.entries(stats.assetTypes).map(([type, count]) => `${type} (${count})`).join(', '));

  } catch (error) {
    console.error('❌ Failed to start asset server:', error);
    process.exit(1);
  }
}

export default AssetServer;
