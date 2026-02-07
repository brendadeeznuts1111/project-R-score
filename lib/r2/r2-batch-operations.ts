// lib/r2/r2-batch-operations.ts — R2 batch operations for bulk data processing

import { styled, FW_COLORS } from '../theme/colors';
import { r2EventSystem } from './r2-event-system';

export interface BatchOperation {
  id: string;
  type: 'upload' | 'download' | 'delete' | 'copy' | 'move';
  key: string;
  data?: any;
  metadata?: Record<string, string>;
  options?: Record<string, any>;
}

export interface BatchConfig {
  concurrency?: number;
  chunkSize?: number;
  retryAttempts?: number;
  retryDelay?: number;
  enableCompression?: boolean;
  compressionThreshold?: number; // bytes
  progressInterval?: number; // ms
  abortOnError?: boolean;
}

export interface BatchResult {
  operationId: string;
  success: boolean;
  key: string;
  size?: number;
  etag?: string;
  error?: string;
  duration: number;
  retries: number;
}

export interface BatchProgress {
  batchId: string;
  total: number;
  completed: number;
  failed: number;
  inProgress: number;
  percentComplete: number;
  bytesTransferred: number;
  estimatedTimeRemaining: number; // seconds
  currentOperation?: string;
}

export interface BatchJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  operations: BatchOperation[];
  results: BatchResult[];
  progress: BatchProgress;
  startedAt?: string;
  completedAt?: string;
  config: BatchConfig;
}

export class R2BatchOperations {
  private jobs: Map<string, BatchJob> = new Map();
  private activeJobs: Set<string> = new Set();
  private maxConcurrentJobs: number = 5;
  private config: BatchConfig;

  constructor(config: BatchConfig = {}) {
    this.config = {
      concurrency: config.concurrency || 10,
      chunkSize: config.chunkSize || 1024 * 1024, // 1MB chunks
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
      enableCompression: config.enableCompression ?? true,
      compressionThreshold: config.compressionThreshold || 1024 * 10, // 10KB
      progressInterval: config.progressInterval || 1000,
      abortOnError: config.abortOnError ?? false,
    };
  }

  /**
   * Execute batch upload operations
   */
  async batchUpload(
    bucket: string,
    items: Array<{ key: string; data: any; metadata?: Record<string, string> }>,
    options?: Partial<BatchConfig>
  ): Promise<BatchJob> {
    const config = { ...this.config, ...options };
    const operations: BatchOperation[] = items.map((item, index) => ({
      id: `op-${Date.now()}-${index}`,
      type: 'upload',
      key: item.key,
      data: item.data,
      metadata: item.metadata,
    }));

    return this.executeBatch(bucket, operations, config);
  }

  /**
   * Execute batch download operations
   */
  async batchDownload(
    bucket: string,
    keys: string[],
    options?: Partial<BatchConfig>
  ): Promise<BatchJob> {
    const config = { ...this.config, ...options };
    const operations: BatchOperation[] = keys.map((key, index) => ({
      id: `op-${Date.now()}-${index}`,
      type: 'download',
      key,
    }));

    return this.executeBatch(bucket, operations, config);
  }

  /**
   * Execute batch delete operations
   */
  async batchDelete(
    bucket: string,
    keys: string[],
    options?: Partial<BatchConfig>
  ): Promise<BatchJob> {
    const config = { ...this.config, ...options };
    const operations: BatchOperation[] = keys.map((key, index) => ({
      id: `op-${Date.now()}-${index}`,
      type: 'delete',
      key,
    }));

    return this.executeBatch(bucket, operations, config);
  }

  /**
   * Execute batch copy operations
   */
  async batchCopy(
    sourceBucket: string,
    destBucket: string,
    mappings: Array<{ sourceKey: string; destKey: string }>,
    options?: Partial<BatchConfig>
  ): Promise<BatchJob> {
    const config = { ...this.config, ...options };
    const operations: BatchOperation[] = mappings.map((mapping, index) => ({
      id: `op-${Date.now()}-${index}`,
      type: 'copy',
      key: mapping.sourceKey,
      options: { destBucket, destKey: mapping.destKey },
    }));

    return this.executeBatch(sourceBucket, operations, config);
  }

  /**
   * Execute batch move operations (copy + delete)
   */
  async batchMove(
    sourceBucket: string,
    destBucket: string,
    mappings: Array<{ sourceKey: string; destKey: string }>,
    options?: Partial<BatchConfig>
  ): Promise<BatchJob> {
    const config = { ...this.config, ...options };
    const operations: BatchOperation[] = mappings.map((mapping, index) => ({
      id: `op-${Date.now()}-${index}`,
      type: 'move',
      key: mapping.sourceKey,
      options: { destBucket, destKey: mapping.destKey },
    }));

    return this.executeBatch(sourceBucket, operations, config);
  }

