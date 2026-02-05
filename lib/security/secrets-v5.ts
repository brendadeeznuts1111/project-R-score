// lib/security/secrets.ts - FactoryWager Security Standards v5.0
import { FW_COLORS, styled } from '../theme/colors';
import { DocsUrlBuilder } from '../docs/url-builder';
import { PATHS } from '../../constants/paths';

// Security level configurations with FactoryWager standards
export const SECURITY_LEVELS = {
  CRITICAL: {
    color: 'error' as const,
    ttl: 300,      // 5 minutes
    audit: true,
    doc: 'secrets-get-options',
    cache: false,  // Never cache critical secrets
    region: 'us-east-1' as const
  },
  HIGH: {
    color: 'warning' as const,
    ttl: 1800,     // 30 minutes
    audit: true,
    doc: 'secrets-api',
    cache: true,
    region: 'auto' as const
  },
  STANDARD: {
    color: 'primary' as const,
    ttl: 3600,     // 1 hour
    audit: false,
    doc: 'secrets-overview',
    cache: true,
    region: 'auto' as const
  },
  LOW: {
    color: 'muted' as const,
    ttl: 86400,    // 24 hours
    audit: false,
    doc: 'secrets-overview',
    cache: true,
    region: 'auto' as const
  }
} as const;

export type SecurityLevel = keyof typeof SECURITY_LEVELS;

// Secret cache entry with TTL
interface CacheEntry {
  value: string;
  expires: number;
  accessCount: number;
  lastAccess: number;
}

// Audit trail entry
interface AuditEntry {
  id: string;
  secretHash: string;
  action: 'GET' | 'ROTATE' | 'INVALIDATE' | 'CACHE_HIT';
  level: SecurityLevel;
  timestamp: string;
  runtime: string;
  factorywager: string;
  metadata: Record<string, string>;
}

// Reference manager interface (simplified for this implementation)
interface ReferenceManager {
  get(doc: string, domain: 'sh' | 'com'): { url: string } | null;
}

export class SecretManager {
  private builder = new DocsUrlBuilder('com');
  private cache = new Map<string, CacheEntry>();
  private auditQueue: AuditEntry[] = [];
  private refs: ReferenceManager;

  constructor(refs: ReferenceManager) {
    this.refs = refs;
    
    // Start audit batch processor
    setInterval(() => this.flushAuditQueue(), 5000); // Every 5 seconds
  }

