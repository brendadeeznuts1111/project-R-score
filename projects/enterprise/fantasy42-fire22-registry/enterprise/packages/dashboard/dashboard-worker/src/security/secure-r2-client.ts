/**
 * Secure R2 Client with Security Scanning Integration
 *
 * Extends BunR2Client with automatic security scanning,
 * content validation, and threat detection
 */

import { BunR2Client, BunR2BatchClient } from '../utils/bun-r2-client';
import { Fire22SecurityScanner } from './security-scanner';
import { createHash } from 'crypto';
import { Database } from 'bun:sqlite';

interface SecurityConfig {
  enableScanning: boolean;
  quarantineThreshold: number; // Security score below this triggers quarantine
  autoQuarantine: boolean;
  scanPatterns: string[]; // File patterns to scan (e.g., ["*.js", "*.json"])
  excludePatterns: string[]; // Patterns to exclude from scanning
  maxFileSize: number; // Max file size to scan (bytes)
}

interface UploadSecurityResult {
  key: string;
  uploaded: boolean;
  scanned: boolean;
  securityScore?: number;
  riskLevel?: string;
  quarantined?: boolean;
  findings?: any[];
  uploadTime: number;
  scanTime?: number;
}

export class SecureR2Client extends BunR2Client {
  private securityScanner: Fire22SecurityScanner;
  private securityConfig: SecurityConfig;
  private auditDB: Database;
  private quarantineClient: BunR2Client;

  constructor(config: any, securityConfig: SecurityConfig) {
    super(config);

    this.securityConfig = {
      enableScanning: true,
      quarantineThreshold: 50,
      autoQuarantine: true,
      scanPatterns: ['*'],
      excludePatterns: [],
      maxFileSize: 100 * 1024 * 1024, // 100MB default
      ...securityConfig,
    };

    // Initialize security scanner
    this.securityScanner = new Fire22SecurityScanner({
      vuln: { database: 'production' },
      malware: { enabled: true },
      secrets: { patterns: [] },
      deps: { checkTransitive: true },
    });

    // Initialize audit database
    this.auditDB = new Database('security-audit.db');
    this.initializeAuditDB();

    // Initialize quarantine bucket client
    this.quarantineClient = new BunR2Client({
      ...config,
      bucket: `${config.bucket}-quarantine`,
    });
  }

  private initializeAuditDB() {
    this.auditDB.exec(`
      CREATE TABLE IF NOT EXISTS security_audit (
        id TEXT PRIMARY KEY,
        key TEXT NOT NULL,
        action TEXT NOT NULL,
        security_score INTEGER,
        risk_level TEXT,
        quarantined BOOLEAN,
        findings TEXT,
        user TEXT,
        timestamp INTEGER,
        metadata TEXT
      )
    `);

    this.auditDB.exec(`
      CREATE INDEX IF NOT EXISTS idx_audit_key ON security_audit(key);
      CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON security_audit(timestamp);
      CREATE INDEX IF NOT EXISTS idx_audit_risk ON security_audit(risk_level);
    `);
  }

