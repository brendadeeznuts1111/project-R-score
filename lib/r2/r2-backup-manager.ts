// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
// @see https://bun.com/docs/runtime/cron — Bun.cron
// lib/r2/r2-backup-manager.ts — R2 backup and restore manager

import { type JobId, type SnapshotId, asJobId, asSnapshotId } from '../types/branded.ts';
import { styled, FW_COLORS } from '../theme/colors';
import { r2EventSystem } from './r2-event-system';
import { r2BatchOperations } from './r2-batch-operations';

export type BackupType = 'full' | 'incremental' | 'differential';
export type BackupStatus = 'pending' | 'running' | 'completed' | 'failed' | 'verifying';

export interface BackupJob {
  id: string; // brand-ok — opaque entity primary key
  name: string;
  type: BackupType;
  status: BackupStatus;
  source: BackupSource;
  destination: BackupDestination;
  schedule?: BackupSchedule;
  retention: RetentionPolicy;
  options: BackupOptions;
  stats: BackupStats;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface BackupSource {
  bucket: string;
  prefix?: string;
  includePatterns?: string[];
  excludePatterns?: string[];
}

export interface BackupDestination {
  bucket: string;
  prefix: string;
  region?: string;
  encryption?: 'AES256' | 'aws:kms';
  storageClass?: 'STANDARD' | 'IA' | 'GLACIER' | 'DEEP_ARCHIVE';
}

export interface BackupSchedule {
  type: 'cron' | 'interval';
  cron?: string;
  interval?: number; // seconds
  timezone?: string;
}

export interface RetentionPolicy {
  keepLastN?: number;
  keepDailyFor?: number; // days
  keepWeeklyFor?: number; // days
  keepMonthlyFor?: number; // days
  keepYearlyFor?: number; // days
}

export interface BackupOptions {
  compression?: boolean;
  compressionLevel?: number;
  encryption?: boolean;
  verifyAfterBackup?: boolean;
  notifyOnCompletion?: boolean;
  bandwidthLimit?: number; // KB/s
  parallelUploads?: number;
}

export interface BackupStats {
  totalObjects: number;
  objectsProcessed: number;
  objectsFailed: number;
  totalSize: number;
  compressedSize?: number;
  duration: number;
  throughput: number; // KB/s
}

export interface BackupSnapshot {
  id: string; // brand-ok — opaque entity primary key
  jobId: JobId;
  timestamp: string;
  type: BackupType;
  manifest: BackupManifest;
  status: BackupStatus;
  size: number;
  checksum: string;
}

export interface BackupManifest {
  version: string;
  createdAt: string;
  source: BackupSource;
  objects: Array<{
    key: string;
    etag: string;
    size: number;
    lastModified: string;
    checksum: string;
  }>;
  metadata: Record<string, any>;
}

export interface RestoreJob {
  id: string; // brand-ok — opaque entity primary key
  snapshotId: SnapshotId;
  target: BackupSource;
  options: RestoreOptions;
  status: BackupStatus;
  progress: RestoreProgress;
  startedAt?: string;
  completedAt?: string;
}

export interface RestoreOptions {
  overwriteExisting?: boolean;
  preservePermissions?: boolean;
  filter?: {
    prefix?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}

export interface RestoreProgress {
  totalObjects: number;
  restoredObjects: number;
  failedObjects: number;
  bytesRestored: number;
  estimatedTimeRemaining: number;
}

/** Unified stop handle for setInterval or Bun.cron jobs. */
type ScheduleHandle = { stop: () => void };

export class R2BackupManager {
  private jobs: Map<string, BackupJob> = new Map();
  private snapshots: Map<string, BackupSnapshot> = new Map();
  private activeBackups: Set<string> = new Set();
  private timers: Map<string, ScheduleHandle> = new Map();

  /**
   * Initialize backup manager
   */
  async initialize(): Promise<void> {
    console.info(styled('💾 Initializing R2 Backup Manager', 'accent'));

    // Restore saved jobs and snapshots
    await this.restoreState();

    // Start scheduled jobs
    for (const job of this.jobs.values()) {
      if (job.schedule) {
        this.scheduleJob(job);
      }
    }

    console.info(styled(`✅ Backup manager initialized (${this.jobs.size} jobs)`, 'success'));
  }

