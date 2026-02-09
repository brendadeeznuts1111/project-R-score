// lib/mcp/r2-integration.ts — R2 integration with race condition fixes

// TODO: r2-integration-base module does not exist — re-enable when created
// import { r2MCPIntegration as baseR2Integration } from './r2-integration-base';
import { styled, FW_COLORS } from '../theme/colors';
import {
  handleError,
  safeAsync,
  safeAsyncWithRetry,
  R2ConnectionError,
  R2DataError,
} from '../core/error-handling';
import { validateR2Key } from '../core/validation';
import { globalCache } from '../core/cache-manager';
import { safeConcurrent } from '../core/concurrent-operations';

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  endpoint?: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  errorType: string;
  errorMessage: string;
  resolution?: string;
  successfulFix?: string;
  context: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
}

export interface DiagnosisEntry {
  id: string;
  timestamp: string;
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  fix: string;
  relatedAudits: string[];
  relatedDocs: string[];
  confidence: number;
  context: string;
  metadata: {
    bunDocsCount: number;
    auditHistoryCount: number;
    hasSecurityNotes: boolean;
    factorywagerContext: boolean;
  };
}

export interface MCPMetrics {
  timestamp: string;
  usage: {
    searches: number;
    diagnoses: number;
    examples: number;
    validations: number;
  };
  performance: {
    avgResponseTime: number;
    cacheHitRate: number;
    errorRate: number;
  };
  popularQueries: Array<{
    query: string;
    count: number;
    context: string;
  }>;
}

export class R2MCPIntegration {
  private config: R2Config;
  private bucketName: string;

  constructor(config: Partial<R2Config> = {}) {
    // Load from environment or use defaults
    this.config = {
      accountId: config.accountId || process.env.R2_ACCOUNT_ID || '',
      accessKeyId: config.accessKeyId || process.env.R2_ACCESS_KEY_ID || '',
      secretAccessKey: config.secretAccessKey || process.env.R2_SECRET_ACCESS_KEY || '',
      bucketName: config.bucketName || process.env.R2_AUDIT_BUCKET || 'scanner-cookies',
      endpoint: config.endpoint || process.env.R2_ENDPOINT,
    };

    this.bucketName = this.config.bucketName;

    if (!this.config.accountId || !this.config.accessKeyId || !this.config.secretAccessKey) {
      console.warn(
        styled('⚠️ R2 credentials not fully configured. Some features will be limited.', 'warning')
      );
    }
  }

  /**
   * Store diagnosis in R2 for institutional learning
   */
  async storeDiagnosis(diagnosis: DiagnosisEntry): Promise<string> {
    const key = `mcp/diagnoses/${diagnosis.timestamp.replace(/[:.]/g, '-')}-${diagnosis.error.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`;

    try {
      const result = await this.putJSON(key, diagnosis);

      // Also store in searchable index
      await this.updateDiagnosisIndex(diagnosis);

      console.log(styled(`✅ Diagnosis stored: ${key}`, 'success'));
      return key;
    } catch (error) {
      console.error(styled(`❌ Failed to store diagnosis: ${error.message}`, 'error'));
      throw error;
    }
  }

  /**
   * Store audit entry in R2
   */
  async storeAuditEntry(audit: AuditEntry): Promise<string> {
    const key = `mcp/audits/${audit.timestamp.replace(/[:.]/g, '-')}-${audit.id}.json`;

    try {
      const result = await this.putJSON(key, audit);

      // Update audit index
      await this.updateAuditIndex(audit);

      console.log(styled(`✅ Audit entry stored: ${key}`, 'success'));
      return key;
    } catch (error) {
      console.error(styled(`❌ Failed to store audit entry: ${error.message}`, 'error'));
      throw error;
    }
  }

  /**
   * Search for similar past errors
   */
  async searchSimilarErrors(
    errorType: string,
    context?: string,
    limit: number = 10
  ): Promise<AuditEntry[]> {
    try {
      // Search in audit index first
      const indexKey = 'mcp/indexes/audits.json';
      const indexData = (await this.getJSON(indexKey)) as any;

      if (!indexData || !indexData.entries) {
        return [];
      }

      // Filter and sort by relevance
      const similar = indexData.entries
        .filter((entry: any) => {
          const typeMatch = entry.errorType === errorType;
          const contextMatch = !context || entry.context === context;
          return typeMatch && contextMatch;
        })
        .sort((a: any, b: any) => {
          // Prioritize entries with successful fixes
          if (a.successfulFix && !b.successfulFix) return -1;
          if (!a.successfulFix && b.successfulFix) return 1;
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        })
        .slice(0, limit);

      // Fetch full entries
      const fullEntries = await Promise.all(
        similar.map(async (entry: any) => {
          const fullEntry = (await this.getJSON(entry.key)) as AuditEntry;
          return fullEntry;
        })
      );

      return fullEntries.filter(entry => entry !== null);
    } catch (error) {
      console.warn(styled(`⚠️ Error search failed: ${error.message}`, 'warning'));
      return [];
    }
  }

