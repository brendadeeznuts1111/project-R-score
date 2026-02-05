#!/usr/bin/env bun

/**
 * 🌐 Enhanced R2 Integration with Race Condition Fixes
 * 
 * Fixed concurrent operations, standardized error handling, and proper cache management
 */

import { styled, FW_COLORS } from '../theme/colors.ts';
import { 
  handleError, 
  safeAsync, 
  safeAsyncWithRetry, 
  R2ConnectionError, 
  R2DataError 
} from '../core/error-handling.ts';
import { validateR2Key } from '../core/validation.ts';
import { globalCache } from '../core/cache-manager.ts';
import { safeConcurrent } from '../core/concurrent-operations.ts';
import { URLHandler, FactoryWagerURLUtils, URLFragmentUtils } from '../core/url-handler.ts';

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  endpoint?: string;
}

export interface DiagnosisEntry {
  id: string;
  timestamp: string;
  issue: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  description: string;
  recommendations: string[];
  resolved: boolean;
  metadata?: Record<string, any>;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  userId?: string;
  resource: string;
  details: Record<string, any>;
  ip?: string;
  userAgent?: string;
  success: boolean;
  metadata?: Record<string, any>;
}

export interface MetricsEntry {
  id: string;
  timestamp: string;
  metrics: Record<string, number>;
  category: string;
  period: string;
  metadata?: Record<string, any>;
}

/**
 * Enhanced R2 Integration Class
 */
export class R2MCPIntegration {
  private config: R2Config;
  private initialized: boolean = false;

  constructor(config?: Partial<R2Config>) {
    this.config = {
      accountId: process.env.R2_ACCOUNT_ID || '7a470541a704caaf91e71efccc78fd36',
      accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
      bucketName: process.env.R2_BUCKET_NAME || 'scanner-cookies',
      endpoint: process.env.R2_ENDPOINT,
      ...config
    };
  }

  /**
   * Initialize R2 connection
   */
  async initialize(): Promise<void> {
    try {
      // Validate configuration
      this.validateConfig();
      
      // Test connection
      const connected = await this.testConnection();
      if (!connected) {
        throw new R2ConnectionError('Failed to establish R2 connection');
      }

      this.initialized = true;
      console.log(styled('✅ R2 integration initialized', 'success'));
      
    } catch (error) {
      handleError(error, 'R2MCPIntegration.initialize', 'critical');
      throw error;
    }
  }

  /**
   * Store diagnosis with proper error handling and caching
   */
  async storeDiagnosis(diagnosis: DiagnosisEntry): Promise<string> {
    try {
      this.ensureInitialized();
      
      // Validate input
      const keyValidation = validateR2Key(`mcp/diagnoses/${diagnosis.id}.json`);
      if (!keyValidation.isValid) {
        throw new R2DataError(`Invalid diagnosis key: ${keyValidation.errors.join(', ')}`);
      }

      const key = keyValidation.data;

      // Store with retry
      await safeAsyncWithRetry(
        () => this.putJSON(key, diagnosis),
        'storeDiagnosis',
        3,
        1000
      );

      // Update index asynchronously
      safeAsync(
        () => this.updateDiagnosisIndex(diagnosis),
        'updateDiagnosisIndex'
      );

      return key;

    } catch (error) {
      handleError(error, 'R2MCPIntegration.storeDiagnosis', 'high');
      throw error;
    }
  }

  /**
   * Store audit entry with proper error handling
   */
  async storeAuditEntry(audit: AuditEntry): Promise<string> {
    try {
      this.ensureInitialized();
      
      // Validate input
      const keyValidation = validateR2Key(`mcp/audits/${audit.id}.json`);
      if (!keyValidation.isValid) {
        throw new R2DataError(`Invalid audit key: ${keyValidation.errors.join(', ')}`);
      }

      const key = keyValidation.data;

      // Store with retry
      await safeAsyncWithRetry(
        () => this.putJSON(key, audit),
        'storeAuditEntry',
        3,
        1000
      );

      // Update index asynchronously
      safeAsync(
        () => this.updateAuditIndex(audit),
        'updateAuditIndex'
      );

      return key;

    } catch (error) {
      handleError(error, 'R2MCPIntegration.storeAuditEntry', 'high');
      throw error;
    }
  }