  /**
   * Secure upload with automatic security scanning
   */
  async putObjectSecure(
    key: string,
    data: Buffer | string | ReadableStream | Blob | File,
    options: any = {}
  ): Promise<UploadSecurityResult> {
    const startTime = Bun.nanoseconds();
    const result: UploadSecurityResult = {
      key,
      uploaded: false,
      scanned: false,
      uploadTime: 0,
    };

    try {
      // Check if scanning should be performed
      if (this.shouldScan(key, data)) {
        const scanStartTime = Bun.nanoseconds();

        // Convert data to buffer for scanning
        const scanData = await this.prepareForScanning(data);

        // Perform security scan
        const scanResult = await this.securityScanner.scanPackage({
          name: key,
          version: '1.0.0',
          content: scanData,
        });

        result.scanned = true;
        result.securityScore = scanResult.securityScore;
        result.riskLevel = scanResult.riskLevel;
        result.findings = scanResult.findings;
        result.scanTime = Number(Bun.nanoseconds() - scanStartTime) / 1000000;

        // Check if content should be quarantined
        if (this.shouldQuarantine(scanResult)) {
          result.quarantined = true;

          // Upload to quarantine bucket instead
          await this.quarantineContent(key, data, scanResult, options);

          // Log security event
          await this.logSecurityEvent({
            key,
            action: 'quarantine',
            securityScore: scanResult.securityScore,
            riskLevel: scanResult.riskLevel,
            findings: scanResult.findings,
          });

          // Don't upload to main bucket
          result.uploaded = false;
          result.uploadTime = Number(Bun.nanoseconds() - startTime) / 1000000;

          return result;
        }
      }

      // Upload to main bucket
      const uploadResponse = await super.putObject(key, data, options);

      result.uploaded = uploadResponse.ok;
      result.uploadTime = Number(Bun.nanoseconds() - startTime) / 1000000;

      // Log successful upload
      await this.logSecurityEvent({
        key,
        action: 'upload',
        securityScore: result.securityScore,
        riskLevel: result.riskLevel,
        findings: result.findings,
      });

      return result;
    } catch (error) {
      // Log error
      await this.logSecurityEvent({
        key,
        action: 'error',
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Secure batch upload with parallel scanning
   */
  async batchUploadSecure(
    files: Array<{ key: string; data: Buffer | string; options?: any }>,
    concurrency: number = 5
  ): Promise<UploadSecurityResult[]> {
    const results: UploadSecurityResult[] = [];

    // Process in batches with concurrent scanning
    for (let i = 0; i < files.length; i += concurrency) {
      const batch = files.slice(i, i + concurrency);

      const batchResults = await Promise.allSettled(
        batch.map(file => this.putObjectSecure(file.key, file.data, file.options))
      );

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            key: batch[index].key,
            uploaded: false,
            scanned: false,
            uploadTime: 0,
            error: result.reason?.message,
          } as any);
        }
      });
    }

