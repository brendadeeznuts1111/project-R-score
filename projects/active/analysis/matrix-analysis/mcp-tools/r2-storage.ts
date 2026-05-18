// mcp-tools/r2-storage.ts - R2/S3 integration for persistent violation logs
import { WidthViolation } from './sse-alerts.js';

export interface ViolationLogEntry {
  id: string;
  timestamp: number;
  violation: WidthViolation;
  metadata: {
    userAgent?: string;
    ip?: string;
    sessionId?: string;
    region?: string;
  };
}

// Re-export WidthViolation for other modules (ViolationLogEntry is already exported above)
export { WidthViolation };

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  region?: string; // Default: auto
  endpoint?: string; // For custom S3-compatible endpoints
}

export class R2ViolationLogger {
  private config: R2Config;
  private baseUrl: string;

  constructor(config: R2Config) {
    this.config = config;
    this.baseUrl = config.endpoint || `https://${config.accountId}.r2.cloudflarestorage.com`;
  }

  /**
   * Upload violation log to R2 with streaming support
   */
  async uploadViolationLog(entry: ViolationLogEntry): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      const key = this.generateLogKey(entry);
      const body = JSON.stringify(entry, null, 2);

      // Create signature for AWS S3 API
      const signature = await this.createSignature('PUT', key, body);

      const response = await fetch(`${this.baseUrl}/${this.config.bucket}/${key}`, {
        method: 'PUT',
        headers: {
          'Authorization': `AWS4-HMAC-SHA256 ${signature}`,
          'Content-Type': 'application/json',
          'x-amz-date': this.getAmzDate(),
          'x-amz-content-sha256': await this.sha256(body),
          'Host': `${this.config.bucket}.${this.config.accountId}.r2.cloudflarestorage.com`
        },
        body
      });

      if (!response.ok) {
        throw new Error(`R2 upload failed: ${response.status} ${response.statusText}`);
      }