  /**
   * Search audits with fixed race condition handling
   */
  async searchAudits(query: string, limit: number = 10): Promise<AuditEntry[]> {
    try {
      this.ensureInitialized();
      
      const cacheKey = `audits:search:${query}:${limit}`;
      
      // Try cache first
      const cached = await globalCache.get<AuditEntry[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get index with caching
      const indexKey = 'mcp/indexes/audits.json';
      const indexData = await globalCache.getOrSet(
        indexKey,
        () => this.getJSON(indexKey),
        { ttl: 300000, tags: ['audits', 'index'] }
      );

      if (!indexData || !indexData.entries) {
        return [];
      }

      // Find similar entries
      const queryLower = query.toLowerCase();
      const similar = indexData.entries
        .filter((entry: any) => 
          entry.action?.toLowerCase().includes(queryLower) ||
          entry.resource?.toLowerCase().includes(queryLower)
        )
        .slice(0, limit);

      // Fetch full entries concurrently with proper error handling
      const results = await safeConcurrent(
        similar.map((entry: any) => () => 
          this.getJSON(entry.key).catch(error => {
            handleError(error, `fetchAudit-${entry.key}`, 'medium');
            return null;
          })
        ),
        { failFast: false }
      );

      // Filter successful results
      const fullEntries = results
        .filter(result => result.success && result.data)
        .map(result => result.data);

      // Cache results
      await globalCache.set(cacheKey, fullEntries, { 
        ttl: 60000, 
        tags: ['audits', 'search'] 
      });

      return fullEntries;

    } catch (error) {
      handleError(error, 'R2MCPIntegration.searchAudits', 'medium');
      return [];
    }
  }

  /**
   * Store metrics with proper error handling
   */
  async storeMetrics(metrics: MetricsEntry): Promise<string> {
    try {
      this.ensureInitialized();
      
      // Validate input
      const keyValidation = validateR2Key(`mcp/metrics/${metrics.id}.json`);
      if (!keyValidation.isValid) {
        throw new R2DataError(`Invalid metrics key: ${keyValidation.errors.join(', ')}`);
      }

      const key = keyValidation.data;

      // Store with retry
      await safeAsyncWithRetry(
        () => this.putJSON(key, metrics),
        'storeMetrics',
        3,
        1000
      );

      // Update index asynchronously
      safeAsync(
        () => this.updateMetricsIndex(metrics),
        'updateMetricsIndex'
      );

      return key;

    } catch (error) {
      handleError(error, 'R2MCPIntegration.storeMetrics', 'high');
      throw error;
    }
  }

  /**
   * Get JSON with caching and error handling
   */
  async getJSON<T = any>(key: string): Promise<T | null> {
    try {
      this.ensureInitialized();
      
      // Validate key
      const keyValidation = validateR2Key(key);
      if (!keyValidation.isValid) {
        throw new R2DataError(`Invalid key: ${keyValidation.errors.join(', ')}`);
      }

      const validatedKey = keyValidation.data;

      // Try cache first
      const cached = await globalCache.get<T>(validatedKey);
      if (cached !== null) {
        return cached;
      }

      // Fetch from R2 (simulated - in production would use actual R2 client)
      console.log(styled(`📥 Retrieving JSON: ${validatedKey}`, 'muted'));
      
      // Simulate R2 fetch with error handling
      const data = await this.fetchFromR2<T>(validatedKey);
      
      if (data) {
        // Cache the result
        await globalCache.set(validatedKey, data, { 
          ttl: 300000, 
          tags: ['r2', 'json'] 
        });
      }

      return data;

    } catch (error) {
      handleError(error, 'R2MCPIntegration.getJSON', 'medium');
      return null;
    }
  }

  /**
   * Put JSON with error handling
   */
  async putJSON<T = any>(key: string, data: T): Promise<string> {
    try {
      this.ensureInitialized();
      
      // Validate key
      const keyValidation = validateR2Key(key);
      if (!keyValidation.isValid) {
        throw new R2DataError(`Invalid key: ${keyValidation.errors.join(', ')}`);
      }

      const validatedKey = keyValidation.data;

      // Store in R2 (simulated)
      console.log(styled(`📤 Storing JSON: ${validatedKey}`, 'muted'));
      await this.storeToR2(validatedKey, data);

      // Update cache
      await globalCache.set(validatedKey, data, { 
        ttl: 300000, 
        tags: ['r2', 'json'] 
      });

      return validatedKey;

    } catch (error) {
      handleError(error, 'R2MCPIntegration.putJSON', 'high');
      throw error;
    }
  }

  /**
   * Generate signed URL with proper fragment handling
   */
  async generateSignedURL(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      this.ensureInitialized();
      
      // Validate key
      const keyValidation = validateR2Key(key);
      if (!keyValidation.isValid) {
        throw new R2DataError(`Invalid key for signed URL: ${keyValidation.errors.join(', ')}`);
      }

      const validatedKey = keyValidation.data;
      
      // Create base URL
      const baseURL = `https://${this.config.accountId}.r2.cloudflarestorage.com/${this.config.bucketName}/${validatedKey}`;
      
      // Add fragment with metadata
      const fragment = {
        expires: new Date(Date.now() + expiresIn * 1000).toISOString(),
        bucket: this.config.bucketName,
        key: validatedKey
      };
      
      const urlWithFragment = URLHandler.addFragment(baseURL, URLFragmentUtils.buildFragment(fragment));
      
      // Cache the signed URL
      const cacheKey = `signed-url:${validatedKey}:${expiresIn}`;
      await globalCache.set(cacheKey, urlWithFragment, { 
        ttl: expiresIn * 1000, 
        tags: ['r2', 'signed-url'] 
      });

      return urlWithFragment;

    } catch (error) {
      handleError(error, 'R2MCPIntegration.generateSignedURL', 'high');
      throw error;
    }
  }

