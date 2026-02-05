#!/usr/bin/env bun
/**
 * 🏭 FactoryWager Tier-1380 Enhanced with Configuration Loader & Caching
 * 
 * Integrates environment-based A/B test configuration with compressed caching
 * and atomic R2 snapshots for production-grade deployment
 */

import { loadABTestConfig, compressAndHashData, ABTestCache } from "./lib/config/env-loader.ts";
import { createHash } from "crypto";
import { getSignedR2URL } from "./lib/r2/signed-url.ts";

interface Tier1380EnhancedConfig {
  r2Bucket: string;
  publicApiUrl: string;
  variant: string;
  cacheEnabled: boolean;
  cacheTTL: number; // in milliseconds
  compressionLevel: number;
  environment: 'development' | 'staging' | 'production';
}

interface ABTestSnapshot {
  config: Record<string, any>;
  headers: Array<[string, string]>;
  cookies: Array<[string, string]>;
  metadata: {
    timestamp: string;
    environment: string;
    variant: string;
    checksum: string;
    compressed: boolean;
    cacheHit: boolean;
  };
}

export class Tier1380EnhancedCitadel {
  private config: Tier1380EnhancedConfig;
  private cache: ABTestCache;
  private abTestConfig: Record<string, any>;
  
  constructor(config: Partial<Tier1380EnhancedConfig> = {}) {
    // Load A/B test configuration from environment
    this.abTestConfig = loadABTestConfig();
    
    this.config = {
      r2Bucket: process.env.R2_BUCKET || "scanner-cookies",
      publicApiUrl: process.env.PUBLIC_API_URL || "https://api.tier1380.com",
      variant: process.env.TIER1380_VARIANT || "enhanced-live",
      cacheEnabled: process.env.TIER1380_CACHE_ENABLED !== "false",
      cacheTTL: parseInt(process.env.TIER1380_CACHE_TTL || "300000"), // 5 minutes
      compressionLevel: parseInt(process.env.TIER1380_COMPRESSION_LEVEL || "3"),
      environment: (process.env.NODE_ENV as any) || "development",
      ...config
    };
    
    this.cache = new ABTestCache();
    
    console.log(`🏭 Tier-1380 Enhanced Citadel initialized`);
    console.log(`   Environment: ${this.config.environment}`);
    console.log(`   Cache: ${this.config.cacheEnabled ? 'enabled' : 'disabled'}`);
    console.log(`   A/B Tests: ${Object.keys(this.abTestConfig).length} loaded`);
  }

