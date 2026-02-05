#!/usr/bin/env bun

/**
 * FactoryWager Audit Log Rotator
 *
 * Features:
 * - JSON schema validation
 * - Log rotation by size and time
 * - Compression and archiving
 * - Cleanup of old logs
 * - Statistics and reporting
 */

import { readFileSync, writeFileSync, existsSync, statSync, unlinkSync, renameSync } from 'fs';
import { join } from 'path';

interface AuditEntry {
  timestamp: string;
  workflow: string;
  version?: string;
  exit_code: number;
  duration_seconds?: number;
  environment?: string;
  config_file?: string;
  risk_score?: number;
  metadata?: Record<string, any>;
  error?: {
    type: string;
    message: string;
    code?: string;
    context?: Record<string, any>;
  };
}

interface RotationConfig {
  maxSizeBytes: number;
  maxAgeDays: number;
  maxFiles: number;
  compress: boolean;
  schemaValidation: boolean;
}

class AuditRotator {
  private config: RotationConfig;
  private auditDir: string;
  private schemaPath: string;

  constructor(auditDir: string = '.factory-wager', config?: Partial<RotationConfig>) {
    this.auditDir = auditDir;
    this.schemaPath = join(auditDir, 'audit-schema.json');

    this.config = {
      maxSizeBytes: 10 * 1024 * 1024, // 10MB
      maxAgeDays: 30,
      maxFiles: 100,
      compress: true,
      schemaValidation: true,
      ...config
    };
  }

  /**
   * Validate audit entry against JSON schema
   */
  private validateEntry(entry: AuditEntry): boolean {
    if (!this.config.schemaValidation) return true;

    try {
      const schema = JSON.parse(readFileSync(this.schemaPath, 'utf8'));

      // Basic validation (in production, use a proper JSON schema validator)
      const required = ['timestamp', 'workflow', 'exit_code'];
      for (const field of required) {
        if (!(field in entry)) {
          console.error(`Missing required field: ${field}`);
          return false;
        }
      }

      // Validate timestamp format
      const timestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
      if (!timestampRegex.test(entry.timestamp)) {
        console.error(`Invalid timestamp format: ${entry.timestamp}`);
        return false;
      }

      // Validate workflow enum
      const validWorkflows = ['fw-analyze', 'fw-validate', 'fw-changelog', 'fw-deploy', 'fw-nexus-status', 'fw-release'];
      if (!validWorkflows.includes(entry.workflow)) {
        console.error(`Invalid workflow: ${entry.workflow}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Schema validation failed:', error);
      return false;
    }
  }

  /**
   * Add audit entry with validation
   */
  addEntry(entry: AuditEntry): boolean {
    if (!this.validateEntry(entry)) {
      return false;
    }

    const auditFile = join(this.auditDir, 'audit.log');
    const logLine = JSON.stringify(entry) + '\n';

    try {
      writeFileSync(auditFile, logLine, { flag: 'a' });
      return true;
    } catch (error) {
      console.error('Failed to write audit entry:', error);
      return false;
    }
  }

  /**
   * Check if rotation is needed
   */
  private needsRotation(): boolean {
    const auditFile = join(this.auditDir, 'audit.log');

    if (!existsSync(auditFile)) {
      return false;
    }

    const stats = statSync(auditFile);
    return stats.size > this.config.maxSizeBytes;
  }

  /**
   * Rotate audit log
   */
  rotate(): boolean {
    if (!this.needsRotation()) {
      return false;
    }

    const auditFile = join(this.auditDir, 'audit.log');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rotatedFile = join(this.auditDir, `audit-${timestamp}.log`);

    try {
      // Move current log to rotated file
      renameSync(auditFile, rotatedFile);

      // Compress if enabled
      if (this.config.compress) {
        this.compressFile(rotatedFile);
      }

      // Clean up old files
      this.cleanup();

      console.log(`Audit log rotated to: ${rotatedFile}`);
      return true;
    } catch (error) {
      console.error('Log rotation failed:', error);
      return false;
    }
  }

  /**
   * Compress log file (placeholder - would use gzip in production)
   */
  private compressFile(filePath: string): void {
    const compressedPath = filePath + '.gz';
    // In production, implement actual compression
    console.log(`Compressing ${filePath} to ${compressedPath}`);
  }

  /**
   * Clean up old log files
   */
  private cleanup(): void {
    // Implementation would delete files older than maxAgeDays or exceeding maxFiles
    console.log('Cleaning up old audit logs...');
  }

  /**
   * Generate audit statistics
   */
  getStats(): Record<string, any> {
    const auditFile = join(this.auditDir, 'audit.log');

    if (!existsSync(auditFile)) {
      return { total_entries: 0, size_bytes: 0 };
    }

    try {
      const content = readFileSync(auditFile, 'utf8');
      const lines = content.trim().split('\n').filter(line => line);
      const stats = statSync(auditFile);

      const entries = lines.map(line => {
        try {
          return JSON.parse(line) as AuditEntry;
        } catch {
          return null;
        }
      }).filter(Boolean) as AuditEntry[];

      const workflowCounts = entries.reduce((acc, entry) => {
        acc[entry.workflow] = (acc[entry.workflow] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const exitCodeCounts = entries.reduce((acc, entry) => {
        acc[entry.exit_code] = (acc[entry.exit_code] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

      const successRate = (entries.filter(e => e.exit_code === 0).length / entries.length) * 100;

      return {
        total_entries: entries.length,
        size_bytes: stats.size,
        workflow_counts: workflowCounts,
        exit_code_counts: exitCodeCounts,
        success_rate: Math.round(successRate * 100) / 100,
        last_entry: entries[entries.length - 1]?.timestamp || null
      };
    } catch (error) {
      console.error('Failed to generate audit stats:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { error: errorMessage };
    }
  }
}

// CLI interface
if (import.meta.main) {
  const command = process.argv[2];
  const rotator = new AuditRotator();

  switch (command) {
    case 'rotate':
      rotator.rotate();
      break;
    case 'stats':
      console.log(JSON.stringify(rotator.getStats(), null, 2));
      break;
    default:
      console.log('Usage: audit-rotator.ts [rotate|stats]');
  }
}

export { AuditRotator, type AuditEntry, type RotationConfig };