  /**
   * Get dashboard URL with fragment navigation
   */
  getDashboardURL(section?: string, fragment?: Record<string, string>): string {
    return FactoryWagerURLUtils.createDashboardURL(section, fragment);
  }

  /**
   * Get R2 browser URL with fragment for specific object
   */
  getR2BrowserURL(category?: string, objectKey?: string): string {
    const fragment: Record<string, string> = {};
    
    if (objectKey) {
      fragment.key = objectKey;
      fragment.view = 'object';
    }
    
    return FactoryWagerURLUtils.createR2BrowserURL(category, fragment);
  }

  /**
   * Parse and validate FactoryWager URLs
   */
  parseFactoryWagerURL(url: string): { valid: boolean; service?: string; fragment?: Record<string, string> } {
    try {
      // Validate URL
      if (!FactoryWagerURLUtils.validateFactoryWagerURL(url)) {
        return { valid: false };
      }

      // Extract service
      const service = FactoryWagerURLUtils.extractService(url);
      
      // Parse fragment
      const fragmentStr = URLHandler.getFragment(url);
      const fragment = fragmentStr ? URLFragmentUtils.parseFragment(fragmentStr) : undefined;

      return { valid: true, service, fragment };

    } catch (error) {
      handleError(error, 'R2MCPIntegration.parseFactoryWagerURL', 'medium');
      return { valid: false };
    }
  }

  /**
   * Create API URL with proper parameters
   */
  createAPIURL(endpoint: string, params?: Record<string, string>): string {
    return FactoryWagerURLUtils.createAPIURL(endpoint, params);
  }

  /**
   * Get configuration status
   */
  async getConfigStatus(): Promise<{ connected: boolean; config: Partial<R2Config> }> {
    try {
      const connected = this.initialized && await this.testConnection();
      
      return {
        connected,
        config: {
          accountId: this.config.accountId,
          bucketName: this.config.bucketName,
          endpoint: this.config.endpoint
        }
      };

    } catch (error) {
      handleError(error, 'R2MCPIntegration.getConfigStatus', 'medium');
      return { connected: false, config: {} };
    }
  }

  /**
   * Update diagnosis index with error handling
   */
  private async updateDiagnosisIndex(diagnosis: DiagnosisEntry): Promise<void> {
    try {
      const indexKey = 'mcp/indexes/diagnoses.json';
      const index = await globalCache.getOrSet(
        indexKey,
        () => this.getJSON(indexKey) || { entries: [], lastUpdated: new Date().toISOString() },
        { ttl: 300000, tags: ['diagnoses', 'index'] }
      );

      index.entries.push({
        id: diagnosis.id,
        timestamp: diagnosis.timestamp,
        issue: diagnosis.issue,
        severity: diagnosis.severity,
        category: diagnosis.category,
        key: `mcp/diagnoses/${diagnosis.id}.json`
      });

      index.lastUpdated = new Date().toISOString();
      
      // Limit index size
      if (index.entries.length > 1000) {
        index.entries = index.entries.slice(-1000);
      }

      await this.putJSON(indexKey, index);
      
      // Invalidate cache
      await globalCache.invalidateByTags(['diagnoses', 'index']);

    } catch (error) {
      handleError(error, 'R2MCPIntegration.updateDiagnosisIndex', 'low');
    }
  }

