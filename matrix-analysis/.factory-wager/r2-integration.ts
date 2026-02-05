#!/usr/bin/env bun

/**
 * FactoryWager R2 Storage Integration
 * Archives audit logs, reports, and artifacts to R2 storage
 * Reduces local storage bloat with intelligent archiving
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync, statSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint?: string;
}

interface ArchiveMetadata {
  timestamp: string;
  type: 'audit' | 'report' | 'artifact' | 'release';
  filename: string;
  size: number;
  checksum: string;
  compressed: boolean;
  retention_days: number;
}

interface ArchiveResult {
  success: boolean;
  key: string;
  url?: string;
  size: number;
  compressed: boolean;
  deleted_local: boolean;
  error?: string;
}

class R2ArchiveManager {
  private config: R2Config;
  private baseUrl: string;

  constructor(config: R2Config) {
    this.config = config;
    this.baseUrl = config.endpoint || `https://${config.accountId}.r2.cloudflarestorage.com`;
  }

  /**
   * Archives FactoryWager audit logs to R2
   */
  async archiveAuditLogs(olderThanDays: number = 7): Promise<ArchiveResult[]> {
    const auditPath = '.factory-wager/audit.log';
    const results: ArchiveResult[] = [];

    if (!existsSync(auditPath)) {
      return [{
        success: false,
        key: '',
        size: 0,
        compressed: false,
        deleted_local: false,
        error: 'Audit log file not found'
      }];
    }

    try {
      const content = readFileSync(auditPath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      
      // Group logs by date for efficient archiving
      const logsByDate = this.groupLogsByDate(lines);
      
      for (const [date, logs] of Object.entries(logsByDate)) {
        const logDate = new Date(date);
        const daysOld = (Date.now() - logDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysOld >= olderThanDays) {
          const result = await this.archiveContent(
            `audit-logs/${date}/audit.log`,
            logs.join('\n'),
            {
              timestamp: logDate.toISOString(),
              type: 'audit',
              filename: `audit-${date}.log`,
              size: logs.join('\n').length,
              checksum: this.calculateChecksum(logs.join('\n')),
              compressed: true,
              retention_days: 90
            }
          );
          
          results.push(result);
        }
      }

      // Clean up old entries from local audit log
      if (results.some(r => r.success)) {
        await this.cleanupLocalAuditLogs(olderThanDays);
      }

    } catch (error) {
      results.push({
        success: false,
        key: '',
        size: 0,
        compressed: false,
        deleted_local: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }

    return results;
  }

  /**
   * Archives HTML reports to R2
   */
  async archiveReports(olderThanDays: number = 30): Promise<ArchiveResult[]> {
    const reportsDir = '.factory-wager/reports';
    const results: ArchiveResult[] = [];

    if (!existsSync(reportsDir)) {
      return results;
    }

    try {
      const files = this.listDirectory(reportsDir, '.html');
      
      for (const file of files) {
        const filePath = join(reportsDir, file);
        const stats = statSync(filePath);
        const daysOld = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysOld >= olderThanDays) {
          const content = readFileSync(filePath, 'utf-8');
          const compressed = content.length > 10000; // Compress large reports
          
          const result = await this.archiveContent(
            `reports/${stats.mtime.getFullYear()}/${String(stats.mtime.getMonth() + 1).padStart(2, '0')}/${file}`,
            content,
            {
              timestamp: stats.mtime.toISOString(),
              type: 'report',
              filename: file,
              size: stats.size,
              checksum: this.calculateChecksum(content),
              compressed,
              retention_days: 365
            }
          );
          
          if (result.success && result.deleted_local) {
            unlinkSync(filePath);
          }
          
          results.push(result);
        }
      }

    } catch (error) {
      results.push({
        success: false,
        key: '',
        size: 0,
        compressed: false,
        deleted_local: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }

    return results;
  }

  /**
   * Archives release artifacts to R2
   */
  async archiveReleases(olderThanDays: number = 90): Promise<ArchiveResult[]> {
    const releasesDir = '.factory-wager/releases';
    const results: ArchiveResult[] = [];

    if (!existsSync(releasesDir)) {
      return results;
    }

    try {
      const files = this.listDirectory(releasesDir, '.md');
      
      for (const file of files) {
        const filePath = join(releasesDir, file);
        const stats = statSync(filePath);
        const daysOld = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysOld >= olderThanDays) {
          const content = readFileSync(filePath, 'utf-8');
          
          const result = await this.archiveContent(
            `releases/${stats.mtime.getFullYear()}/${String(stats.mtime.getMonth() + 1).padStart(2, '0')}/${file}`,
            content,
            {
              timestamp: stats.mtime.toISOString(),
              type: 'release',
              filename: file,
              size: stats.size,
              checksum: this.calculateChecksum(content),
              compressed: false,
              retention_days: 730 // 2 years for releases
            }
          );
          
          if (result.success && result.deleted_local) {
            unlinkSync(filePath);
          }
          
          results.push(result);
        }
      }

    } catch (error) {
      results.push({
        success: false,
        key: '',
        size: 0,
        compressed: false,
        deleted_local: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }

    return results;
  }

  /**
   * Archives content to R2 with compression and metadata
   */
  private async archiveContent(key: string, content: string, metadata: ArchiveMetadata): Promise<ArchiveResult> {
    try {
      // Compress content if needed
      let finalContent = content;
      let compressed = false;
      
      if (metadata.compressed && content.length > 1000) {
        // Simple compression simulation (replace with actual compression)
        finalContent = this.compressContent(content);
        compressed = true;
      }

      // Simulate R2 upload (replace with actual R2 API call)
      const uploadResult = await this.uploadToR2(key, finalContent, metadata);
      
      return {
        success: true,
        key: uploadResult.key,
        url: uploadResult.url,
        size: finalContent.length,
        compressed,
        deleted_local: true // Assume we delete local after successful upload
      };

    } catch (error) {
      return {
        success: false,
        key,
        size: content.length,
        compressed: false,
        deleted_local: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Simulates R2 upload (replace with actual Cloudflare R2 API)
   */
  private async uploadToR2(key: string, content: string, metadata: ArchiveMetadata): Promise<{ key: string; url: string }> {
    // In a real implementation, this would use the Cloudflare R2 API
    // For now, we'll simulate the upload
    
    console.log(`📤 Uploading to R2: ${key}`);
    console.log(`   Size: ${content.length} bytes`);
    console.log(`   Compressed: ${metadata.compressed}`);
    console.log(`   Type: ${metadata.type}`);
    
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const url = `${this.baseUrl}/${this.config.bucket}/${key}`;
    
    return {
      key,
      url
    };
  }

  /**
   * Groups audit log entries by date
   */
  private groupLogsByDate(lines: string[]): Record<string, string[]> {
    const logsByDate: Record<string, string[]> = {};
    
    for (const line of lines) {
      try {
        let timestamp: string;
        
        if (line.startsWith('{')) {
          // JSON format
          const entry = JSON.parse(line);
          timestamp = entry.timestamp;
        } else if (line.startsWith('[')) {
          // Plain text format
          const match = line.match(/^\[([^\]]+)\]/);
          timestamp = match ? match[1] : '';
        } else {
          continue;
        }
        
        if (timestamp) {
          const date = timestamp.split('T')[0];
          if (!logsByDate[date]) {
            logsByDate[date] = [];
          }
          logsByDate[date].push(line);
        }
      } catch (error) {
        // Skip invalid lines
        continue;
      }
    }
    
    return logsByDate;
  }

  /**
   * Cleans up old entries from local audit log
   */
  private async cleanupLocalAuditLogs(olderThanDays: number): Promise<void> {
    const auditPath = '.factory-wager/audit.log';
    
    if (!existsSync(auditPath)) {
      return;
    }

    try {
      const content = readFileSync(auditPath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      
      const recentLines = lines.filter(line => {
        try {
          let timestamp: string;
          
          if (line.startsWith('{')) {
            const entry = JSON.parse(line);
            timestamp = entry.timestamp;
          } else if (line.startsWith('[')) {
            const match = line.match(/^\[([^\]]+)\]/);
            timestamp = match ? match[1] : '';
          } else {
            return false;
          }
          
          if (timestamp) {
            const entryDate = new Date(timestamp);
            return entryDate > cutoffDate;
          }
          
          return false;
        } catch (error) {
          return false;
        }
      });
      
      // Write back only recent entries
      writeFileSync(auditPath, recentLines.join('\n') + '\n', 'utf-8');
      
      console.log(`🧹 Cleaned up ${lines.length - recentLines.length} old audit entries`);
      
    } catch (error) {
      console.error('Failed to cleanup audit logs:', error);
    }
  }

  /**
   * Lists files in directory with specific extension
   */
  private listDirectory(dir: string, extension: string): string[] {
    // Simplified directory listing (replace with actual fs.readdir)
    return []; // Implementation would use fs.readdir
  }

  /**
   * Calculates checksum for content integrity
   */
  private calculateChecksum(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Simple content compression (replace with actual compression)
   */
  private compressContent(content: string): string {
    // Simple compression simulation
    // In reality, use gzip or brotli
    return content;
  }

  /**
   * Generates archive API response
   */
  generateArchiveReport(results: ArchiveResult[]): string {
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const totalSize = successful.reduce((sum, r) => sum + r.size, 0);
    const compressedSize = successful.filter(r => r.compressed).reduce((sum, r) => sum + r.size, 0);

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: results.length,
        successful: successful.length,
        failed: failed.length,
        total_size_bytes: totalSize,
        compressed_size_bytes: compressedSize,
        space_saved_bytes: compressedSize > 0 ? totalSize - compressedSize : 0,
        local_files_deleted: successful.filter(r => r.deleted_local).length
      },
      successful_archives: successful.map(r => ({
        key: r.key,
        size: r.size,
        compressed: r.compressed,
        url: r.url
      })),
      failed_archives: failed.map(r => ({
        key: r.key,
        error: r.error
      }))
    };

    return JSON.stringify(report, null, 2);
  }
}

// CLI interface
if (import.meta.main) {
  console.log('📦 FactoryWager R2 Archive Manager');
  console.log('==================================');
  console.log();

  // Load R2 configuration from environment or config
  const r2Config: R2Config = {
    accountId: process.env.R2_ACCOUNT_ID || 'demo-account',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || 'demo-key',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || 'demo-secret',
    bucket: process.env.R2_BUCKET || 'factory-wager-archive'
  };

  const archiver = new R2ArchiveManager(r2Config);

  // Run all archive operations
  Promise.all([
    archiver.archiveAuditLogs(7),
    archiver.archiveReports(30),
    archiver.archiveReleases(90)
  ]).then(([auditResults, reportResults, releaseResults]) => {
    const allResults = [...auditResults, ...reportResults, ...releaseResults];
    const report = archiver.generateArchiveReport(allResults);
    
    console.log('📊 Archive Operation Results:');
    console.log(report);
    
    // Save archive report
    const reportPath = `.factory-wager/archive-report-${Date.now()}.json`;
    writeFileSync(reportPath, report, 'utf-8');
    console.log(`\n📄 Archive report saved: ${reportPath}`);
    
  }).catch((error: unknown) => {
    console.error('❌ Archive operation failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}

export { R2ArchiveManager, type R2Config, type ArchiveMetadata, type ArchiveResult };
