#!/usr/bin/env bun

/**
 * 🔄 R2 Multi-Bucket Sync Service
 * 
 * Cross-bucket and cross-region synchronization with:
 * - Bi-directional sync with conflict resolution
 * - Real-time and scheduled synchronization
 * - Differential sync for efficiency
 * - Conflict detection and resolution strategies
 * - Sync job monitoring and management
 */

import { styled, FW_COLORS } from '../theme/colors.ts';
import { r2EventSystem } from './r2-event-system.ts';
import { r2BatchOperations } from './r2-batch-operations.ts';

export type SyncDirection = 'one-way' | 'bi-directional' | 'multi-master';
export type ConflictStrategy = 'source-wins' | 'target-wins' | 'timestamp-wins' | 'manual' | 'merge';
export type SyncMode = 'realtime' | 'scheduled' | 'manual';

export interface SyncJob {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  direction: SyncDirection;
  mode: SyncMode;
  source: SyncEndpoint;
  targets: SyncEndpoint[];
  config: SyncConfig;
  schedule?: SyncSchedule;
  stats: SyncStats;
  lastRun?: string;
  nextRun?: string;
  createdAt: string;
}

export interface SyncEndpoint {
  bucket: string;
  prefix?: string;
  region?: string;
  credentials?: {
    accountId?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
  };
}

export interface SyncConfig {
  includePatterns?: string[];
  excludePatterns?: string[];
  conflictStrategy: ConflictStrategy;
  deleteOnTarget?: boolean;
  preserveMetadata?: boolean;
  compressionEnabled?: boolean;
  encryptionEnabled?: boolean;
  verifyChecksums?: boolean;
  bandwidthLimit?: number; // KB/s
}

export interface SyncSchedule {
  type: 'interval' | 'cron' | 'event-driven';
  interval?: number; // seconds
  cron?: string;
  events?: string[];
}

export interface SyncStats {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  objectsSynced: number;
  objectsFailed: number;
  bytesTransferred: number;
  conflictsResolved: number;
  lastDuration: number;
  averageDuration: number;
}

export interface SyncResult {
  jobId: string;
  timestamp: string;
  status: 'success' | 'partial' | 'failed';
  objects: Array<{
    key: string;
    action: 'created' | 'updated' | 'deleted' | 'skipped' | 'conflict';
    size: number;
    duration: number;
    error?: string;
  }>;
  conflicts: Array<{
    key: string;
    sourceVersion: string;
    targetVersion: string;
    resolution: string;
  }>;
  duration: number;
  bytesTransferred: number;
}

export interface SyncConflict {
  key: string;
  source: {
    etag: string;
    lastModified: string;
    size: number;
  };
  target: {
    etag: string;
    lastModified: string;
    size: number;
  };
  detectedAt: string;
}

export class R2SyncService {
  private jobs: Map<string, SyncJob> = new Map();
  private timers: Map<string, Timer> = new Map();
  private activeSyncs: Set<string> = new Set();
  private syncHistory: SyncResult[] = [];
  private maxHistorySize: number = 1000;

  /**
   * Initialize sync service
   */
  async initialize(): Promise<void> {
    console.log(styled('🔄 Initializing R2 Sync Service', 'accent'));
    
    // Restore jobs from storage if available
    await this.restoreJobs();
    
    // Start scheduled jobs
    for (const job of this.jobs.values()) {
      if (job.mode === 'scheduled' && job.status !== 'paused') {
        this.scheduleJob(job);
      }
    }

    console.log(styled(`✅ Sync service initialized (${this.jobs.size} jobs)`, 'success'));
  }

