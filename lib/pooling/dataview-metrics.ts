#!/usr/bin/env bun

/**
 * DataView Pool Metrics for Connection Pooling v3.20
 * 
 * High-performance binary metrics collection using DataView API
 * Fixed-size records for efficient memory allocation and processing
 */

export class DataViewPoolMetrics {
  private metricsBuffer: ArrayBuffer;
  private metricsView: DataView;
  private offset: number = 0;
  private recordCount: number = 0;
  
  // Metrics record structure (32 bytes fixed size)
  private static readonly METRIC_RECORD_SIZE = 32;
  private static readonly METRIC_MAGIC = 0x4D455441; // "META"
  
  constructor(maxRecords: number = 10000) {
    this.metricsBuffer = new ArrayBuffer(maxRecords * DataViewPoolMetrics.METRIC_RECORD_SIZE);
    this.metricsView = new DataView(this.metricsBuffer);
  }
  
  recordMetric(operation: string, latency: number, dataSize: number, poolSize: number): void {
    if (this.recordCount >= this.metricsBuffer.byteLength / DataViewPoolMetrics.METRIC_RECORD_SIZE) {
      // Buffer full, overwrite oldest records (circular buffer)
      this.offset = 0;
      this.recordCount = 0;
    }
    
    // Operation hash (4 bytes)
    const operationHash = this.hashCode(operation);
    this.metricsView.setUint32(this.offset, operationHash);
    this.offset += 4;
    
    // Latency in microseconds (8 bytes, Float64)
    this.metricsView.setFloat64(this.offset, latency * 1000);
    this.offset += 8;
    
    // Data size in bytes (4 bytes)
    this.metricsView.setUint32(this.offset, dataSize);
    this.offset += 4;
    
    // Pool size (4 bytes)
    this.metricsView.setUint32(this.offset, poolSize);
    this.offset += 4;
    
    // Timestamp (8 bytes, BigUint64)
    this.metricsView.setBigUint64(this.offset, BigInt(Date.now()));
    this.offset += 8;
    
    // Reserved (4 bytes)
    this.metricsView.setUint32(this.offset, 0);
    this.offset += 4;
    
    this.recordCount++;
  }
  
  getMetricsSummary(): {
    avgLatency: number;
    totalDataSize: number;
    operationCount: number;
    avgPoolSize: number;
    oldestRecord: number;
    newestRecord: number;
  } {
    if (this.recordCount === 0) {
      return { 
        avgLatency: 0, 
        totalDataSize: 0, 
        operationCount: 0, 
        avgPoolSize: 0,
        oldestRecord: 0,
        newestRecord: 0
      };
    }
    
    let totalLatency = 0;
    let totalDataSize = 0;
    let totalPoolSize = 0;
    let oldestTimestamp = Number.MAX_SAFE_INTEGER;
    let newestTimestamp = 0;
    
    for (let i = 0; i < this.recordCount; i++) {
      const offset = i * DataViewPoolMetrics.METRIC_RECORD_SIZE;
      
      // Read latency
      const latencyMicros = this.metricsView.getFloat64(offset + 4);
      totalLatency += latencyMicros / 1000; // Convert back to milliseconds
      
      // Read data size
      totalDataSize += this.metricsView.getUint32(offset + 12);
      
      // Read pool size
      totalPoolSize += this.metricsView.getUint32(offset + 16);
      
      // Read timestamp
      const timestamp = Number(this.metricsView.getBigUint64(offset + 20));
      oldestTimestamp = Math.min(oldestTimestamp, timestamp);
      newestTimestamp = Math.max(newestTimestamp, timestamp);
    }
    
    return {
      avgLatency: totalLatency / this.recordCount,
      totalDataSize,
      operationCount: this.recordCount,
      avgPoolSize: totalPoolSize / this.recordCount,
      oldestRecord: oldestTimestamp === Number.MAX_SAFE_INTEGER ? 0 : oldestTimestamp,
      newestRecord: newestTimestamp
    };
  }
  
  getRecentMetrics(count: number = 100): Array<{
    operation: string;
    latency: number;
    dataSize: number;
    poolSize: number;
    timestamp: number;
  }> {
    const recentCount = Math.min(count, this.recordCount);
    const startIndex = Math.max(0, this.recordCount - recentCount);
    const metrics = [];
    
    for (let i = startIndex; i < this.recordCount; i++) {
      const offset = i * DataViewPoolMetrics.METRIC_RECORD_SIZE;
      
      const operationHash = this.metricsView.getUint32(offset);
      const latencyMicros = this.metricsView.getFloat64(offset + 4);
      const dataSize = this.metricsView.getUint32(offset + 12);
      const poolSize = this.metricsView.getUint32(offset + 16);
      const timestamp = Number(this.metricsView.getBigUint64(offset + 20));
      
      metrics.push({
        operation: this.reverseHash(operationHash),
        latency: latencyMicros / 1000,
        dataSize,
        poolSize,
        timestamp
      });
    }
    
    return metrics;
  }
  