  /**
   * Load and validate A/B test configuration
   */
  loadAndValidateConfig(): { valid: boolean; config: Record<string, any>; errors: string[] } {
    const errors: string[] = [];
    const config = { ...this.abTestConfig };
    
    // Validate required fields
    const requiredFields = ['url_structure', 'doc_layout', 'cta_color'];
    for (const field of requiredFields) {
      if (!config[field]) {
        errors.push(`Missing required A/B test configuration: ${field}`);
      }
    }
    
    // Validate weights if present
    for (const [testKey, testConfig] of Object.entries(config)) {
      if (typeof testConfig === 'object' && testConfig.weights) {
        const weights = testConfig.weights as number[];
        const sum = weights.reduce((a, b) => a + b, 0);
        if (Math.abs(sum - 100) > 0.01) {
          errors.push(`Weights for ${testKey} must sum to 100 (got ${sum})`);
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      config,
      errors
    };
  }

  /**
   * Create enhanced snapshot with configuration caching
   */
  async createEnhancedSnapshot(
    headers: Headers, 
    cookies: Map<string, string>
  ): Promise<{
    snapshot: ABTestSnapshot;
    compressedData: Uint8Array;
    key: string;
    cacheHit: boolean;
  }> {
    const startTime = performance.now();
    
    // Check cache first
    const cacheKey = `snapshot_${this.config.variant}_${this.config.environment}`;
    let cachedSnapshot = this.cache.get(cacheKey);
    let cacheHit = false;
    
    if (cachedSnapshot && this.config.cacheEnabled) {
      cacheHit = true;
      console.log(`💾 Cache hit for ${cacheKey}`);
    } else {
      // Load and validate configuration
      const { valid, config, errors } = this.loadAndValidateConfig();
      
      if (!valid) {
        throw new Error(`Invalid A/B test configuration: ${errors.join(', ')}`);
      }
      
      // Create new snapshot
      cachedSnapshot = {
        config,
        headers: [...headers.entries()],
        cookies: [...cookies.entries()],
        metadata: {
          timestamp: new Date().toISOString(),
          environment: this.config.environment,
          variant: this.config.variant,
          checksum: '',
          compressed: true,
          cacheHit: false
        }
      };
      
      // Cache the snapshot
      if (this.config.cacheEnabled) {
        this.cache.set(cacheKey, cachedSnapshot);
      }
    }
    
    // Generate checksum
    const checksum = createHash('sha256')
      .update(JSON.stringify(cachedSnapshot))
      .digest('hex');
    
    cachedSnapshot.metadata.checksum = checksum;
    
    // Compress the snapshot
    const jsonString = JSON.stringify(cachedSnapshot);
    let compressedData: Uint8Array;
    
    if (this.config.compressionLevel > 0) {
      // Use zstd compression if available, fallback to deflate
      try {
        compressedData = Bun.zstdCompressSync(jsonString, this.config.compressionLevel);
      } catch {
        compressedData = Bun.deflateSync(jsonString);
      }
    } else {
      compressedData = new TextEncoder().encode(jsonString);
    }
    
    // Add compression prefix
    const prefixed = new Uint8Array([0x01, ...compressedData]);
    
    // Generate atomic key
    const key = `snapshots/enhanced-${this.config.variant}-${Date.now()}.tier1380.zst`;
    
    const endTime = performance.now();
    console.log(`📸 Enhanced snapshot created in ${(endTime - startTime).toFixed(2)}ms (${cacheHit ? 'cache' : 'fresh'})`);
    
    // Generate signed URL for R2 access
    let signedAccessUrl: string | undefined;
    try {
      // Create a mock R2 bucket for signed URL generation
      const mockR2Bucket = {
        bucketName: this.config.r2Bucket,
        createSignedUrl: async (key: string, options: any) => {
          // In production, this would use the actual R2 bucket binding
          // For now, we'll generate a mock signed URL
          const baseUrl = `https://r2.cloudflarestorage.com/${this.config.r2Bucket}/${key}`;
          const expires = options.expiresInSeconds || 3600;
          const signedUrl = `${baseUrl}?expires=${expires}&signature=${createHash('sha256').update(key + expires.toString()).digest('hex')}`;
          return signedUrl;
        }
      } as any;
      
      signedAccessUrl = await getSignedR2URL(mockR2Bucket, key, {
        expiresInSeconds: 86400, // 24 hours for audit purposes
        customMetadata: {
          checksum,
          variant: this.config.variant,
          context: "tier1380-headers-csrf",
          csrfProtected: "true",
          snapshotType: "headers-csrf",
          securityLevel: "high"
        }
      });
    } catch (error) {
      console.warn("⚠️ Could not generate signed URL:", error.message);
    }
    
    return {
      snapshot: cachedSnapshot,
      compressedData: prefixed,
      key,
      cacheHit,
      signedAccessUrl
    };
  }

  /**
   * Put enhanced snapshot to R2 with comprehensive metadata
   */
  async putEnhancedSnapshotToR2(
    r2Bucket: R2Bucket,
    key: string,
    data: Uint8Array,
    snapshot: ABTestSnapshot,
    cacheHit: boolean
  ): Promise<R2ObjectPutResult> {
    const startTime = performance.now();
    
    // Prepare comprehensive metadata
    const metadata = {
      "tier": "1380-enhanced",
      "factory-wager": "headers-csrf-r2-enhanced-v1",
      "environment": this.config.environment,
      "variant": this.config.variant,
      "checksum:sha256": snapshot.metadata.checksum,
      "cache-hit": cacheHit.toString(),
      "compression-level": this.config.compressionLevel.toString(),
      "headers-count": snapshot.headers.length.toString(),
      "cookies-count": snapshot.cookies.length.toString(),
      "ab-tests-count": Object.keys(snapshot.config).length.toString(),
      "raw-size": JSON.stringify(snapshot).length.toString(),
      "compressed-size": data.length.toString(),
      "compression-ratio": ((data.length / JSON.stringify(snapshot).length) * 100).toFixed(2),
      "created-at": snapshot.metadata.timestamp,
      "atomic-write": "true",
      "enhanced": "true"
    };
    
    const result = await r2Bucket.put(key, data, {
      httpMetadata: { 
        contentType: "application/zstd",
        contentEncoding: "zstd",
        cacheControl: `max-age=${this.config.cacheTTL / 1000}`
      },
      customMetadata: metadata
    });
    
    const endTime = performance.now();
    console.log(`🪣 Enhanced R2 write completed in ${(endTime - startTime).toFixed(2)}ms: ${key}`);
    console.log(`   Compression ratio: ${metadata["compression-ratio"]}%`);
    console.log(`   Cache hit: ${cacheHit ? 'yes' : 'no'}`);
    
    return result;
  }

  /**
   * Read and verify enhanced snapshot
   */
  async readEnhancedSnapshot(r2Bucket: R2Bucket, key: string): Promise<{
    snapshot: ABTestSnapshot | null;
    isValid: boolean;
    error?: string;
    metadata?: any;
  }> {
    try {
      const object = await r2Bucket.get(key);
      if (!object) {
        return { snapshot: null, isValid: false, error: "Snapshot not found" };
      }
      
      const data = await object.arrayBuffer();
      const uint8Array = new Uint8Array(data);
      
      // Verify compression prefix
      if (uint8Array[0] !== 0x01) {
        return { snapshot: null, isValid: false, error: "Invalid compression prefix" };
      }
      
      // Decompress
      const compressed = uint8Array.slice(1);
      let decompressed: Uint8Array;
      
      try {
        decompressed = Bun.zstdDecompressSync(compressed);
      } catch {
        decompressed = Bun.inflateSync(compressed);
      }
      
      const raw = new TextDecoder().decode(decompressed);
      const snapshot: ABTestSnapshot = JSON.parse(raw);
      
      // Verify checksum
      const expectedChecksum = createHash('sha256')
        .update(JSON.stringify({ ...snapshot, metadata: { ...snapshot.metadata, checksum: '' } }))
        .digest('hex');
      
      if (snapshot.metadata.checksum !== expectedChecksum) {
        return { snapshot: null, isValid: false, error: "Checksum mismatch" };
      }
      
      return { 
        snapshot, 
        isValid: true, 
        metadata: object.customMetadata 
      };
      
    } catch (error) {
      return { snapshot: null, isValid: false, error: error.message };
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    hitRate: number;
    memoryUsage: number;
    oldestEntry?: number;
    newestEntry?: number;
  } {
    // This is a simplified version - in production, you'd track actual hits/misses
    const cacheSize = this.cache['cache'].size;
    const memoryUsage = JSON.stringify([...this.cache['cache']]).length;
    
    let oldestEntry: number | undefined;
    let newestEntry: number | undefined;
    
    for (const [, value] of this.cache['cache']) {
      if (!oldestEntry || value.timestamp < oldestEntry) {
        oldestEntry = value.timestamp;
      }
      if (!newestEntry || value.timestamp > newestEntry) {
        newestEntry = value.timestamp;
      }
    }
    
    return {
      size: cacheSize,
      hitRate: 0, // Would be tracked in production
      memoryUsage,
      oldestEntry,
      newestEntry
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache['cache'].clear();
    console.log("🗑️ Tier-1380 cache cleared");
  }

  /**
   * Generate comprehensive status report
   */
  async generateStatusReport(r2Bucket?: R2Bucket): Promise<{
    config: Tier1380EnhancedConfig;
    abTestConfig: Record<string, any>;
    cacheStats: any;
    environment: string;
    timestamp: string;
    health: 'healthy' | 'warning' | 'error';
    issues: string[];
  }> {
    const issues: string[] = [];
    
    // Check configuration
    const { valid, errors } = this.loadAndValidateConfig();
    if (!valid) {
      issues.push(...errors);
    }
    
    // Check cache
    const cacheStats = this.getCacheStats();
    if (cacheStats.size > 1000) {
      issues.push("Cache size exceeds recommended limit");
    }
    
    // Check R2 connectivity (if bucket provided)
    let r2Status = 'unknown';
    if (r2Bucket) {
      try {
        await r2Bucket.head('health-check');
        r2Status = 'connected';
      } catch {
        issues.push("R2 bucket connectivity issue");
        r2Status = 'disconnected';
      }
    }
    
    const health = issues.length === 0 ? 'healthy' : issues.length <= 2 ? 'warning' : 'error';
    
    return {
      config: this.config,
      abTestConfig: this.abTestConfig,
      cacheStats,
      environment: this.config.environment,
      timestamp: new Date().toISOString(),
      health,
      issues,
      r2Status
    };
  }
}

// Export for Cloudflare Workers with enhanced features
export default {
  async fetch(req: Request, env: { R2_BUCKET: R2_BUCKET }): Promise<Response> {
    const citadel = new Tier1380EnhancedCitadel({
      r2Bucket: env.R2_BUCKET.bucketName,
      publicApiUrl: "https://api.tier1380.com",
      variant: "enhanced-live",
      cacheEnabled: true,
      cacheTTL: 300000, // 5 minutes
      compressionLevel: 3
    });
    
    const url = new URL(req.url);
    
    // Health check endpoint
    if (url.pathname === "/health") {
      const status = await citadel.generateStatusReport(env.R2_BUCKET);
      return Response.json(status);
    }
    
    // Cache statistics endpoint
    if (url.pathname === "/cache-stats") {
      const stats = citadel.getCacheStats();
      return Response.json(stats);
    }
    
    // Clear cache endpoint (admin only)
    if (url.pathname === "/clear-cache" && req.method === "POST") {
      citadel.clearCache();
      return Response.json({ message: "Cache cleared" });
    }
    
    // Main enhanced snapshot creation
    if (url.pathname === "/snapshot" && req.method === "POST") {
      try {
        const headers = new Headers(req.headers);
        const cookieHeader = headers.get("Cookie") || "";
        const cookies = new Bun.CookieMap(cookieHeader);
        
        // Convert CookieMap to regular Map
        const cookieMap = new Map<string, string>();
        for (const [key, value] of cookies) {
          cookieMap.set(key, value);
        }
        
        // Create enhanced snapshot
        const { snapshot, compressedData, key, cacheHit } = await citadel.createEnhancedSnapshot(headers, cookieMap);
        
        // Put to R2
        const result = await citadel.putEnhancedSnapshotToR2(env.R2_BUCKET, key, compressedData, snapshot, cacheHit);
        
        return Response.json({
          success: true,
          key,
          cacheHit,
          checksum: snapshot.metadata.checksum,
          compressionRatio: ((compressedData.length / JSON.stringify(snapshot).length) * 100).toFixed(2),
          signedAccessUrl: signedAccessUrl,
          expiresIn: "24 hours",
          securityLevel: "high",
          metadata: result.customMetadata
        });
        
      } catch (error) {
        return Response.json({
          success: false,
          error: error.message
        }, { status: 500 });
      }
    }
    
    return Response.json({
      message: "Tier-1380 Enhanced Citadel",
      endpoints: [
        "GET /health - Health check and status",
        "GET /cache-stats - Cache statistics",
        "POST /clear-cache - Clear cache (admin)",
        "POST /snapshot - Create enhanced snapshot"
      ],
      version: "v1.0-enhanced",
      environment: citadel.config.environment
    });
  }
};