  /**
   * Create a new sync job
   */
  createJob(config: Omit<SyncJob, 'id' | 'status' | 'stats' | 'createdAt'>): SyncJob {
    const job: SyncJob = {
      ...config,
      id: `sync-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
      status: 'pending',
      stats: {
        totalRuns: 0,
        successfulRuns: 0,
        failedRuns: 0,
        objectsSynced: 0,
        objectsFailed: 0,
        bytesTransferred: 0,
        conflictsResolved: 0,
        lastDuration: 0,
        averageDuration: 0
      },
      createdAt: new Date().toISOString()
    };

    this.jobs.set(job.id, job);
    
    if (job.mode === 'scheduled') {
      this.scheduleJob(job);
    }

    // Emit event
    r2EventSystem.emit({
      type: 'bucket:sync-started',
      bucket: job.source.bucket,
      source: 'R2SyncService',
      metadata: { jobId: job.id, direction: job.direction }
    });

    console.log(styled(`📋 Created sync job: ${job.name} (${job.id})`, 'success'));
    return job;
  }

  /**
   * Execute a sync job
   */
  async executeJob(jobId: string): Promise<SyncResult> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job not found: ${jobId}`);
    if (this.activeSyncs.has(jobId)) throw new Error(`Job already running: ${jobId}`);

    this.activeSyncs.add(jobId);
    job.status = 'running';
    job.lastRun = new Date().toISOString();

    console.log(styled(`🚀 Starting sync: ${job.name}`, 'info'));
    const startTime = Date.now();

    const result: SyncResult = {
      jobId,
      timestamp: new Date().toISOString(),
      status: 'success',
      objects: [],
      conflicts: [],
      duration: 0,
      bytesTransferred: 0
    };

    try {
      for (const target of job.targets) {
        const targetResult = await this.syncEndpoint(job.source, target, job.config, job.direction);
        result.objects.push(...targetResult.objects);
        result.conflicts.push(...targetResult.conflicts);
        result.bytesTransferred += targetResult.bytesTransferred;
      }

      // Determine overall status
      if (result.objects.some(o => o.error)) {
        result.status = result.objects.some(o => !o.error) ? 'partial' : 'failed';
      }

    } catch (error) {
      result.status = 'failed';
      console.error(styled(`❌ Sync failed: ${error.message}`, 'error'));
    }

    result.duration = Date.now() - startTime;
    this.activeSyncs.delete(jobId);
    
    // Update job stats
    this.updateJobStats(job, result);
    
    // Store result
    this.syncHistory.push(result);
    if (this.syncHistory.length > this.maxHistorySize) {
      this.syncHistory = this.syncHistory.slice(-this.maxHistorySize);
    }

    // Schedule next run if applicable
    if (job.mode === 'scheduled' && job.schedule) {
      this.scheduleNextRun(job);
    }

    // Emit completion event
    r2EventSystem.emit({
      type: result.status === 'success' ? 'bucket:sync-completed' : 'bucket:sync-failed',
      bucket: job.source.bucket,
      source: 'R2SyncService',
      metadata: { 
        jobId, 
        status: result.status,
        objects: result.objects.length,
        conflicts: result.conflicts.length
      }
    });

    console.log(styled(`✅ Sync completed: ${result.objects.length} objects, ${result.conflicts.length} conflicts (${result.duration}ms)`, 
      result.status === 'success' ? 'success' : 'warning'));

    return result;
  }

  /**
   * Sync between two endpoints
   */
  private async syncEndpoint(
    source: SyncEndpoint,
    target: SyncEndpoint,
    config: SyncConfig,
    direction: SyncDirection
  ): Promise<Partial<SyncResult>> {
    const result: Partial<SyncResult> = {
      objects: [],
      conflicts: [],
      bytesTransferred: 0
    };

    // List source objects
    const sourceObjects = await this.listObjects(source);
    const targetObjects = await this.listObjects(target);

    // Create lookup maps
    const targetMap = new Map(targetObjects.map(o => [o.key, o]));

    // Sync source to target
    for (const sourceObj of sourceObjects) {
      if (!this.matchesPatterns(sourceObj.key, config)) continue;

      const targetObj = targetMap.get(sourceObj.key);
      
      if (!targetObj) {
        // Object doesn't exist in target - create
        await this.copyObject(source, target, sourceObj.key);
        result.objects!.push({
          key: sourceObj.key,
          action: 'created',
          size: sourceObj.size,
          duration: 0
        });
        result.bytesTransferred! += sourceObj.size;
      } else if (sourceObj.etag !== targetObj.etag) {
        // Object exists but differs - check for conflict
        if (targetObj.lastModified > sourceObj.lastModified && direction === 'bi-directional') {
          // Conflict detected
          const conflict: SyncConflict = {
            key: sourceObj.key,
            source: {
              etag: sourceObj.etag,
              lastModified: sourceObj.lastModified,
              size: sourceObj.size
            },
            target: {
              etag: targetObj.etag,
              lastModified: targetObj.lastModified,
              size: targetObj.size
            },
            detectedAt: new Date().toISOString()
          };

          const resolution = await this.resolveConflict(conflict, config.conflictStrategy);
          result.conflicts!.push({
            key: sourceObj.key,
            sourceVersion: conflict.source.etag,
            targetVersion: conflict.target.etag,
            resolution
          });

          result.objects!.push({
            key: sourceObj.key,
            action: 'conflict',
            size: 0,
            duration: 0
          });
        } else {
          // Update target
          await this.copyObject(source, target, sourceObj.key);
          result.objects!.push({
            key: sourceObj.key,
            action: 'updated',
            size: sourceObj.size,
            duration: 0
          });
          result.bytesTransferred! += sourceObj.size;
        }
      } else {
        // Object identical - skip
        result.objects!.push({
          key: sourceObj.key,
          action: 'skipped',
          size: 0,
          duration: 0
        });
      }
    }

    // Handle deletions if enabled
    if (config.deleteOnTarget) {
      const sourceKeys = new Set(sourceObjects.map(o => o.key));
      for (const targetObj of targetObjects) {
        if (!sourceKeys.has(targetObj.key)) {
          await this.deleteObject(target, targetObj.key);
          result.objects!.push({
            key: targetObj.key,
            action: 'deleted',
            size: 0,
            duration: 0
          });
        }
      }
    }

    return result;
  }