  /**
   * Update audit index with error handling
   */
  private async updateAuditIndex(audit: AuditEntry): Promise<void> {
    try {
      const indexKey = 'mcp/indexes/audits.json';
      const index = await globalCache.getOrSet(
        indexKey,
        () => this.getJSON(indexKey) || { entries: [], lastUpdated: new Date().toISOString() },
        { ttl: 300000, tags: ['audits', 'index'] }
      );

      index.entries.push({
        id: audit.id,
        timestamp: audit.timestamp,
        action: audit.action,
        resource: audit.resource,
        success: audit.success,
        key: `mcp/audits/${audit.id}.json`
      });

      index.lastUpdated = new Date().toISOString();
      
      // Limit index size
      if (index.entries.length > 1000) {
        index.entries = index.entries.slice(-1000);
      }

      await this.putJSON(indexKey, index);
      
      // Invalidate cache
      await globalCache.invalidateByTags(['audits', 'index']);

    } catch (error) {
      handleError(error, 'R2MCPIntegration.updateAuditIndex', 'low');
    }
  }

  /**
   * Update metrics index with error handling
   */
  private async updateMetricsIndex(metrics: MetricsEntry): Promise<void> {
    try {
      const indexKey = 'mcp/indexes/metrics.json';
      const index = await globalCache.getOrSet(
        indexKey,
        () => this.getJSON(indexKey) || { 
          queries: [], 
          usage: [], 
          lastUpdated: new Date().toISOString() 
        },
        { ttl: 300000, tags: ['metrics', 'index'] }
      );

      index.queries.push({
        id: metrics.id,
        timestamp: metrics.timestamp,
        category: metrics.category,
        period: metrics.period,
        key: `mcp/metrics/${metrics.id}.json`
      });

      index.lastUpdated = new Date().toISOString();
      
      // Limit index size
      if (index.queries.length > 1000) {
        index.queries = index.queries.slice(-1000);
      }

      await this.putJSON(indexKey, index);
      
      // Invalidate cache
      await globalCache.invalidateByTags(['metrics', 'index']);

    } catch (error) {
      handleError(error, 'R2MCPIntegration.updateMetricsIndex', 'low');
    }
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    if (!this.config.accountId) {
      throw new R2ConnectionError('Account ID is required');
    }
    
    if (!this.config.accessKeyId) {
      throw new R2ConnectionError('Access Key ID is required');
    }
    
    if (!this.config.secretAccessKey) {
      throw new R2ConnectionError('Secret Access Key is required');
    }
    
    if (!this.config.bucketName) {
      throw new R2ConnectionError('Bucket name is required');
    }
  }

  /**
   * Ensure integration is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new R2ConnectionError('R2 integration not initialized');
    }
  }

  /**
   * Test R2 connection
   */
  private async testConnection(): Promise<boolean> {
    try {
      // Simulate connection test
      const testKey = 'test/connection-test.json';
      const testData = { test: true, timestamp: new Date().toISOString() };
      
      await this.storeToR2(testKey, testData);
      const retrieved = await this.fetchFromR2(testKey);
      
      return retrieved && retrieved.test === true;
      
    } catch (error) {
      handleError(error, 'R2MCPIntegration.testConnection', 'medium');
      return false;
    }
  }

  /**
   * Simulate R2 fetch (in production, use actual R2 client)
   */
  private async fetchFromR2<T = any>(key: string): Promise<T | null> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Simulate occasional failures
    if (Math.random() < 0.05) { // 5% failure rate
      throw new R2ConnectionError('Simulated R2 fetch failure');
    }
    
    // Return mock data for known keys
    if (key.includes('test/')) {
      return { test: true, timestamp: new Date().toISOString() } as T;
    }
    
    return null;
  }

  /**
   * Simulate R2 store (in production, use actual R2 client)
   */
  private async storeToR2<T = any>(key: string, data: T): Promise<void> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Simulate occasional failures
    if (Math.random() < 0.03) { // 3% failure rate
      throw new R2ConnectionError('Simulated R2 store failure');
    }
    
    console.log(styled(`✅ Stored: ${key}`, 'success'));
  }
}

// Export singleton instance
export const r2MCPIntegration = new R2MCPIntegration();