  /**
   * Get a secret with security level configuration
   */
  async get(key: string, level: SecurityLevel = 'STANDARD', options: {
    bypassCache?: boolean;
    metadata?: Record<string, string>;
  } = {}): Promise<string> {
    const config = SECURITY_LEVELS[level];
    const start = performance.now();
    
    // Log documentation reference
    const docUrl = this.refs.get(config.doc, 'com')?.url;
    console.log(styled(`🔐 ${key}`, config.color) + 
                styled(` | Level: ${level}`, 'muted') +
                styled(` | Docs: ${docUrl}`, 'accent'));
    
    // Check cache first (unless bypassed or level is CRITICAL)
    if (!options.bypassCache && config.cache && level !== 'CRITICAL') {
      const cached = this.cache.get(key);
      if (cached && cached.expires > Date.now()) {
        cached.accessCount++;
        cached.lastAccess = Date.now();
        
        // Log cache hit
        await this.queueAuditEntry({
          id: this.generateAuditId(key, 'CACHE_HIT'),
          secretHash: this.hashSecret(key),
          action: 'CACHE_HIT',
          level,
          timestamp: new Date().toISOString(),
          runtime: process.versions.bun,
          factorywager: '5.0',
          metadata: { ...options.metadata, cacheHit: 'true' }
        });
        
        const elapsed = (performance.now() - start) * 1000; // Convert to microseconds
        console.log(styled(`⚡ Cache hit: ${elapsed.toFixed(0)}μs`, 'success'));
        return cached.value;
      }
    }
    
    try {
      // Fetch secret with security level configuration
      const secret = await Bun.secrets.get(key, {
        ttl: config.ttl,
        region: config.region,
        cache: config.cache
      });
      
      // Validate secret (basic checks)
      if (!secret || typeof secret !== 'string') {
        throw new Error(`Invalid secret retrieved for key: ${key}`);
      }
      
      // Cache with TTL (if allowed)
      if (config.cache && level !== 'CRITICAL') {
        this.cache.set(key, {
          value: secret,
          expires: Date.now() + (config.ttl * 1000),
          accessCount: 1,
          lastAccess: Date.now()
        });
      }
      
      // Audit if required
      if (config.audit) {
        await this.queueAuditEntry({
          id: this.generateAuditId(key, 'GET'),
          secretHash: this.hashSecret(key),
          action: 'GET',
          level,
          timestamp: new Date().toISOString(),
          runtime: process.versions.bun,
          factorywager: '5.0',
          metadata: options.metadata || {}
        });
      }
      
      const elapsed = (performance.now() - start) * 1000;
      console.log(styled(`✅ Retrieved in ${elapsed.toFixed(0)}μs`, 'success'));
      
      return secret;
      
    } catch (error) {
      const elapsed = (performance.now() - start) * 1000;
      console.error(styled(`❌ Secret retrieval failed: ${elapsed.toFixed(0)}μs`, 'error'));
      console.error(styled(`   Error: ${error instanceof Error ? error.message : String(error)}`, 'error'));
      console.error(styled(`   Docs: ${docUrl}`, 'muted'));
      
      // Queue audit for failed attempt
      await this.queueAuditEntry({
        id: this.generateAuditId(key, 'GET'),
        secretHash: this.hashSecret(key),
        action: 'GET',
        level,
        timestamp: new Date().toISOString(),
        runtime: process.versions.bun,
        factorywager: '5.0',
        metadata: { 
          ...options.metadata,
          error: error instanceof Error ? error.message : String(error),
          failed: 'true'
        }
      });
      
      throw error;
    }
  }
  
  /**
   * Get multiple secrets efficiently
   */
  async getAll(keys: string[], level: SecurityLevel = 'STANDARD'): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    const start = performance.now();
    
    console.log(styled(`🔄 Batch retrieval: ${keys.length} secrets`, 'primary'));
    
    // Process in parallel for performance
    const promises = keys.map(async (key) => {
      try {
        const value = await this.get(key, level);
        return { key, value, success: true };
      } catch (error) {
        console.warn(styled(`⚠️ Failed to get ${key}: ${error instanceof Error ? error.message : String(error)}`, 'warning'));
        return { key, value: undefined, success: false };
      }
    });
    
    const settled = await Promise.allSettled(promises);
    