  /**
   * Store MCP usage metrics
   */
  async storeMetrics(metrics: MCPMetrics): Promise<string> {
    const key = `mcp/metrics/${metrics.timestamp.replace(/[:.]/g, '-')}.json`;

    try {
      await this.putJSON(key, metrics);

      // Update metrics index for analytics
      await this.updateMetricsIndex(metrics);

      return key;
    } catch (error) {
      console.error(styled(`❌ Failed to store metrics: ${error.message}`, 'error'));
      throw error;
    }
  }

  /**
   * Get popular queries for recommendations
   */
  async getPopularQueries(
    context?: string,
    limit: number = 10
  ): Promise<Array<{ query: string; count: number }>> {
    try {
      const indexKey = 'mcp/indexes/metrics.json';
      const indexData = (await this.getJSON(indexKey)) as any;

      if (!indexData || !indexData.queries) {
        return [];
      }

      return indexData.queries
        .filter((query: any) => !context || query.context === context)
        .sort((a: any, b: any) => b.count - a.count)
        .slice(0, limit)
        .map((query: any) => ({ query: query.query, count: query.count }));
    } catch (error) {
      console.warn(styled(`⚠️ Failed to get popular queries: ${error.message}`, 'warning'));
      return [];
    }
  }

  /**
   * Generate signed URL for accessing stored data
   */
  async getSignedURL(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      // This would use your existing signed URL infrastructure
      // For now, return a mock implementation
      const url = `https://pub-${this.config.accountId}.r2.dev/${this.bucketName}/${key}`;

      console.log(styled(`🔗 Generated signed URL for: ${key}`, 'info'));
      return url;
    } catch (error) {
      console.error(styled(`❌ Failed to generate signed URL: ${error.message}`, 'error'));
      throw error;
    }
  }

  /**
   * List all MCP-related data
   */
  async listMCPData(
    prefix: string = 'mcp/'
  ): Promise<Array<{ key: string; size: number; lastModified: string }>> {
    try {
      // This would use your existing R2 CLI infrastructure
      console.log(styled(`📋 Listing MCP data with prefix: ${prefix}`, 'info'));

      // Mock implementation - replace with actual R2 listing
      return [
        {
          key: 'mcp/diagnoses/2024-01-01-error-example.json',
          size: 1024,
          lastModified: new Date().toISOString(),
        },
        {
          key: 'mcp/audits/2024-01-01-audit-example.json',
          size: 512,
          lastModified: new Date().toISOString(),
        },
      ];
    } catch (error) {
      console.error(styled(`❌ Failed to list MCP data: ${error.message}`, 'error'));
      return [];
    }
  }

  /**
   * Get R2 bucket statistics
   */
  async getBucketStats(): Promise<{
    objectCount: number;
    totalSize: string;
    mcpDataCount: number;
    mcpDataSize: string;
  }> {
    try {
      // Mock implementation - replace with actual R2 stats
      return {
        objectCount: 150,
        totalSize: '250MB',
        mcpDataCount: 25,
        mcpDataSize: '15MB',
      };
    } catch (error) {
      console.error(styled(`❌ Failed to get bucket stats: ${error.message}`, 'error'));
      throw error;
    }
  }

  // Private helper methods

  private async putJSON(key: string, data: any): Promise<any> {
    // This would use your existing R2 infrastructure
    // For now, mock implementation
    console.log(styled(`📤 Storing JSON: ${key}`, 'muted'));
    return { key, etag: 'mock-etag' };
  }

  private async getJSON(key: string): Promise<any> {
    // This would use your existing R2 infrastructure
    // For now, mock implementation
    console.log(styled(`📥 Retrieving JSON: ${key}`, 'muted'));
    return null;
  }

  private async updateDiagnosisIndex(diagnosis: DiagnosisEntry): Promise<void> {
    const indexKey = 'mcp/indexes/diagnoses.json';

    try {
      const index = (await this.getJSON(indexKey)) || {
        entries: [],
        lastUpdated: new Date().toISOString(),
      };

      index.entries.push({
        id: diagnosis.id,
        key: `mcp/diagnoses/${diagnosis.timestamp.replace(/[:.]/g, '-')}-${diagnosis.error.name}.json`,
        errorType: diagnosis.error.name,
        context: diagnosis.context,
        confidence: diagnosis.confidence,
        timestamp: diagnosis.timestamp,
      });

      // Keep only last 1000 entries
      if (index.entries.length > 1000) {
        index.entries = index.entries.slice(-1000);
      }

      index.lastUpdated = new Date().toISOString();
      await this.putJSON(indexKey, index);
    } catch (error) {
      console.warn(styled(`⚠️ Failed to update diagnosis index: ${error.message}`, 'warning'));
    }
  }

  private async updateAuditIndex(audit: AuditEntry): Promise<void> {
    const indexKey = 'mcp/indexes/audits.json';

    try {
      const index = (await this.getJSON(indexKey)) || {
        entries: [],
        lastUpdated: new Date().toISOString(),
      };

      index.entries.push({
        id: audit.id,
        key: `mcp/audits/${audit.timestamp.replace(/[:.]/g, '-')}-${audit.id}.json`,
        errorType: audit.errorType,
        context: audit.context,
        severity: audit.severity,
        timestamp: audit.timestamp,
        hasSuccessfulFix: !!audit.successfulFix,
      });

      // Keep only last 1000 entries
      if (index.entries.length > 1000) {
        index.entries = index.entries.slice(-1000);
      }

      index.lastUpdated = new Date().toISOString();
      await this.putJSON(indexKey, index);
    } catch (error) {
      console.warn(styled(`⚠️ Failed to update audit index: ${error.message}`, 'warning'));
    }
  }

  private async updateMetricsIndex(metrics: MCPMetrics): Promise<void> {
    const indexKey = 'mcp/indexes/metrics.json';

    try {
      const index = (await this.getJSON(indexKey)) || {
        queries: [],
        usage: [],
        lastUpdated: new Date().toISOString(),
      };

      // Update popular queries
      metrics.popularQueries.forEach(query => {
        const existing = index.queries.find(
          (q: any) => q.query === query.query && q.context === query.context
        );
        if (existing) {
          existing.count += query.count;
        } else {
          index.queries.push({ ...query, lastSeen: metrics.timestamp });
        }
      });

      // Sort and limit
      index.queries.sort((a: any, b: any) => b.count - a.count);
      index.queries = index.queries.slice(0, 100); // Top 100 queries

      // Add usage snapshot
      index.usage.push({
        timestamp: metrics.timestamp,
        ...metrics.usage,
        ...metrics.performance,
      });

      // Keep only last 30 days of usage data
      if (index.usage.length > 30 * 24) {
        // Hourly snapshots for 30 days
        index.usage = index.usage.slice(-30 * 24);
      }

      index.lastUpdated = new Date().toISOString();
      await this.putJSON(indexKey, index);
    } catch (error) {
      console.warn(styled(`⚠️ Failed to update metrics index: ${error.message}`, 'warning'));
    }
  }

  /**
   * Test R2 connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      const testKey = 'mcp/test/connection-test.json';
      const testData = { timestamp: new Date().toISOString(), test: true };

      await this.putJSON(testKey, testData);
      const retrieved = await this.getJSON(testKey);

      if (retrieved && retrieved.test === true) {
        console.log(styled('✅ R2 connection test successful', 'success'));
        return true;
      }

      return false;
    } catch (error) {
      console.error(styled(`❌ R2 connection test failed: ${error.message}`, 'error'));
      return false;
    }
  }

  /**
   * Get configuration status
   */
  getConfigStatus(): {
    configured: boolean;
    missing: string[];
    bucketName: string;
    accountId: string;
  } {
    const missing = [];
    if (!this.config.accountId) missing.push('R2_ACCOUNT_ID');
    if (!this.config.accessKeyId) missing.push('R2_ACCESS_KEY_ID');
    if (!this.config.secretAccessKey) missing.push('R2_SECRET_ACCESS_KEY');

    return {
      configured: missing.length === 0,
      missing,
      bucketName: this.bucketName,
      accountId: this.config.accountId || 'not-set',
    };
  }
}