  /**
   * Resolve sync conflicts
   */
  private async resolveConflict(
    conflict: SyncConflict,
    strategy: ConflictStrategy
  ): Promise<string> {
    switch (strategy) {
      case 'source-wins':
        return 'source-wins';
      case 'target-wins':
        return 'target-wins';
      case 'timestamp-wins':
        return new Date(conflict.source.lastModified) > new Date(conflict.target.lastModified)
          ? 'source-wins'
          : 'target-wins';
      case 'manual':
        // In production, would queue for manual review
        return 'pending-manual';
      case 'merge':
        // In production, would attempt to merge
        return 'merge-attempted';
      default:
        return 'source-wins';
    }
  }

  /**
   * Schedule a job for execution
   */
  private scheduleJob(job: SyncJob): void {
    if (!job.schedule) return;

    if (job.schedule.type === 'interval' && job.schedule.interval) {
      const timer = setInterval(() => {
        if (job.status !== 'paused') {
          this.executeJob(job.id).catch(console.error);
        }
      }, job.schedule.interval * 1000);
      
      this.timers.set(job.id, timer);
    }
  }

  /**
   * Schedule next run
   */
  private scheduleNextRun(job: SyncJob): void {
    if (!job.schedule) return;

    if (job.schedule.type === 'interval' && job.schedule.interval) {
      const nextRun = new Date(Date.now() + job.schedule.interval * 1000);
      job.nextRun = nextRun.toISOString();
    }
  }