    settled.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const { key, value, success } = result.value;
        if (success && value) {
          results.set(key, value);
        }
      }
    });
    
    const elapsed = (performance.now() - start);
    console.log(styled(`✅ Batch complete: ${results.size}/${keys.length} retrieved in ${elapsed.toFixed(2)}ms`, 'success'));
    
    return results;
  }
  
  /**
   * Rotate a secret (mark for rotation)
   */
  async rotate(key: string, level: SecurityLevel = 'HIGH'): Promise<void> {
    console.log(styled(`🔄 Rotating secret: ${key}`, 'warning'));
    
    // Remove from cache
    this.cache.delete(key);
    
    // Queue audit entry
    await this.queueAuditEntry({
      id: this.generateAuditId(key, 'ROTATE'),
      secretHash: this.hashSecret(key),
      action: 'ROTATE',
      level,
      timestamp: new Date().toISOString(),
      runtime: process.versions.bun,
      factorywager: '5.0',
      metadata: { rotation: 'initiated' }
    });
    
    // In a real implementation, this would trigger secret rotation
    console.log(styled(`✅ Rotation queued for: ${key}`, 'success'));
  }
  
  /**
   * Invalidate a secret from cache
   */
  async invalidate(key: string, level: SecurityLevel = 'HIGH'): Promise<void> {
    console.log(styled(`🗑️ Invalidating secret: ${key}`, 'error'));
    
    // Remove from cache
    this.cache.delete(key);
    
    // Queue audit entry
    await this.queueAuditEntry({
      id: this.generateAuditId(key, 'INVALIDATE'),
      secretHash: this.hashSecret(key),
      action: 'INVALIDATE',
      level,
      timestamp: new Date().toISOString(),
      runtime: process.versions.bun,
      factorywager: '5.0',
      metadata: { invalidated: 'true' }
    });
    
    console.log(styled(`✅ Invalidated: ${key}`, 'success'));
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    entries: Array<{ key: string; accessCount: number; ttl: number }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      accessCount: entry.accessCount,
      ttl: Math.max(0, entry.expires - now)
    }));
    
    return {
      size: this.cache.size,
      entries
    };
  }
  
  /**
   * Clear cache (for maintenance)
   */
  clearCache(): void {
    const size = this.cache.size;
    this.cache.clear();
    console.log(styled(`🧹 Cache cleared: ${size} entries removed`, 'primary'));
  }
  
  // Private methods
  
  private hashSecret(key: string): string {
    return Bun.hash.sha256(key).toString('hex');
  }
  
  private generateAuditId(key: string, action: string): string {
    const timestamp = Date.now();
    const hash = Bun.hash.crc32(`${key}-${action}-${timestamp}`).toString(16);
    return `secret-${timestamp}-${hash}`;
  }
  
  private async queueAuditEntry(entry: AuditEntry): Promise<void> {
    this.auditQueue.push(entry);
    
    // Flush immediately for critical actions
    if (entry.level === 'CRITICAL' || entry.action === 'INVALIDATE') {
      await this.flushAuditQueue();
    }
  }
  
  private async flushAuditQueue(): Promise<void> {
    if (this.auditQueue.length === 0) return;
    
    const entries = [...this.auditQueue];
    this.auditQueue = [];
    
    try {
      // In a real implementation, this would write to R2
      console.log(styled(`📊 Flushing ${entries.length} audit entries`, 'muted'));
      
      // Simulate R2 write
      for (const entry of entries) {
        await this.writeAuditToR2(entry);
      }
      
      console.log(styled(`✅ Audit trail updated: ${entries.length} entries`, 'success'));
    } catch (error) {
      console.error(styled(`❌ Failed to write audit trail: ${error instanceof Error ? error.message : String(error)}`, 'error'));
      // Re-queue failed entries
      this.auditQueue.unshift(...entries);
    }
  }
  
  private async writeAuditToR2(entry: AuditEntry): Promise<void> {
    // Simulate R2 write with visual metadata
    const color = entry.action === 'INVALIDATE' ? FW_COLORS.error :
                  entry.action === 'ROTATE' ? FW_COLORS.warning :
                  entry.action === 'CACHE_HIT' ? FW_COLORS.primary :
                  FW_COLORS.success;
    
    const metadata = {
      'audit:type': 'secret-usage',
      'audit:action': entry.action,
      'audit:severity': entry.level,
      'visual:color-hex': Bun.color(color, 'hex'),
      'visual:theme': `factorywager-${entry.action.toLowerCase()}`,
      'docs:reference': this.refs.get(SECURITY_LEVELS[entry.level].doc, 'com')?.url || '',
      'runtime:version': entry.runtime,
      'factorywager:version': entry.factorywager
    };
    
    // In real implementation:
    // await env.R2_BUCKET.put(`audit/secrets/${entry.id}.json`, JSON.stringify(entry), {
    //   customMetadata: metadata
    // });
    
    console.log(styled(`   📝 Audit: ${entry.action} | ${entry.level} | ${entry.secretHash.substring(0, 8)}...`, 'dim'));
  }
}

// Export singleton instance
export let secretManager: SecretManager;

// Initialize with mock reference manager for standalone use
const mockRefs: ReferenceManager = {
  get: (doc: string, domain: 'sh' | 'com') => ({
    url: `https://bun.${domain}/docs/runtime/secrets#${doc}`
  })
};

secretManager = new SecretManager(mockRefs);