  exportMetricsAsBinary(): Uint8Array {
    // Create export header
    const exportSize = 24 + (this.recordCount * DataViewPoolMetrics.METRIC_RECORD_SIZE);
    const exportBuffer = new ArrayBuffer(exportSize);
    const exportView = new DataView(exportBuffer);
    let exportOffset = 0;
    
    // Export header
    exportView.setUint32(exportOffset, DataViewPoolMetrics.METRIC_MAGIC); // Magic number
    exportOffset += 4;
    exportView.setUint16(exportOffset, 1); // Version
    exportOffset += 2;
    exportView.setUint16(exportOffset, 0); // Flags
    exportOffset += 2;
    exportView.setUint32(exportOffset, this.recordCount); // Record count
    exportOffset += 4;
    exportView.setBigUint64(exportOffset, BigInt(Date.now())); // Export timestamp
    exportOffset += 8;
    exportView.setUint32(exportOffset, DataViewPoolMetrics.METRIC_RECORD_SIZE); // Record size
    exportOffset += 4;
    
    // Copy metrics data
    const metricsData = new Uint8Array(
      this.metricsBuffer, 
      0, 
      this.recordCount * DataViewPoolMetrics.METRIC_RECORD_SIZE
    );
    const exportArray = new Uint8Array(exportBuffer);
    exportArray.set(metricsData, exportOffset);
    
    return exportArray;
  }
  
  importMetricsFromBinary(data: Uint8Array): boolean {
    try {
      const view = new DataView(data.buffer);
      let offset = 0;
      
      // Validate header
      const magic = view.getUint32(offset);
      if (magic !== DataViewPoolMetrics.METRIC_MAGIC) {
        throw new Error('Invalid metrics binary format');
      }
      offset += 4;
      
      const version = view.getUint16(offset);
      if (version !== 1) {
        throw new Error(`Unsupported metrics version: ${version}`);
      }
      offset += 2;
      
      const flags = view.getUint16(offset);
      offset += 2;
      
      const recordCount = view.getUint32(offset);
      offset += 4;
      
      const exportTimestamp = Number(view.getBigUint64(offset));
      offset += 8;
      
      const recordSize = view.getUint32(offset);
      offset += 4;
      
      if (recordSize !== DataViewPoolMetrics.METRIC_RECORD_SIZE) {
        throw new Error(`Invalid record size: ${recordSize}`);
      }
      
      // Import metrics data
      const metricsData = new Uint8Array(data.buffer, offset, recordCount * recordSize);
      this.metricsView = new DataView(metricsData);
      this.recordCount = recordCount;
      this.offset = recordCount * recordSize;
      
      console.log(`✅ Imported ${recordCount} metrics records from ${new Date(exportTimestamp).toISOString()}`);
      return true;
      
    } catch (error) {
      console.error('❌ Failed to import metrics from binary:', error);
      return false;
    }
  }
  
  clear(): void {
    this.offset = 0;
    this.recordCount = 0;
  }
  
  getBufferInfo(): {
    totalCapacity: number;
    usedCapacity: number;
    utilizationRate: number;
    recordCount: number;
  } {
    const totalCapacity = this.metricsBuffer.byteLength;
    const usedCapacity = this.recordCount * DataViewPoolMetrics.METRIC_RECORD_SIZE;
    
    return {
      totalCapacity,
      usedCapacity,
      utilizationRate: usedCapacity / totalCapacity,
      recordCount: this.recordCount
    };
  }
  
  private hashCode(str: string): number {
    const bytes = new TextEncoder().encode(str);
    let hash = 0;
    for (let i = 0; i < bytes.length; i++) {
      hash = ((hash << 5) - hash) + bytes[i];
      hash = hash & hash;
    }
    return hash;
  }
  
  private reverseHash(hash: number): string {
    // Common operation reverse mapping
    const operations: Record<number, string> = {
      [this.hashCode('insert_profile')]: 'insert_profile',
      [this.hashCode('query_sessions')]: 'query_sessions',
      [this.hashCode('batch_insert')]: 'batch_insert',
      [this.hashCode('sync_to_r2')]: 'sync_to_r2',
      [this.hashCode('pool_stats')]: 'pool_stats'
    };
    
    return operations[hash] || `operation_${hash.toString(16)}`;
  }
}