    return results;
  }

  /**
   * Check if content should be scanned
   */
  private shouldScan(key: string, data: any): boolean {
    if (!this.securityConfig.enableScanning) {
      return false;
    }

    // Check file patterns
    const shouldScanPattern = this.securityConfig.scanPatterns.some(pattern =>
      this.matchPattern(key, pattern)
    );

    const shouldExclude = this.securityConfig.excludePatterns.some(pattern =>
      this.matchPattern(key, pattern)
    );

    if (!shouldScanPattern || shouldExclude) {
      return false;
    }

    // Check file size
    const size = this.getDataSize(data);
    if (size > this.securityConfig.maxFileSize) {
      return false;
    }

    return true;
  }

  /**
   * Check if content should be quarantined
   */
  private shouldQuarantine(scanResult: any): boolean {
    if (!this.securityConfig.autoQuarantine) {
      return false;
    }

    // Check security score threshold
    if (scanResult.securityScore < this.securityConfig.quarantineThreshold) {
      return true;
    }

    // Check for critical findings
    if (scanResult.riskLevel === 'critical' || scanResult.riskLevel === 'high') {
      return true;
    }

    // Check for malware
    if (scanResult.findings?.malware?.malwareDetected) {
      return true;
    }

    // Check for high-risk secrets
    if (scanResult.findings?.secrets?.highRiskSecrets > 0) {
      return true;
    }

    return false;
  }

  /**
   * Quarantine suspicious content
   */
  private async quarantineContent(
    key: string,
    data: any,
    scanResult: any,
    options: any
  ): Promise<void> {
    // Add quarantine metadata
    const quarantineOptions = {
      ...options,
      metadata: {
        ...options.metadata,
        quarantined: 'true',
        quarantineReason: scanResult.riskLevel,
        securityScore: scanResult.securityScore.toString(),
        quarantineDate: new Date().toISOString(),
      },
    };

    // Upload to quarantine bucket
    await this.quarantineClient.putObject(
      `${new Date().toISOString().split('T')[0]}/${key}`,
      data,
      quarantineOptions
    );

    // Send alert
    await this.sendSecurityAlert({
      type: 'content_quarantined',
      key,
      scanResult,
      timestamp: new Date(),
    });
  }

  /**
   * Prepare data for security scanning
   */
  private async prepareForScanning(data: any): Promise<Buffer> {
    if (Buffer.isBuffer(data)) {
      return data;
    }

    if (typeof data === 'string') {
      return Buffer.from(data);
    }

    if (data instanceof Blob || data instanceof File) {
      const arrayBuffer = await data.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }

    if (data instanceof ReadableStream) {
      // Read stream into buffer (limited to max scan size)
      const chunks: Uint8Array[] = [];
      const reader = data.getReader();
      let totalSize = 0;

      while (totalSize < this.securityConfig.maxFileSize) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        totalSize += value.length;
      }

      return Buffer.concat(chunks);
    }

    throw new Error('Unsupported data type for scanning');
  }

  /**
   * Log security event to audit database
   */
  private async logSecurityEvent(event: any): Promise<void> {
    const insert = this.auditDB.query(`
      INSERT INTO security_audit (
        id, key, action, security_score, risk_level, 
        quarantined, findings, user, timestamp, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run(
      crypto.randomUUID(),
      event.key,
      event.action,
      event.securityScore || null,
      event.riskLevel || null,
      event.quarantined || false,
      JSON.stringify(event.findings || {}),
      event.user || 'system',
      Date.now(),
      JSON.stringify(event.metadata || {})
    );
  }

  /**
   * Send security alert
   */
  private async sendSecurityAlert(alert: any): Promise<void> {
    // In production, this would send to monitoring system
    console.log('🚨 Security Alert:', alert);

    // Log to database
    await this.logSecurityEvent({
      key: alert.key,
      action: 'alert',
      metadata: alert,
    });
  }

  /**
   * Get security audit report
   */
  async getSecurityAudit(
    options: {
      key?: string;
      startTime?: number;
      endTime?: number;
      riskLevel?: string;
      limit?: number;
    } = {}
  ): Promise<any[]> {
    let query = 'SELECT * FROM security_audit WHERE 1=1';
    const params: any[] = [];

    if (options.key) {
      query += ' AND key = ?';
      params.push(options.key);
    }

    if (options.startTime) {
      query += ' AND timestamp >= ?';
      params.push(options.startTime);
    }

    if (options.endTime) {
      query += ' AND timestamp <= ?';
      params.push(options.endTime);
    }

    if (options.riskLevel) {
      query += ' AND risk_level = ?';
      params.push(options.riskLevel);
    }

    query += ' ORDER BY timestamp DESC';

    if (options.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }

    const statement = this.auditDB.query(query);
    return statement.all(...params);
  }

  /**
   * Get security statistics
   */
  async getSecurityStats(): Promise<any> {
    const stats = {
      totalScanned: 0,
      quarantined: 0,
      riskBreakdown: {},
      averageScore: 0,
      recentThreats: [],
    };

    // Get total scanned
    const totalQuery = this.auditDB.query(
      "SELECT COUNT(*) as count FROM security_audit WHERE action = 'upload'"
    );
    stats.totalScanned = totalQuery.get().count;

    // Get quarantined count
    const quarantineQuery = this.auditDB.query(
      'SELECT COUNT(*) as count FROM security_audit WHERE quarantined = 1'
    );
    stats.quarantined = quarantineQuery.get().count;

    // Get risk breakdown
    const riskQuery = this.auditDB.query(`
      SELECT risk_level, COUNT(*) as count 
      FROM security_audit 
      WHERE risk_level IS NOT NULL 
      GROUP BY risk_level
    `);

    for (const row of riskQuery.all()) {
      stats.riskBreakdown[row.risk_level] = row.count;
    }

    // Get average security score
    const scoreQuery = this.auditDB.query(`
      SELECT AVG(security_score) as avg_score 
      FROM security_audit 
      WHERE security_score IS NOT NULL
    `);
    stats.averageScore = scoreQuery.get().avg_score || 0;

    // Get recent threats
    const threatQuery = this.auditDB.query(`
      SELECT * FROM security_audit 
      WHERE risk_level IN ('high', 'critical') 
      ORDER BY timestamp DESC 
      LIMIT 10
    `);
    stats.recentThreats = threatQuery.all();

    return stats;
  }

  /**
   * Pattern matching helper
   */
  private matchPattern(filename: string, pattern: string): boolean {
    if (pattern === '*') return true;

    // Convert glob pattern to regex
    const regex = pattern.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.');

    return new RegExp(`^${regex}$`).test(filename);
  }

  /**
   * Get data size helper
   */
  private getDataSize(data: any): number {
    if (Buffer.isBuffer(data)) {
      return data.length;
    }

    if (typeof data === 'string') {
      return Buffer.byteLength(data);
    }

    if (data instanceof Blob || data instanceof File) {
      return data.size;
    }

    // For streams, we can't determine size upfront
    return 0;
  }
}

/**
 * Secure batch client with security features
 */
export class SecureR2BatchClient extends BunR2BatchClient {
  private secureClient: SecureR2Client;

  constructor(config: any, securityConfig: SecurityConfig) {
    super(config);
    this.secureClient = new SecureR2Client(config, securityConfig);
  }

  /**
   * Override batch upload to use secure upload
   */
  async batchUpload(
    files: Array<{ key: string; data: Buffer | string; options?: any }>,
    concurrency: number = 5
  ): Promise<UploadSecurityResult[]> {
    return this.secureClient.batchUploadSecure(files, concurrency);
  }

  /**
   * Scan existing objects in R2
   */
  async scanExistingObjects(prefix?: string, maxKeys: number = 100): Promise<Map<string, any>> {
    const scanResults = new Map<string, any>();

    // List objects
    const { objects } = await this.listObjects({ prefix, maxKeys });

    // Scan each object
    for (const object of objects) {
      try {
        // Get object content
        const response = await this.getObject(object.key);
        const content = await response.arrayBuffer();

        // Scan content
        const scanResult = await this.secureClient.securityScanner.scanPackage({
          name: object.key,
          version: '1.0.0',
          content: Buffer.from(content),
        });

        scanResults.set(object.key, scanResult);

        // Quarantine if necessary
        if (this.secureClient.shouldQuarantine(scanResult)) {
          await this.secureClient.quarantineContent(
            object.key,
            Buffer.from(content),
            scanResult,
            {}
          );

          // Delete from main bucket
          await this.deleteObject(object.key);
        }
      } catch (error) {
        console.error(`Error scanning ${object.key}:`, error);
        scanResults.set(object.key, { error: error.message });
      }
    }

    return scanResults;
  }
}

// Export convenience instances
export const secureR2Client = new SecureR2Client(
  {
    endpoint: process.env.R2_ENDPOINT || '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    region: process.env.R2_REGION || 'auto',
    bucket: process.env.R2_BUCKET || '',
  },
  {
    enableScanning: true,
    quarantineThreshold: 50,
    autoQuarantine: true,
    scanPatterns: ['*.js', '*.json', '*.ts', '*.jsx', '*.tsx'],
    excludePatterns: ['*.jpg', '*.png', '*.gif', '*.pdf'],
    maxFileSize: 50 * 1024 * 1024, // 50MB
  }
);

export const secureR2BatchClient = new SecureR2BatchClient(
  {
    endpoint: process.env.R2_ENDPOINT || '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    region: process.env.R2_REGION || 'auto',
    bucket: process.env.R2_BUCKET || '',
  },
  {
    enableScanning: true,
    quarantineThreshold: 50,
    autoQuarantine: true,
    scanPatterns: ['*.js', '*.json', '*.ts', '*.jsx', '*.tsx'],
    excludePatterns: ['*.jpg', '*.png', '*.gif', '*.pdf'],
    maxFileSize: 50 * 1024 * 1024, // 50MB
  }
);