  /**
   * Pause a job
   */
  pauseJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status === 'running') return false;

    job.status = 'paused';
    
    // Clear timer
    const timer = this.timers.get(jobId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(jobId);
    }

    return true;
  }

  /**
   * Resume a paused job
   */
  resumeJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'paused') return false;

    job.status = 'pending';
    
    if (job.mode === 'scheduled') {
      this.scheduleJob(job);
    }

    return true;
  }

  /**
   * Delete a job
   */
  deleteJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status === 'running') return false;

    // Clear timer
    const timer = this.timers.get(jobId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(jobId);
    }

    return this.jobs.delete(jobId);
  }

  /**
   * Get job status
   */
  getJob(jobId: string): SyncJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get all jobs
   */
  getAllJobs(): SyncJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get sync history
   */
  getHistory(jobId?: string, limit: number = 100): SyncResult[] {
    let history = this.syncHistory;
    if (jobId) {
      history = history.filter(h => h.jobId === jobId);
    }
    return history.slice(-limit);
  }

  /**
   * Get service statistics
   */
  getStats(): {
    totalJobs: number;
    activeJobs: number;
    pausedJobs: number;
    totalObjectsSynced: number;
    totalBytesTransferred: number;
    totalConflicts: number;
  } {
    const jobs = this.getAllJobs();
    return {
      totalJobs: jobs.length,
      activeJobs: jobs.filter(j => j.status === 'running').length,
      pausedJobs: jobs.filter(j => j.status === 'paused').length,
      totalObjectsSynced: jobs.reduce((sum, j) => sum + j.stats.objectsSynced, 0),
      totalBytesTransferred: jobs.reduce((sum, j) => sum + j.stats.bytesTransferred, 0),
      totalConflicts: jobs.reduce((sum, j) => sum + j.stats.conflictsResolved, 0)
    };
  }

  /**
   * Display sync status
   */
  displayStatus(): void {
    console.log(styled('\n🔄 R2 Sync Service Status', 'accent'));
    console.log(styled('=========================', 'accent'));

    const stats = this.getStats();
    console.log(styled('\n📊 Overall Statistics:', 'info'));
    console.log(styled(`  Total Jobs: ${stats.totalJobs}`, 'muted'));
    console.log(styled(`  Active Syncs: ${stats.activeJobs}`, 'muted'));
    console.log(styled(`  Paused Jobs: ${stats.pausedJobs}`, 'muted'));
    console.log(styled(`  Objects Synced: ${stats.totalObjectsSynced.toLocaleString()}`, 'muted'));
    console.log(styled(`  Data Transferred: ${(stats.totalBytesTransferred / 1024 / 1024 / 1024).toFixed(2)} GB`, 'muted'));

    console.log(styled('\n📋 Sync Jobs:', 'info'));
    for (const job of this.jobs.values()) {
      const statusIcon = {
        pending: '⏳',
        running: '🔄',
        completed: '✅',
        failed: '❌',
        paused: '⏸️'
      }[job.status];
      
      console.log(styled(`  ${statusIcon} ${job.name} (${job.id})`, 'muted'));
      console.log(styled(`     Direction: ${job.direction} | Mode: ${job.mode} | Runs: ${job.stats.totalRuns}`, 'muted'));
      if (job.lastRun) {
        console.log(styled(`     Last Run: ${new Date(job.lastRun).toLocaleString()}`, 'muted'));
      }
    }
  }

  // Private helper methods

  private async restoreJobs(): Promise<void> {
    // In production, would load from persistent storage
  }

  private async listObjects(endpoint: SyncEndpoint): Promise<Array<{
    key: string;
    etag: string;
    size: number;
    lastModified: string;
  }>> {
    // Mock implementation
    return [];
  }

  private async copyObject(source: SyncEndpoint, target: SyncEndpoint, key: string): Promise<void> {
    // Mock implementation
  }

  private async deleteObject(endpoint: SyncEndpoint, key: string): Promise<void> {
    // Mock implementation
  }

  private matchesPatterns(key: string, config: SyncConfig): boolean {
    // Check include patterns
    if (config.includePatterns && config.includePatterns.length > 0) {
      const included = config.includePatterns.some(pattern => 
        key.includes(pattern) || this.matchGlob(key, pattern)
      );
      if (!included) return false;
    }

    // Check exclude patterns
    if (config.excludePatterns) {
      const excluded = config.excludePatterns.some(pattern => 
        key.includes(pattern) || this.matchGlob(key, pattern)
      );
      if (excluded) return false;
    }

    return true;
  }

  private matchGlob(str: string, pattern: string): boolean {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
    return regex.test(str);
  }

  private updateJobStats(job: SyncJob, result: SyncResult): void {
    job.stats.totalRuns++;
    
    if (result.status === 'success') {
      job.stats.successfulRuns++;
    } else {
      job.stats.failedRuns++;
    }

    job.stats.objectsSynced += result.objects.filter(o => !o.error).length;
    job.stats.objectsFailed += result.objects.filter(o => o.error).length;
    job.stats.bytesTransferred += result.bytesTransferred;
    job.stats.conflictsResolved += result.conflicts.length;
    job.stats.lastDuration = result.duration;
    
    // Update average duration
    job.stats.averageDuration = (
      (job.stats.averageDuration * (job.stats.totalRuns - 1) + result.duration) / 
      job.stats.totalRuns
    );

    job.status = result.status === 'failed' ? 'failed' : 'pending';
  }
}

// Export singleton
export const r2SyncService = new R2SyncService();

// CLI interface
if (import.meta.main) {
  const sync = r2SyncService;
  await sync.initialize();

  console.log(styled('🔄 R2 Sync Service Demo', 'accent'));
  console.log(styled('=======================', 'accent'));

  // Create a sample sync job
  const job = sync.createJob({
    name: 'MCP Data Sync',
    direction: 'one-way',
    mode: 'manual',
    source: { bucket: 'scanner-cookies', prefix: 'mcp/' },
    targets: [{ bucket: 'scanner-cookies-backup', prefix: 'mcp/' }],
    config: {
      conflictStrategy: 'source-wins',
      deleteOnTarget: false,
      preserveMetadata: true
    }
  });

  console.log(styled(`\n📋 Created job: ${job.name}`, 'success'));

  // Display status
  sync.displayStatus();

  // Show stats
  const stats = sync.getStats();
  console.log(styled('\n📊 Service Stats:', 'info'));
  console.log(styled(`  Jobs: ${stats.totalJobs}`, 'muted'));
  console.log(styled(`  Objects Synced: ${stats.totalObjectsSynced}`, 'muted'));
}