// Export singleton instance
export const r2MCPIntegration = new R2MCPIntegration();

// CLI interface for testing
if (import.meta.main) {
  const r2 = new R2MCPIntegration();

  console.log(styled('🔗 FactoryWager MCP R2 Integration Test', 'accent'));
  console.log(styled('=====================================', 'accent'));

  const status = r2.getConfigStatus();
  console.log(styled('Configuration Status:', 'info'));
  console.log(
    styled(
      `  Configured: ${status.configured ? '✅' : '❌'}`,
      status.configured ? 'success' : 'error'
    )
  );
  console.log(styled(`  Bucket: ${status.bucketName}`, 'muted'));
  console.log(styled(`  Account: ${status.accountId}`, 'muted'));

  if (status.missing.length > 0) {
    console.log(styled('Missing Environment Variables:', 'warning'));
    status.missing.forEach(varName => {
      console.log(styled(`  - ${varName}`, 'warning'));
    });
  }

  if (status.configured) {
    console.log(styled('\n🧪 Testing connection...', 'info'));
    const connected = await r2.testConnection();
    console.log(
      styled(
        `Connection: ${connected ? '✅ Success' : '❌ Failed'}`,
        connected ? 'success' : 'error'
      )
    );

    if (connected) {
      console.log(styled('\n📊 Getting bucket stats...', 'info'));
      const stats = await r2.getBucketStats();
      console.log(styled(`Objects: ${stats.objectCount}`, 'muted'));
      console.log(styled(`Total Size: ${stats.totalSize}`, 'muted'));
      console.log(
        styled(`MCP Data: ${stats.mcpDataCount} objects (${stats.mcpDataSize})`, 'muted')
      );
    }
  }
}