      return {
        success: true,
        url: `${this.baseUrl}/${this.config.bucket}/${key}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Stream multiple violations to R2 efficiently
   */
  async streamViolations(violations: ViolationLogEntry[]): Promise<{ success: boolean; uploaded: number; error?: string }> {
    const batchSize = 100; // R2 recommends 1000 max, use 100 for reliability
    let uploaded = 0;

    try {
      for (let i = 0; i < violations.length; i += batchSize) {
        const batch = violations.slice(i, i + batchSize);

        // Upload batch as a single JSONL file
        const batchKey = this.generateBatchKey(i, batch.length);
        const jsonlContent = batch.map(entry => JSON.stringify(entry)).join('\n');

        const result = await this.uploadBatch(batchKey, jsonlContent);

        if (!result.success) {
          throw new Error(`Batch upload failed: ${result.error}`);
        }

        uploaded += batch.length;

        // Add small delay to avoid rate limiting
        if (i + batchSize < violations.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      return { success: true, uploaded };
    } catch (error) {
      return {
        success: false,
        uploaded,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Query violations from R2 with optional filtering
   */
  async queryViolations(options: {
    tenant?: string;
    severity?: 'warning' | 'critical';
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  } = {}): Promise<{ violations: ViolationLogEntry[]; error?: string }> {
    try {
      const prefix = this.generateQueryPrefix(options);
      const listUrl = `${this.baseUrl}/${this.config.bucket}?list-type=2&prefix=${encodeURIComponent(prefix)}`;

      const signature = await this.createSignature('GET', '', '');
      const response = await fetch(listUrl, {
        headers: {
          'Authorization': `AWS4-HMAC-SHA256 ${signature}`,
          'x-amz-date': this.getAmzDate(),
          'Host': `${this.config.bucket}.${this.config.accountId}.r2.cloudflarestorage.com`
        }
      });

      if (!response.ok) {
        throw new Error(`R2 query failed: ${response.status} ${response.statusText}`);
      }

      const xml = await response.text();
      const violations = this.parseViolationList(xml, options);

      return { violations };
    } catch (error) {
      return {
        violations: [],
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get violation statistics from R2
   */
  async getViolationStats(tenant?: string, days: number = 7): Promise<{
    total: number;
    critical: number;
    warning: number;
    topFiles: Array<{ file: string; count: number }>;
    error?: string;
  }> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));

      const violations = await this.queryViolations({
        tenant,
        startDate,
        endDate,
        limit: 10000
      });

      if (violations.error) {
        throw new Error(violations.error);
      }

      const stats = {
        total: violations.violations.length,
        critical: violations.violations.filter(v => v.violation.severity === 'critical').length,
        warning: violations.violations.filter(v => v.violation.severity === 'warning').length,
        topFiles: this.calculateTopFiles(violations.violations)
      };

      return stats;
    } catch (error) {
      return {
        total: 0,
        critical: 0,
        warning: 0,
        topFiles: [],
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // Private helper methods

  private generateLogKey(entry: ViolationLogEntry): string {
    const date = new Date(entry.timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');

    return `violations/${entry.violation.tenant}/${year}/${month}/${day}/${hour}/${entry.id}.json`;
  }

  private generateBatchKey(batchIndex: number, batchSize: number): string {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-');
    return `violations/batches/${timestamp}-batch-${batchIndex}-size-${batchSize}.jsonl`;
  }

  private generateQueryPrefix(options: any): string {
    const parts = ['violations'];

    if (options.tenant) {
      parts.push(options.tenant);
    }

    if (options.startDate) {
      const date = new Date(options.startDate);
      parts.push(date.getFullYear().toString());
      parts.push(String(date.getMonth() + 1).padStart(2, '0'));
    }

    return parts.join('/') + '/';
  }

  private async uploadBatch(key: string, content: string): Promise<{ success: boolean; error?: string }> {
    try {
      const signature = await this.createSignature('PUT', key, content);

      const response = await fetch(`${this.baseUrl}/${this.config.bucket}/${key}`, {
        method: 'PUT',
        headers: {
          'Authorization': `AWS4-HMAC-SHA256 ${signature}`,
          'Content-Type': 'application/x-ndjson',
          'x-amz-date': this.getAmzDate(),
          'x-amz-content-sha256': await this.sha256(content),
          'Host': `${this.config.bucket}.${this.config.accountId}.r2.cloudflarestorage.com`
        },
        body: content
      });

      if (!response.ok) {
        throw new Error(`Batch upload failed: ${response.status} ${response.statusText}`);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private parseViolationList(xml: string, options: any): ViolationLogEntry[] {
    // Simple XML parsing for demonstration
    // In production, use a proper XML parser
    const violations: ViolationLogEntry[] = [];

    // This is a simplified parser - in production use xml2js or similar
    const contentMatches = xml.match(/<Key>([^<]+)<\/Key>/g);

    if (contentMatches) {
      for (const match of contentMatches) {
        const key = match.replace(/<Key>|<\/Key>/g, '');

        // Skip non-violation files
        if (!key.includes('violations/') || key.includes('/batches/')) {
          continue;
        }

        // In production, fetch and parse each file
        // For now, return empty array as placeholder
      }
    }

    return violations;
  }

  private calculateTopFiles(violations: ViolationLogEntry[]): Array<{ file: string; count: number }> {
    const fileCounts: Record<string, number> = {};

    violations.forEach(v => {
      const file = v.violation.file;
      fileCounts[file] = (fileCounts[file] || 0) + 1;
    });

    return Object.entries(fileCounts)
      .map(([file, count]) => ({ file, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private async createSignature(method: string, key: string, body: string): Promise<string> {
    // Simplified AWS Signature Version 4
    // In production, implement full AWS SigV4

    const date = this.getAmzDate();
    const credentialScope = `${date.substr(0, 8)}/${this.config.region || 'auto'}/s3/aws4_request`;

    const canonicalRequest = [
      method,
      `/${this.config.bucket}/${key}`,
      '',
      `host:${this.config.bucket}.${this.config.accountId}.r2.cloudflarestorage.com`,
      `x-amz-date:${date}`,
      '',
      'host;x-amz-date',
      await this.sha256(body)
    ].join('\n');

    const stringToSign = [
      'AWS4-HMAC-SHA256',
      date,
      credentialScope,
      await this.sha256(canonicalRequest)
    ].join('\n');

    // This is simplified - use proper HMAC-SHA256 in production
    return `Credential=${this.config.accessKeyId}/${credentialScope}, SignedHeaders=host;x-amz-date, Signature=${await this.sha256(stringToSign)}`;
  }

  private getAmzDate(): string {
    return new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  }

  private async sha256(string: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(string);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

// Singleton instance for easy access
let r2Logger: R2ViolationLogger | null = null;

export function initializeR2Logger(config: R2Config): R2ViolationLogger {
  r2Logger = new R2ViolationLogger(config);
  return r2Logger;
}

export function getR2Logger(): R2ViolationLogger | null {
  return r2Logger;
}

// Environment-based initialization
export function initializeFromEnvironment(): R2ViolationLogger {
  const config: R2Config = {
    accountId: process.env.R2_ACCOUNT_ID || '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    bucket: process.env.R2_BUCKET || 'tier1380-violations',
    region: process.env.R2_REGION || 'auto'
  };

  if (!config.accountId || !config.accessKeyId || !config.secretAccessKey) {
    throw new Error('Missing required R2 environment variables: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY');
  }

  return initializeR2Logger(config);
}