  /**
   * Execute a batch job with full control
   */
  private async executeBatch(
    bucket: string,
    operations: BatchOperation[],
    config: BatchConfig
  ): Promise<BatchJob> {
    const batchId = `batch-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

    const job: BatchJob = {
      id: batchId,
      status: 'pending',
      operations,
      results: [],
      progress: {
        batchId,
        total: operations.length,
        completed: 0,
        failed: 0,
        inProgress: 0,
        percentComplete: 0,
        bytesTransferred: 0,
        estimatedTimeRemaining: 0,
      },
      config,
    };

    this.jobs.set(batchId, job);

    // Wait if too many concurrent jobs
    while (this.activeJobs.size >= this.maxConcurrentJobs) {
      await Bun.sleep(100);
    }

    // Start the batch
    this.activeJobs.add(batchId);
    job.status = 'running';
    job.startedAt = new Date().toISOString();

    // Emit batch started event
    r2EventSystem.emit({
      type: 'batch:started',
      bucket,
      source: 'R2BatchOperations',
      metadata: { batchId, operationCount: operations.length },
    });

    // Execute with concurrency control
    await this.executeWithConcurrency(job, bucket, config);

    // Complete the batch
    job.status = job.failed > 0 && job.completed === 0 ? 'failed' : 'completed';
    job.completedAt = new Date().toISOString();
    this.activeJobs.delete(batchId);

    // Emit batch completed event
    r2EventSystem.emit({
      type: job.status === 'failed' ? 'batch:failed' : 'batch:completed',
      bucket,
      source: 'R2BatchOperations',
      metadata: {
        batchId,
        completed: job.progress.completed,
        failed: job.progress.failed,
      },
    });

    return job;
  }

  /**
   * Execute operations with concurrency control
   */
  private async executeWithConcurrency(
    job: BatchJob,
    bucket: string,
    config: BatchConfig
  ): Promise<void> {
    const queue = [...job.operations];
    const inProgress = new Set<Promise<void>>();
    const startTime = Date.now();

    const updateProgress = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = job.progress.completed / elapsed;
      const remaining = job.progress.total - job.progress.completed;
      job.progress.estimatedTimeRemaining = rate > 0 ? remaining / rate : 0;
      job.progress.percentComplete = (job.progress.completed / job.progress.total) * 100;
    };

    while (queue.length > 0 || inProgress.size > 0) {
      // Fill concurrency slots
      while (inProgress.size < config.concurrency! && queue.length > 0) {
        const operation = queue.shift()!;
        job.progress.inProgress++;

        const promise = this.executeOperation(operation, bucket, config)
          .then(result => {
            job.results.push(result);
            if (result.success) {
              job.progress.completed++;
            } else {
              job.progress.failed++;
              if (config.abortOnError) {
                throw new Error(`Batch aborted due to error: ${result.error}`);
              }
            }
          })
          .catch(error => {
            job.results.push({
              operationId: operation.id,
              success: false,
              key: operation.key,
              error: error.message,
              duration: 0,
              retries: 0,
            });
            job.progress.failed++;
          })
          .finally(() => {
            job.progress.inProgress--;
            updateProgress();
            inProgress.delete(promise);
          });

        inProgress.add(promise);
      }

      // Wait for at least one operation to complete
      if (inProgress.size > 0) {
        await Promise.race(inProgress);
      }
    }
  }

  /**
   * Execute a single operation with retry logic
   */
  private async executeOperation(
    operation: BatchOperation,
    bucket: string,
    config: BatchConfig
  ): Promise<BatchResult> {
    const startTime = Date.now();
    let retries = 0;

    while (retries <= config.retryAttempts!) {
      try {
        let result: BatchResult;

        switch (operation.type) {
          case 'upload':
            result = await this.executeUpload(operation, bucket, config);
            break;
          case 'download':
            result = await this.executeDownload(operation, bucket);
            break;
          case 'delete':
            result = await this.executeDelete(operation, bucket);
            break;
          case 'copy':
            result = await this.executeCopy(operation, bucket);
            break;
          case 'move':
            result = await this.executeMove(operation, bucket);
            break;
          default:
            throw new Error(`Unknown operation type: ${operation.type}`);
        }

        result.duration = Date.now() - startTime;
        result.retries = retries;
        return result;
      } catch (error) {
        retries++;
        if (retries > config.retryAttempts!) {
          return {
            operationId: operation.id,
            success: false,
            key: operation.key,
            error: error.message,
            duration: Date.now() - startTime,
            retries,
          };
        }
        await Bun.sleep(config.retryDelay! * retries);
      }
    }

    return {
      operationId: operation.id,
      success: false,
      key: operation.key,
      error: 'Max retries exceeded',
      duration: Date.now() - startTime,
      retries,
    };
  }

  private async executeUpload(
    operation: BatchOperation,
    bucket: string,
    config: BatchConfig
  ): Promise<BatchResult> {
    // Implementation would use actual R2 API
    // For now, simulate success
    const data = JSON.stringify(operation.data);
    const size = Buffer.byteLength(data);

    // Emit event
    r2EventSystem.emit({
      type: 'object:created',
      bucket,
      key: operation.key,
      source: 'R2BatchOperations',
      metadata: { size, batchOperation: true },
    });

    return {
      operationId: operation.id,
      success: true,
      key: operation.key,
      size,
      etag: `"${crypto.randomUUID().slice(0, 16)}"`,
      duration: 0,
      retries: 0,
    };
  }

  private async executeDownload(operation: BatchOperation, bucket: string): Promise<BatchResult> {
    // Simulate download
    const size = 1024; // Mock size

    r2EventSystem.emit({
      type: 'object:accessed',
      bucket,
      key: operation.key,
      source: 'R2BatchOperations',
    });

    return {
      operationId: operation.id,
      success: true,
      key: operation.key,
      size,
      duration: 0,
      retries: 0,
    };
  }

  private async executeDelete(operation: BatchOperation, bucket: string): Promise<BatchResult> {
    r2EventSystem.emit({
      type: 'object:deleted',
      bucket,
      key: operation.key,
      source: 'R2BatchOperations',
    });

    return {
      operationId: operation.id,
      success: true,
      key: operation.key,
      duration: 0,
      retries: 0,
    };
  }

  private async executeCopy(operation: BatchOperation, bucket: string): Promise<BatchResult> {
    const { destBucket, destKey } = operation.options || {};

    return {
      operationId: operation.id,
      success: true,
      key: operation.key,
      duration: 0,
      retries: 0,
    };
  }

  private async executeMove(operation: BatchOperation, bucket: string): Promise<BatchResult> {
    // Copy then delete
    const copyResult = await this.executeCopy(operation, bucket);
    if (copyResult.success) {
      await this.executeDelete(operation, bucket);
    }
    return copyResult;
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): BatchJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get all jobs
   */
  getAllJobs(): BatchJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get active jobs
   */
  getActiveJobs(): BatchJob[] {
    return this.getAllJobs().filter(job => job.status === 'running');
  }

  /**
   * Cancel a running job
   */
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'running') {
      job.status = 'cancelled';
      job.completedAt = new Date().toISOString();
      this.activeJobs.delete(jobId);
      return true;
    }
    return false;
  }

  /**
   * Wait for job completion
   */
  async waitForJob(jobId: string, timeout: number = 300000): Promise<BatchJob> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const job = this.jobs.get(jobId);
      if (!job) throw new Error(`Job not found: ${jobId}`);

      if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
        return job;
      }

      await Bun.sleep(100);
    }

    throw new Error(`Timeout waiting for job: ${jobId}`);
  }

  /**
   * Create compressed batch for large operations
   */
  async createCompressedBatch(
    operations: BatchOperation[]
  ): Promise<{ compressed: boolean; data: Buffer; originalSize: number; compressedSize: number }> {
    const data = Buffer.from(JSON.stringify(operations));
    const originalSize = data.length;

    if (originalSize < this.config.compressionThreshold!) {
      return { compressed: false, data, originalSize, compressedSize: originalSize };
    }

    // Use Bun's native gzip
    const compressed = Bun.gzipSync(data);

    return {
      compressed: true,
      data: compressed,
      originalSize,
      compressedSize: compressed.length,
    };
  }

  /**
   * Generate batch operation report
   */
  generateReport(jobId: string): string {
    const job = this.jobs.get(jobId);
    if (!job) return `Job not found: ${jobId}`;

    const duration =
      job.completedAt && job.startedAt
        ? new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime()
        : 0;

    return `
📦 Batch Operation Report: ${jobId}
${'='.repeat(50)}
Status: ${job.status.toUpperCase()}
Duration: ${(duration / 1000).toFixed(2)}s

Operations:
  Total: ${job.progress.total}
  Completed: ${job.progress.completed} ✅
  Failed: ${job.progress.failed} ❌
  Success Rate: ${((job.progress.completed / job.progress.total) * 100).toFixed(1)}%

Results:
${job.results.map(r => `  ${r.success ? '✅' : '❌'} ${r.key}${r.error ? ` - ${r.error}` : ''}`).join('\n')}
`.trim();
  }
}

// Export singleton
export const r2BatchOperations = new R2BatchOperations();

// CLI interface
if (import.meta.main) {
  const batch = r2BatchOperations;

  console.log(styled('📦 R2 Batch Operations Demo', 'accent'));
  console.log(styled('==========================', 'accent'));

  // Demo: Batch upload
  const uploadItems = [
    { key: 'test/file1.json', data: { test: 1 } },
    { key: 'test/file2.json', data: { test: 2 } },
    { key: 'test/file3.json', data: { test: 3 } },
  ];

  console.log(styled('\n🚀 Starting batch upload...', 'info'));
  const job = await batch.batchUpload('scanner-cookies', uploadItems, {
    concurrency: 2,
    retryAttempts: 2,
  });

  console.log(styled(`\n📊 Job ID: ${job.id}`, 'muted'));
  console.log(styled(`Status: ${job.status}`, 'info'));

  await batch.waitForJob(job.id);
  const completedJob = batch.getJob(job.id);

  console.log(styled('\n' + batch.generateReport(job.id), 'success'));
}