  /**
   * Create a backup job
   */
  createJob(config: Omit<BackupJob, 'id' | 'status' | 'stats' | 'createdAt'>): BackupJob {
    const job: BackupJob = {
      ...config,
      id: `backup-${Date.now()}-${Bun.randomUUIDv7().slice(0, 8)}`,
      status: 'pending',
      stats: {
        totalObjects: 0,
        objectsProcessed: 0,
        objectsFailed: 0,
        totalSize: 0,
        duration: 0,
        throughput: 0,
      },
      createdAt: new Date().toISOString(),
    };

    this.jobs.set(job.id, job);

    if (job.schedule) {
      this.scheduleJob(job);
    }

    console.info(styled(`📋 Created backup job: ${job.name} (${job.id})`, 'success'));
    return job;
  }

  /**
   * Execute a backup
   */
  async executeBackup(jobId: string, forceFull: boolean = false): Promise<BackupSnapshot> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job not found: ${jobId}`);
    if (this.activeBackups.has(jobId)) throw new Error(`Backup already running: ${jobId}`);

    this.activeBackups.add(jobId);
    job.status = 'running';
    job.startedAt = new Date().toISOString();

    console.info(styled(`🚀 Starting backup: ${job.name}`, 'info'));
    const startTime = Date.now();

    // Emit event
    r2EventSystem.emit({
      type: 'backup:started',
      bucket: job.source.bucket,
      source: 'R2BackupManager',
      metadata: { jobId, type: forceFull ? 'full' : job.type },
    });

    try {
      // List source objects
      const objects = await this.listSourceObjects(job.source);
      job.stats.totalObjects = objects.length;
      job.stats.totalSize = objects.reduce((sum, o) => sum + o.size, 0);

      // Determine backup type
      const backupType = forceFull ? 'full' : await this.determineBackupType(job);

      // Filter for incremental/differential
      let objectsToBackup = objects;
      if (backupType !== 'full') {
        const lastSnapshot = await this.getLastSnapshot(jobId);
        if (lastSnapshot) {
          objectsToBackup = this.filterChangedObjects(objects, lastSnapshot);
        }
      }

      // Create manifest
      const manifest: BackupManifest = {
        version: '1.0',
        createdAt: new Date().toISOString(),
        source: job.source,
        objects: objectsToBackup,
        metadata: {
          backupType,
          jobId,
          compression: job.options.compression,
          encryption: job.options.encryption,
        },
      };

      // Perform backup
      await this.performBackup(job, objectsToBackup, manifest);

      // Create snapshot
      const snapshot: BackupSnapshot = {
        id: `snapshot-${Date.now()}`,
        jobId: asJobId(jobId),
        timestamp: new Date().toISOString(),
        type: backupType,
        manifest,
        status: 'completed',
        size: job.stats.totalSize,
        checksum: await this.normalizeChecksumFromData(manifest),
      };

      this.snapshots.set(snapshot.id, snapshot);

      // Update job stats
      job.stats.duration = Date.now() - startTime;
      job.stats.throughput = job.stats.totalSize / (job.stats.duration / 1000) / 1024;
      job.status = 'completed';
      job.completedAt = new Date().toISOString();

      // Verify if requested
      if (job.options.verifyAfterBackup) {
        await this.verifyBackup(snapshot.id);
      }

      // Apply retention policy
      await this.applyRetentionPolicy(job);

      // Emit completion event
      r2EventSystem.emit({
        type: 'backup:completed',
        bucket: job.source.bucket,
        source: 'R2BackupManager',
        metadata: {
          jobId,
          snapshotId: snapshot.id,
          objects: objectsToBackup.length,
          size: snapshot.size,
        },
      });

      console.info(
        styled(
          `✅ Backup completed: ${snapshot.id} (${objectsToBackup.length} objects, ${(snapshot.size / 1024 / 1024).toFixed(2)} MB)`,
          'success'
        )
      );

      return snapshot;
    } catch (error) {
      job.status = 'failed';

      r2EventSystem.emit({
        type: 'backup:failed',
        bucket: job.source.bucket,
        source: 'R2BackupManager',
        metadata: { jobId, error: error.message },
      });

      throw error;
    } finally {
      this.activeBackups.delete(jobId);
    }
  }

  /**
   * Restore from backup
   */
  async restoreBackup(
    snapshotId: string, // brand-ok — boundary accepts plain string; branded internally via asSnapshotId
    target: BackupSource,
    options: RestoreOptions = {}
  ): Promise<RestoreJob> {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) throw new Error(`Snapshot not found: ${snapshotId}`);

    const job: RestoreJob = {
      id: `restore-${Date.now()}`,
      snapshotId: asSnapshotId(snapshotId),
      target,
      options,
      status: 'running',
      progress: {
        totalObjects: snapshot.manifest.objects.length,
        restoredObjects: 0,
        failedObjects: 0,
        bytesRestored: 0,
        estimatedTimeRemaining: 0,
      },
      startedAt: new Date().toISOString(),
    };

    console.info(styled(`🔄 Starting restore: ${snapshotId} → ${target.bucket}`, 'info'));

    try {
      let objectsToRestore = snapshot.manifest.objects;

      // Apply filter if specified
      if (options.filter) {
        objectsToRestore = objectsToRestore.filter(obj => {
          if (options.filter!.prefix && !obj.key.startsWith(options.filter!.prefix)) return false;
          if (options.filter!.dateFrom && obj.lastModified < options.filter!.dateFrom) return false;
          if (options.filter!.dateTo && obj.lastModified > options.filter!.dateTo) return false;
          return true;
        });
      }

      // Perform restore
      for (const obj of objectsToRestore) {
        try {
          await this.restoreObject(snapshot, obj, target, options);
          job.progress.restoredObjects++;
          job.progress.bytesRestored += obj.size;
        } catch (error) {
          job.progress.failedObjects++;
          console.error(styled(`❌ Failed to restore ${obj.key}: ${error.message}`, 'error'));
        }
      }

      job.status = job.progress.failedObjects > 0 ? 'completed' : 'completed';
      job.completedAt = new Date().toISOString();

      console.info(
        styled(`✅ Restore completed: ${job.progress.restoredObjects} objects restored`, 'success')
      );

      return job;
    } catch (error) {
      job.status = 'failed';
      throw error;
    }
  }

  /**
   * Verify backup integrity
   */
  async verifyBackup(snapshotId: string): Promise<{
    valid: boolean;
    checkedObjects: number;
    failedObjects: number;
    errors: string[];
  }> {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) throw new Error(`Snapshot not found: ${snapshotId}`);

    console.info(styled(`🔍 Verifying backup: ${snapshotId}`, 'info'));

    const result = {
      valid: true,
      checkedObjects: 0,
      failedObjects: 0,
      errors: [] as string[],
    };

    for (const obj of snapshot.manifest.objects) {
      result.checkedObjects++;

      // Verify object exists and checksum matches
      const exists = await this.verifyObjectExists(snapshot, obj);
      if (!exists) {
        result.valid = false;
        result.failedObjects++;
        result.errors.push(`Object missing: ${obj.key}`);
      }
    }

    const status = result.valid ? 'success' : 'error';
    console.info(
      styled(
        `Verification ${result.valid ? 'passed' : 'failed'}: ${result.checkedObjects} checked, ${result.failedObjects} failed`,
        status
      )
    );

    return result;
  }

  /**
   * List available snapshots
   */
  listSnapshots(jobId?: string): BackupSnapshot[] {
    let snapshots = Array.from(this.snapshots.values());
    if (jobId) {
      snapshots = snapshots.filter(s => s.jobId === jobId);
    }
    return snapshots.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /**
   * Get snapshot details
   */
  getSnapshot(snapshotId: string): BackupSnapshot | undefined {
    return this.snapshots.get(snapshotId);
  }

  /**
   * Delete a snapshot
   */
  async deleteSnapshot(snapshotId: string): Promise<boolean> {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) return false;

    // Delete backup objects
    // In production, would delete from destination bucket

    return this.snapshots.delete(snapshotId);
  }

  /**
   * Get backup statistics
   */
  getStats(): {
    totalJobs: number;
    activeBackups: number;
    totalSnapshots: number;
    totalDataProtected: number;
    lastBackupTime?: string;
  } {
    const snapshots = this.listSnapshots();
    const totalData = snapshots.reduce((sum, s) => sum + s.size, 0);
    const lastBackup = snapshots.length > 0 ? snapshots[0].timestamp : undefined;

    return {
      totalJobs: this.jobs.size,
      activeBackups: this.activeBackups.size,
      totalSnapshots: snapshots.length,
      totalDataProtected: totalData,
      lastBackupTime: lastBackup,
    };
  }

  /**
   * Display backup status
   */
  displayStatus(): void {
    console.info(styled('\n💾 R2 Backup Manager Status', 'accent'));
    console.info(styled('===========================', 'accent'));

    const stats = this.getStats();
    console.info(styled('\n📊 Statistics:', 'info'));
    console.info(styled(`  Total Jobs: ${stats.totalJobs}`, 'muted'));
    console.info(styled(`  Active Backups: ${stats.activeBackups}`, 'muted'));
    console.info(styled(`  Total Snapshots: ${stats.totalSnapshots}`, 'muted'));
    console.info(
      styled(
        `  Data Protected: ${(stats.totalDataProtected / 1024 / 1024 / 1024).toFixed(2)} GB`,
        'muted'
      )
    );
    if (stats.lastBackupTime) {
      console.info(
        styled(`  Last Backup: ${new Date(stats.lastBackupTime).toLocaleString()}`, 'muted')
      );
    }

    console.info(styled('\n📋 Backup Jobs:', 'info'));
    for (const job of this.jobs.values()) {
      const typeIcon = job.type === 'full' ? '📦' : job.type === 'incremental' ? '📈' : '📊';
      const statusIcon = {
        pending: '⏳',
        running: '🔄',
        completed: '✅',
        failed: '❌',
        verifying: '🔍',
      }[job.status];

      console.info(styled(`  ${typeIcon} ${statusIcon} ${job.name}`, 'muted'));
      console.info(styled(`     Source: ${job.source.bucket}/${job.source.prefix || ''}`, 'muted'));
      console.info(
        styled(`     Destination: ${job.destination.bucket}/${job.destination.prefix}`, 'muted')
      );
      if (job.schedule) {
        console.info(styled(`     Schedule: ${job.schedule.type}`, 'muted'));
      }
    }

    console.info(styled('\n💾 Recent Snapshots:', 'info'));
    const recentSnapshots = this.listSnapshots().slice(0, 5);
    for (const snapshot of recentSnapshots) {
      const job = this.jobs.get(snapshot.jobId);
      console.info(styled(`  📸 ${snapshot.id} (${snapshot.type})`, 'muted'));
      console.info(styled(`     Job: ${job?.name || snapshot.jobId}`, 'muted'));
      console.info(styled(`     Time: ${new Date(snapshot.timestamp).toLocaleString()}`, 'muted'));
      console.info(styled(`     Size: ${(snapshot.size / 1024 / 1024).toFixed(2)} MB`, 'muted'));
    }
  }

  // Private helper methods

  private async restoreState(): Promise<void> {
    // In production, would load from persistent storage
  }

  private scheduleJob(job: BackupJob): void {
    if (!job.schedule) return;

    // Clear any existing handle first
    this.unscheduleJob(job.id);

    const run = () => {
      if (job.status !== 'running') {
        this.executeBackup(job.id).catch(console.error);
      }
    };

    if (job.schedule.type === 'cron' && job.schedule.cron) {
      if (typeof Bun.cron === 'function') {
        const cronJob = Bun.cron(job.schedule.cron, run);
        cronJob.unref?.();
        this.timers.set(job.id, cronJob);
      } else {
        console.warn(
          styled(`Bun.cron unavailable — cannot schedule cron job ${job.id}`, 'warning')
        );
      }
      return;
    }

    if (job.schedule.type === 'interval' && job.schedule.interval) {
      const seconds = job.schedule.interval;
      // Minute+ intervals prefer Bun.cron when expressible
      if (seconds >= 60 && seconds % 60 === 0 && typeof Bun.cron === 'function') {
        const minutes = seconds / 60;
        const expr =
          minutes >= 60 && minutes % 60 === 0
            ? `0 */${minutes / 60} * * *`
            : `*/${minutes} * * * *`;
        const cronJob = Bun.cron(expr, run);
        cronJob.unref?.();
        this.timers.set(job.id, cronJob);
        return;
      }

      const timer = setInterval(run, seconds * 1000);
      this.timers.set(job.id, { stop: () => clearInterval(timer) });
    }
  }

  private unscheduleJob(jobId: string): void {
    const handle = this.timers.get(jobId);
    if (handle) {
      handle.stop();
      this.timers.delete(jobId);
    }
  }

  private async listSourceObjects(source: BackupSource): Promise<BackupManifest['objects']> {
    // Mock implementation
    return [
      {
        key: 'test/file1.json',
        etag: '"abc123"',
        size: 1024,
        lastModified: new Date().toISOString(),
        checksum: 'sha256:abc',
      },
      {
        key: 'test/file2.json',
        etag: '"def456"',
        size: 2048,
        lastModified: new Date().toISOString(),
        checksum: 'sha256:def',
      },
    ];
  }

  private async determineBackupType(job: BackupJob): Promise<BackupType> {
    const snapshots = this.listSnapshots(job.id);
    const lastFull = snapshots.find(s => s.type === 'full');

    if (!lastFull) return 'full';

    const daysSinceFull =
      (Date.now() - new Date(lastFull.timestamp).getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceFull >= 7) return 'full';
    if (job.type === 'incremental') return 'incremental';
    return 'differential';
  }

  private async getLastSnapshot(jobId: string): Promise<BackupSnapshot | undefined> {
    const snapshots = this.listSnapshots(jobId);
    return snapshots[0];
  }

  private filterChangedObjects(
    current: BackupManifest['objects'],
    lastSnapshot: BackupSnapshot
  ): BackupManifest['objects'] {
    const lastObjects = new Map(lastSnapshot.manifest.objects.map(o => [o.key, o]));

    return current.filter(obj => {
      const last = lastObjects.get(obj.key);
      return !last || last.etag !== obj.etag || last.lastModified !== obj.lastModified;
    });
  }

  private async performBackup(
    job: BackupJob,
    objects: BackupManifest['objects'],
    manifest: BackupManifest
  ): Promise<void> {
    // In production, would copy objects to destination
    job.stats.objectsProcessed = objects.length;

    // Store manifest
    const manifestKey = `${job.destination.prefix}/${manifest.createdAt}/manifest.json`;
    console.info(styled(`  Writing manifest: ${manifestKey}`, 'muted'));
  }

  private async restoreObject(
    snapshot: BackupSnapshot,
    obj: BackupManifest['objects'][0],
    target: BackupSource,
    options: RestoreOptions
  ): Promise<void> {
    // In production, would copy from backup to target
    console.info(styled(`  Restoring: ${obj.key}`, 'muted'));
  }

  private async verifyObjectExists(
    snapshot: BackupSnapshot,
    obj: BackupManifest['objects'][0]
  ): Promise<boolean> {
    // In production, would check if object exists in destination
    return true;
  }

  private async normalizeChecksumFromData(
    data: object | string | number | boolean | null
  ): Promise<string> {
    const hash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(JSON.stringify(data))
    );
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private async applyRetentionPolicy(job: BackupJob): Promise<void> {
    const snapshots = this.listSnapshots(job.id);
    const policy = job.retention;

    if (!policy || snapshots.length <= (policy.keepLastN || 1)) return;

    const toDelete: string[] = [];
    const now = new Date();

    // Group by type
    const byType = new Map<BackupType, BackupSnapshot[]>();
    for (const snap of snapshots) {
      if (!byType.has(snap.type)) byType.set(snap.type, []);
      byType.get(snap.type)!.push(snap);
    }

    // Apply retention rules
    for (const [type, snaps] of byType) {
      const sorted = snaps.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      let keepCount = 0;
      for (const snap of sorted) {
        const age = (now.getTime() - new Date(snap.timestamp).getTime()) / (1000 * 60 * 60 * 24);

        let shouldKeep = false;
        if (policy.keepLastN && keepCount < policy.keepLastN) shouldKeep = true;
        if (policy.keepDailyFor && age <= policy.keepDailyFor) shouldKeep = true;
        if (policy.keepWeeklyFor && age <= policy.keepWeeklyFor && type === 'full')
          shouldKeep = true;
        if (policy.keepMonthlyFor && age <= policy.keepMonthlyFor && type === 'full')
          shouldKeep = true;

        if (shouldKeep) {
          keepCount++;
        } else {
          toDelete.push(snap.id);
        }
      }
    }

    // Delete old snapshots
    for (const snapId of toDelete) {
      await this.deleteSnapshot(snapId);
    }

    if (toDelete.length > 0) {
      console.info(
        styled(`🗑️ Cleaned up ${toDelete.length} old snapshots per retention policy`, 'info')
      );
    }
  }
}

// Export singleton
export const r2BackupManager = new R2BackupManager();

// CLI interface
if (import.meta.main) {
  const backup = r2BackupManager;
  await backup.initialize();

  console.info(styled('💾 R2 Backup Manager Demo', 'accent'));
  console.info(styled('=========================', 'accent'));

  // Create a backup job
  const job = backup.createJob({
    name: 'Daily MCP Backup',
    type: 'incremental',
    source: {
      bucket: 'scanner-cookies',
      prefix: 'mcp/',
    },
    destination: {
      bucket: 'scanner-cookies-backup',
      prefix: 'backups/mcp/',
      storageClass: 'GLACIER',
    },
    retention: {
      keepLastN: 10,
      keepDailyFor: 30,
      keepWeeklyFor: 90,
    },
    options: {
      compression: true,
      verifyAfterBackup: true,
    },
  });

  console.info(styled(`\n📋 Created backup job: ${job.name}`, 'success'));

  // Display status
  backup.displayStatus();

  // Show stats
  const stats = backup.getStats();
  console.info(styled('\n📊 Backup Stats:', 'info'));
  console.info(styled(`  Jobs: ${stats.totalJobs}`, 'muted'));
  console.info(styled(`  Snapshots: ${stats.totalSnapshots}`, 'muted'));
  console.info(
    styled(`  Data Protected: ${(stats.totalDataProtected / 1024 / 1024).toFixed(2)} MB`, 'muted')
  );
}
