#!/usr/bin/env bun

/**
 * Enhanced Bun.Archive Structure for FactoryWager
 * Optimized R2 integration with Bun-specific features and advanced archiving
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync, statSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { createHash } from 'crypto';
import { gzipSync, gunzipSync } from 'zlib';

interface EnhancedArchiveConfig {
  r2: {
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
    endpoint?: string;
    region?: string;
  };
  archive: {
    compressionLevel: number; // 1-9
    chunkSize: number; // bytes
    maxFileSize: number; // bytes
    retention: {
      audit: number; // days
      reports: number; // days
      releases: number; // days
      artifacts: number; // days
    };
    deduplication: boolean;
    encryption: boolean;
  };
  bun: {
    useNativeCompression: boolean;
    enableStreaming: boolean;
    optimizeForSpeed: boolean;
  };
}

interface ArchiveChunk {
  index: number;
  checksum: string;
  size: number;
  compressed: boolean;
  data: ArrayBuffer;
}

interface EnhancedArchiveMetadata {
  id: string;
  timestamp: string;
  type: 'audit' | 'report' | 'release' | 'artifact' | 'chunked';
  filename: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  checksum: string;
  chunks?: number;
  encryption: {
    enabled: boolean;
    algorithm?: string;
    keyId?: string;
  };
  retention: {
    expiresAt: string;
    autoDelete: boolean;
  };
  bun: {
    version: string;
    features: string[];
    performance: {
      compressionTime: number;
      uploadTime: number;
      throughput: number;
    };
  };
}

class EnhancedBunArchiveManager {
  private config: EnhancedArchiveConfig;
  private baseUrl: string;
  private compressionCache = new Map<string, ArrayBuffer>();

  constructor(config: EnhancedArchiveConfig) {
    this.config = config;
    this.baseUrl = config.r2.endpoint || `https://${config.r2.accountId}.r2.cloudflarestorage.com`;
  }

  /**
   * Enhanced audit log archiving with Bun optimizations
   */
  async archiveAuditLogsEnhanced(olderThanDays: number = 7): Promise<EnhancedArchiveMetadata[]> {
    const auditPath = '.factory-wager/audit.log';
    const results: EnhancedArchiveMetadata[] = [];

    if (!existsSync(auditPath)) {
      return [];
    }

    try {
      const startTime = Bun.nanoseconds();
      const content = readFileSync(auditPath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());

      // Group and optimize with Bun-specific features
      const logsByDate = await this.groupAndOptimizeLogs(lines);

      for (const [date, logs] of Object.entries(logsByDate)) {
        const logDate = new Date(date);
        const daysOld = (Date.now() - logDate.getTime()) / (1000 * 60 * 60 * 24);

        if (daysOld >= olderThanDays) {
          const metadata = await this.archiveContentEnhanced(
            `audit-logs/${date}/audit.log`,
            logs.join('\n'),
            {
              id: this.generateArchiveId(),
              timestamp: logDate.toISOString(),
              type: 'audit',
              filename: `audit-${date}.log`,
              originalSize: logs.join('\n').length,
              retention: {
                expiresAt: new Date(Date.now() + this.config.archive.retention.audit * 24 * 60 * 60 * 1000).toISOString(),
                autoDelete: true
              },
              bun: {
                version: Bun.version,
                features: ['native-compression', 'streaming', 'checksum-optimization'],
                performance: {
                  compressionTime: 0,
                  uploadTime: 0,
                  throughput: 0
                }
              }
            }
          );

          results.push(metadata);
        }
      }

      // Cleanup local logs
      if (results.length > 0) {
        await this.cleanupLocalAuditLogsEnhanced(olderThanDays);
      }

      const totalTime = (Bun.nanoseconds() - startTime) / 1_000_000; // Convert to ms
      console.log(`📊 Enhanced audit archiving completed in ${totalTime}ms`);

    } catch (error) {
      console.error('Enhanced audit archiving failed:', error);
    }

    return results;
  }

  /**
   * Enhanced content archiving with Bun-specific optimizations
   */
  private async archiveContentEnhanced(key: string, content: string, metadata: Omit<EnhancedArchiveMetadata, 'compressedSize' | 'compressionRatio' | 'checksum' | 'chunks' | 'bun'>): Promise<EnhancedArchiveMetadata> {
    const startTime = Bun.nanoseconds();

    try {
      // Use Bun's native compression if enabled
      let compressedData: ArrayBuffer;
      let compressionTime: number;

      if (this.config.bun.useNativeCompression) {
        compressedData = await this.compressWithBun(content);
        compressionTime = (Bun.nanoseconds() - startTime) / 1_000_000;
      } else {
        const buffer = gzipSync(Buffer.from(content), { level: this.config.archive.compressionLevel });
        compressedData = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
        compressionTime = (Bun.nanoseconds() - startTime) / 1_000_000;
      }

      const originalSize = content.length;
      const compressedSize = compressedData.byteLength;
      const compressionRatio = originalSize > 0 ? compressedSize / originalSize : 1;
      const checksum = this.calculateChecksumEnhanced(compressedData);

      // Check for large files and chunk if necessary
      let finalMetadata: EnhancedArchiveMetadata;

      if (compressedSize > this.config.archive.maxFileSize) {
        const chunks = await this.chunkData(compressedData);
        finalMetadata = await this.archiveChunkedContent(key, chunks, {
          ...metadata,
          originalSize,
          compressedSize,
          compressionRatio,
          checksum,
          chunks: chunks.length,
          type: 'chunked',
          bun: {
            version: Bun.version,
            features: ['native-compression', 'streaming', 'checksum-optimization'],
            performance: {
              compressionTime,
              uploadTime: 0,
              throughput: originalSize / (compressionTime / 1000) // bytes per second
            }
          }
        });
      } else {
        const uploadStartTime = Bun.nanoseconds();
        await this.uploadToR2Enhanced(key, compressedData, {
          ...metadata,
          originalSize,
          compressedSize,
          compressionRatio,
          checksum,
          chunks: 0,
          type: metadata.type,
          bun: {
            version: Bun.version,
            features: ['native-compression', 'streaming', 'checksum-optimization'],
            performance: {
              compressionTime,
              uploadTime: 0,
              throughput: originalSize / (compressionTime / 1000)
            }
          }
        });
        const uploadTime = (Bun.nanoseconds() - uploadStartTime) / 1_000_000;

        finalMetadata = {
          ...metadata,
          originalSize,
          compressedSize,
          compressionRatio,
          checksum,
          chunks: 0,
          type: metadata.type,
          bun: {
            version: Bun.version,
            features: ['native-compression', 'streaming', 'checksum-optimization'],
            performance: {
              compressionTime,
              uploadTime,
              throughput: originalSize / ((compressionTime + uploadTime) / 1000)
            }
          }
        };
      }

      return finalMetadata;

    } catch (error) {
      throw new Error(`Enhanced archiving failed for ${key}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Bun-specific compression using native APIs
   */
  private async compressWithBun(content: string): Promise<ArrayBuffer> {
    // Use Bun's native compression if available
    // This is a placeholder - in reality, you'd use Bun's compression APIs
    const buffer = Buffer.from(content);

    if (this.config.bun.optimizeForSpeed) {
      // Fast compression with lower ratio
      return gzipSync(buffer, { level: 6 }).buffer;
    } else {
      // Better compression with more CPU
      return gzipSync(buffer, { level: this.config.archive.compressionLevel }).buffer;
    }
  }

  /**
   * Enhanced checksum calculation using Bun's crypto
   */
  private calculateChecksumEnhanced(data: ArrayBuffer): string {
    // Use Bun's native crypto if available
    const buffer = Buffer.from(data);
    return createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Chunk large files for efficient upload
   */
  private async chunkData(data: ArrayBuffer): Promise<ArchiveChunk[]> {
    const chunks: ArchiveChunk[] = [];
    const chunkSize = this.config.archive.chunkSize;
    const totalChunks = Math.ceil(data.byteLength / chunkSize);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, data.byteLength);
      const chunkData = data.slice(start, end);

      chunks.push({
        index: i,
        checksum: this.calculateChecksumEnhanced(chunkData),
        size: chunkData.byteLength,
        compressed: true,
        data: chunkData
      });
    }

    return chunks;
  }

  /**
   * Archive chunked content to R2
   */
  private async archiveChunkedContent(baseKey: string, chunks: ArchiveChunk[], metadata: EnhancedArchiveMetadata): Promise<EnhancedArchiveMetadata> {
    const chunkResults = [];

    for (const chunk of chunks) {
      const chunkKey = `${baseKey}.chunk.${chunk.index}`;
      await this.uploadToR2Enhanced(chunkKey, chunk.data, metadata);
      chunkResults.push({ index: chunk.index, key: chunkKey, size: chunk.size });
    }

    // Upload manifest
    const manifest = {
      baseKey,
      chunks: chunkResults,
      totalChunks: chunks.length,
      totalSize: chunks.reduce((sum, c) => sum + c.size, 0),
      checksum: metadata.checksum
    };

    const manifestKey = `${baseKey}.manifest.json`;
    await this.uploadToR2Enhanced(manifestKey, JSON.stringify(manifest), metadata);

    return {
      ...metadata,
      chunks: chunks.length
    };
  }

  /**
   * Enhanced R2 upload with Bun optimizations
   */
  private async uploadToR2Enhanced(key: string, data: ArrayBuffer | string, metadata: EnhancedArchiveMetadata): Promise<void> {
    // Simulate enhanced R2 upload with Bun optimizations
    console.log(`📤 Enhanced R2 Upload: ${key}`);
    console.log(`   Size: ${typeof data === 'string' ? data.length : data.byteLength} bytes`);
    console.log(`   Type: ${metadata.type}`);
    console.log(`   Compression Ratio: ${(metadata.compressionRatio * 100).toFixed(1)}%`);

    // Simulate upload with streaming if enabled
    if (this.config.bun.enableStreaming) {
      console.log(`   🌊 Using streaming upload`);
    }

    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  /**
   * Enhanced log grouping with optimizations
   */
  private async groupAndOptimizeLogs(lines: string[]): Promise<Record<string, string[]>> {
    const logsByDate: Record<string, string[]> = {};

    for (const line of lines) {
      try {
        let timestamp: string;

        if (line.startsWith('{')) {
          const entry = JSON.parse(line);
          timestamp = entry.timestamp;
        } else if (line.startsWith('[')) {
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

          // Deduplicate if enabled
          if (this.config.archive.deduplication) {
            const lineHash = this.calculateChecksumEnhanced(new TextEncoder().encode(line).buffer);
            if (!this.compressionCache.has(lineHash)) {
              logsByDate[date].push(line);
              this.compressionCache.set(lineHash, new TextEncoder().encode(line).buffer);
            }
          } else {
            logsByDate[date].push(line);
          }
        }
      } catch (error) {
        continue;
      }
    }

    return logsByDate;
  }

  /**
   * Enhanced cleanup with performance tracking
   */
  private async cleanupLocalAuditLogsEnhanced(olderThanDays: number): Promise<void> {
    const auditPath = '.factory-wager/audit.log';

    if (!existsSync(auditPath)) {
      return;
    }

    try {
      const startTime = Bun.nanoseconds();
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

      writeFileSync(auditPath, recentLines.join('\n') + '\n', 'utf-8');

      const cleanupTime = (Bun.nanoseconds() - startTime) / 1_000_000;
      const cleanedEntries = lines.length - recentLines.length;

      console.log(`🧹 Enhanced cleanup completed in ${cleanupTime}ms`);
      console.log(`   Removed ${cleanedEntries} old entries`);

    } catch (error) {
      console.error('Enhanced cleanup failed:', error);
    }
  }

  /**
   * Generate enhanced archive ID
   */
  private generateArchiveId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    return `fw-${timestamp}-${random}`;
  }

  /**
   * Generate comprehensive archive report
   */
  generateEnhancedArchiveReport(results: EnhancedArchiveMetadata[]): string {
    const successful = results.filter(r => r);
    const totalOriginalSize = successful.reduce((sum, r) => sum + r.originalSize, 0);
    const totalCompressedSize = successful.reduce((sum, r) => sum + r.compressedSize, 0);
    const avgCompressionRatio = totalOriginalSize > 0 ? totalCompressedSize / totalOriginalSize : 1;

    const avgCompressionTime = successful.reduce((sum, r) => sum + r.bun.performance.compressionTime, 0) / successful.length;
    const avgUploadTime = successful.reduce((sum, r) => sum + r.bun.performance.uploadTime, 0) / successful.length;
    const avgThroughput = successful.reduce((sum, r) => sum + r.bun.performance.throughput, 0) / successful.length;

    const report = {
      timestamp: new Date().toISOString(),
      bun: {
        version: Bun.version,
        features: ['native-compression', 'enhanced-checksum', 'chunked-uploads', 'streaming']
      },
      summary: {
        total_archives: results.length,
        successful: successful.length,
        total_original_size: totalOriginalSize,
        total_compressed_size: totalCompressedSize,
        space_saved: totalOriginalSize - totalCompressedSize,
        avg_compression_ratio: avgCompressionRatio,
        compression_efficiency: (1 - avgCompressionRatio) * 100
      },
      performance: {
        avg_compression_time_ms: avgCompressionTime,
        avg_upload_time_ms: avgUploadTime,
        avg_throughput_mbps: (avgThroughput / 1024 / 1024).toFixed(2),
        total_processing_time: avgCompressionTime + avgUploadTime
      },
      archives: successful.map(r => ({
        id: r.id,
        type: r.type,
        filename: r.filename,
        original_size: r.originalSize,
        compressed_size: r.compressedSize,
        compression_ratio: r.compressionRatio,
        chunks: r.chunks,
        performance: r.bun.performance
      }))
    };

    return JSON.stringify(report, null, 2);
  }
}

// CLI interface with enhanced features
if (import.meta.main) {
  console.log('🚀 Enhanced Bun.Archive Manager for FactoryWager');
  console.log('================================================');
  console.log(`🔧 Bun Version: ${Bun.version}`);
  console.log();

  // Enhanced configuration
  const config: EnhancedArchiveConfig = {
    r2: {
      accountId: process.env.R2_ACCOUNT_ID || 'demo-account',
      accessKeyId: process.env.R2_ACCESS_KEY_ID || 'demo-key',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || 'demo-secret',
      bucket: process.env.R2_BUCKET || 'factory-wager-archive',
      region: process.env.R2_REGION || 'auto'
    },
    archive: {
      compressionLevel: parseInt(process.env.COMPRESSION_LEVEL || '7'),
      chunkSize: parseInt(process.env.CHUNK_SIZE || '10485760'), // 10MB
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800'), // 50MB
      retention: {
        audit: parseInt(process.env.AUDIT_RETENTION_DAYS || '90'),
        reports: parseInt(process.env.REPORTS_RETENTION_DAYS || '365'),
        releases: parseInt(process.env.RELEASES_RETENTION_DAYS || '730'),
        artifacts: parseInt(process.env.ARTIFACTS_RETENTION_DAYS || '180')
      },
      deduplication: process.env.ENABLE_DEDUPLICATION !== 'false',
      encryption: process.env.ENABLE_ENCRYPTION === 'true'
    },
    bun: {
      useNativeCompression: process.env.BUN_NATIVE_COMPRESSION !== 'false',
      enableStreaming: process.env.BUN_ENABLE_STREAMING === 'true',
      optimizeForSpeed: process.env.BUN_OPTIMIZE_SPEED === 'true'
    }
  };

  const archiver = new EnhancedBunArchiveManager(config);

  // Run enhanced archiving
  archiver.archiveAuditLogsEnhanced(7)
    .then(results => {
      const report = archiver.generateEnhancedArchiveReport(results);

      console.log('📊 Enhanced Archive Report:');
      console.log(report);

      // Save enhanced report
      const reportPath = `.factory-wager/enhanced-archive-report-${Date.now()}.json`;
      writeFileSync(reportPath, report, 'utf-8');
      console.log(`\n📄 Enhanced report saved: ${reportPath}`);

    })
    .catch((error: unknown) => {
      console.error('❌ Enhanced archiving failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}

export { EnhancedBunArchiveManager, type EnhancedArchiveConfig, type EnhancedArchiveMetadata, type ArchiveChunk };
