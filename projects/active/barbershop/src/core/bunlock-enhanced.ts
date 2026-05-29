/**
 * Enhanced BunLock - Advanced Distributed Lock Manager
 * Features: Priority locks, lock chaining, deadlock detection, metrics, and more
 */

import { Database } from 'bun:sqlite';
import { randomUUIDv7 } from 'bun';
import { 
  LockPriority, 
  LockAction, 
  DeadlockResolution
} from './enums';

export interface EnhancedLockInfo {
  id: string;
  resource: string;
  owner: string;
  priority: LockPriority;
  acquired_at: number;
  expires_at: number;
  ttl: number;
  meta?: string;
  chain_id?: string;
  retry_count?: number;
  wait_time?: number;
}

export interface LockQueue {
  id: string;
  resource: string;
  owner: string;
  priority: LockPriority;
  created_at: number;
  timeout: number;
  chain_id?: string;
}

export interface LockHistory {
  id: string;
  action: LockAction;
  resource: string;
  owner: string;
  timestamp: number;
  ttl?: number;
  chain_id?: string;
}

export interface LockMetrics {
  totalAcquisitions: number;
  totalReleases: number;
  totalTimeouts: number;
  totalRetries: number;
  averageWaitTime: number;
  peakConcurrentLocks: number;
  deadlockDetections: number;
  priorityDistribution: Record<LockPriority, number>;
  resourceHotspots: Array<{ resource: string; count: number }>;
}

export interface DeadlockReport {
  id: string;
  timestamp: number;
  involved_resources: string[];
  involved_owners: string[];
  cycle_detected: string[];
  resolution: DeadlockResolution;
}

export class EnhancedBunLock {
  private db: Database;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;
  private metrics: LockMetrics;
  private deadlockDetectionEnabled: boolean;
  private maxRetryAttempts: number;
  private retryBackoffMs: number;

  constructor(options: {
    dbPath?: string;
    deadlockDetection?: boolean;
    maxRetryAttempts?: number;
    retryBackoffMs?: number;
  } = {}) {
    this.db = new Database(options.dbPath || ':memory:');
    this.deadlockDetectionEnabled = options.deadlockDetection ?? true;
    this.maxRetryAttempts = options.maxRetryAttempts ?? 3;
    this.retryBackoffMs = options.retryBackoffMs ?? 1000;
    
    this.metrics = {
      totalAcquisitions: 0,
      totalReleases: 0,
      totalTimeouts: 0,
      totalRetries: 0,
      averageWaitTime: 0,
      peakConcurrentLocks: 0,
      deadlockDetections: 0,
      priorityDistribution: {
        [LockPriority.LOW]: 0,
        [LockPriority.NORMAL]: 0,
        [LockPriority.HIGH]: 0,
        [LockPriority.CRITICAL]: 0
      },
      resourceHotspots: []
    };

    this.initDatabase();
    this.startCleanup();
    this.startMetricsCollection();
  }

  private initDatabase(): void {
    // Enhanced locks table with priority and chaining support
    this.db.run(`
      CREATE TABLE IF NOT EXISTS enhanced_locks (
        id TEXT PRIMARY KEY,
        resource TEXT NOT NULL,
        owner TEXT NOT NULL,
        priority TEXT NOT NULL,
        acquired_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        ttl INTEGER NOT NULL,
        meta TEXT,
        chain_id TEXT,
        retry_count INTEGER DEFAULT 0,
        wait_time INTEGER DEFAULT 0
      )
    `);

    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_enhanced_locks_resource ON enhanced_locks(resource)
    `);

    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_enhanced_locks_expires ON enhanced_locks(expires_at)
    `);

    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_enhanced_locks_priority ON enhanced_locks(priority)
    `);

    // Lock queue for priority-based waiting
    this.db.run(`
      CREATE TABLE IF NOT EXISTS lock_queue (
        id TEXT PRIMARY KEY,
        resource TEXT NOT NULL,
        owner TEXT NOT NULL,
        priority TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        timeout INTEGER NOT NULL,
        chain_id TEXT
      )
    `);

    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_lock_queue_resource ON lock_queue(resource)
    `);

    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_lock_queue_priority ON lock_queue(priority)
    `);

    // Lock history for audit trail
    this.db.run(`
      CREATE TABLE IF NOT EXISTS lock_history (
        id TEXT PRIMARY KEY,
        action TEXT NOT NULL,
        resource TEXT NOT NULL,
        owner TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        ttl INTEGER,
        chain_id TEXT
      )
    `);

    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_lock_history_timestamp ON lock_history(timestamp)
    `);

    // Deadlock reports
    this.db.run(`
      CREATE TABLE IF NOT EXISTS deadlock_reports (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        involved_resources TEXT,
        involved_owners TEXT,
        cycle_detected TEXT,
        resolution TEXT NOT NULL
      )
    `);

    // Metrics storage
    this.db.run(`
      CREATE TABLE IF NOT EXISTS lock_metrics (
        timestamp INTEGER PRIMARY KEY,
        active_locks INTEGER,
        queued_locks INTEGER,
        avg_wait_time REAL,
        throughput REAL
      )
    `);
  }

  /**
   * Acquire a lock with priority support
   */
  async acquire(
    resource: string,
    owner: string,
    ttl: number = 30000,
    options: {
      priority?: LockPriority;
      chainId?: string;
      timeout?: number;
      retry?: boolean;
    } = {}
  ): Promise<string | null> {
    const startTime = Date.now();
    const priority = options.priority || LockPriority.NORMAL;
    const timeout = options.timeout || 30000;
    const chainId = options.chainId;
    let retryCount = 0;

    while (retryCount <= this.maxRetryAttempts) {
      try {
        // Check if resource is already locked
        const existingLock = this.db.query(`
          SELECT id, priority FROM enhanced_locks 
          WHERE resource = ?1 AND expires_at > ?2
        `).get(resource, Date.now()) as { id: string; priority: string } | undefined;

        if (!existingLock) {
          // Resource is available, acquire lock
          const lockId = randomUUIDv7();
          const waitTime = Date.now() - startTime;

          this.db.run(`
            INSERT INTO enhanced_locks 
            (id, resource, owner, priority, acquired_at, expires_at, ttl, meta, chain_id, retry_count, wait_time)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
          `, [
            lockId, resource, owner, priority, Date.now(), Date.now() + ttl, ttl,
            JSON.stringify({ acquired_at: Date.now(), priority }), chainId || null, retryCount, waitTime
          ]);

          // Update metrics
          this.metrics.totalAcquisitions++;
          this.metrics.priorityDistribution[priority]++;
          this.updateAverageWaitTime(waitTime);
          this.updateResourceHotspot(resource);

          // Check for deadlocks if enabled
          if (this.deadlockDetectionEnabled && chainId) {
            this.detectDeadlocks(chainId);
          }

          // Record history
          this.recordHistory(LockAction.ACQUIRED, resource, owner, ttl, chainId);

          return lockId;
        }

        // Resource is locked, check priority preemption
        if (this.canPreempt(existingLock.priority, priority)) {
          // Preempt the lower priority lock
          await this.release(existingLock.id);
          this.metrics.totalReleases++;
          continue; // Try to acquire again
        }

        // If retry is disabled, return null
        if (!options.retry) {
          return null;
        }

        // Add to queue and wait
        const queueId = randomUUIDv7();
        this.db.run(`
          INSERT INTO lock_queue (id, resource, owner, priority, created_at, timeout, chain_id)
          VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
        `, [queueId, resource, owner, priority, Date.now(), timeout, chainId || null]);

        // Wait for lock to become available or timeout
        const waited = await this.waitForLock(resource, queueId, timeout);
        if (!waited) {
          this.metrics.totalTimeouts++;
          return null;
        }

        retryCount++;
        this.metrics.totalRetries++;

        // Exponential backoff
        if (retryCount <= this.maxRetryAttempts) {
          await new Promise(resolve => setTimeout(resolve, this.retryBackoffMs * Math.pow(2, retryCount - 1)));
        }

      } catch (error) {
        console.error(`Lock acquisition error for ${resource}:`, error);
        retryCount++;
      }
    }

    return null;
  }

  /**
   * Acquire multiple locks atomically (lock chaining)
   */
  async acquireChain(
    resources: string[],
    owner: string,
    ttl: number = 30000,
    options: {
      priority?: LockPriority;
      timeout?: number;
    } = {}
  ): Promise<string[] | null> {
    const chainId = randomUUIDv7();
    const acquiredLocks: string[] = [];

    try {
      // Sort resources to prevent deadlocks
      const sortedResources = [...resources].sort();

      for (const resource of sortedResources) {
        const lockId = await this.acquire(resource, owner, ttl, {
          ...options,
          chainId,
          retry: true
        });

        if (!lockId) {
          // Failed to acquire all locks, release acquired ones
          await this.releaseChain(acquiredLocks);
          return null;
        }

        acquiredLocks.push(lockId);
      }

      return acquiredLocks;

    } catch (error) {
      console.error('Lock chain acquisition error:', error);
      await this.releaseChain(acquiredLocks);
      return null;
    }
  }

  /**
   * Release a lock
   */
  async release(lockId: string): Promise<boolean> {
    try {
      const lock = this.db.query(`
        SELECT resource, owner FROM enhanced_locks WHERE id = ?1
      `).get(lockId) as { resource: string; owner: string } | undefined;

      if (!lock) {
        return false;
      }

      const result = this.db.run(`
        DELETE FROM enhanced_locks WHERE id = ?1
      `, [lockId]);

      if (result.changes > 0) {
        this.metrics.totalReleases++;
        
        // Record history
        this.recordHistory(LockAction.RELEASED, lock.resource, lock.owner);
        
        // Process queue for this resource
        this.processQueue(lock.resource);
        
        return true;
      }

      return false;

    } catch (error) {
      console.error(`Lock release error for ${lockId}:`, error);
      return false;
    }
  }

  /**
   * Release multiple locks (chain)
   */
  async releaseChain(lockIds: string[]): Promise<boolean> {
    const results = await Promise.all(lockIds.map(id => this.release(id)));
    return results.every(success => success);
  }

  /**
   * Extend lock TTL
   */
  async extend(lockId: string, additionalTtl: number): Promise<boolean> {
    try {
      const result = this.db.run(`
        UPDATE enhanced_locks 
        SET expires_at = expires_at + ?1, ttl = ttl + ?2
        WHERE id = ?3 AND expires_at > ?4
      `, [additionalTtl, additionalTtl, lockId, Date.now()]);

      if (result.changes > 0) {
        const lock = this.db.query(`
          SELECT resource, owner FROM enhanced_locks WHERE id = ?1
        `).get(lockId) as { resource: string; owner: string } | undefined;

        if (lock) {
          this.recordHistory(LockAction.EXTENDED, lock.resource, lock.owner, additionalTtl);
        }
      }

      return result.changes > 0;

    } catch (error) {
      console.error(`Lock extension error for ${lockId}:`, error);
      return false;
    }
  }

  /**
   * Get lock status
   */
  getStatus(resource: string): EnhancedLockInfo | null {
    const lock = this.db.query(`
      SELECT * FROM enhanced_locks 
      WHERE resource = ?1 AND expires_at > ?2
      ORDER BY priority DESC, acquired_at ASC
      LIMIT 1
    `).get(resource, Date.now()) as EnhancedLockInfo | undefined;

    return lock || null;
  }

  /**
   * List all active locks
   */
  listActiveLocks(): EnhancedLockInfo[] {
    return this.db.query(`
      SELECT * FROM enhanced_locks 
      WHERE expires_at > ?1
      ORDER BY priority DESC, acquired_at ASC
    `).all(Date.now()) as EnhancedLockInfo[];
  }

  /**
   * Get queue status
   */
  getQueueStatus(resource: string): LockQueue[] {
    return this.db.query(`
      SELECT * FROM lock_queue 
      WHERE resource = ?1 AND created_at > ?2
      ORDER BY priority DESC, created_at ASC
    `).all(resource, Date.now() - 300000) as LockQueue[];
  }

  /**
   * Force unlock (admin override)
   */
  async forceUnlock(resource: string): Promise<boolean> {
    try {
      const result = this.db.run(`
        DELETE FROM enhanced_locks WHERE resource = ?1
      `, [resource]);

      if (result.changes > 0) {
        this.processQueue(resource);
        return true;
      }

      return false;

    } catch (error) {
      console.error(`Force unlock error for ${resource}:`, error);
      return false;
    }
  }

  /**
   * Get comprehensive metrics
   */
  getMetrics(): LockMetrics & {
    activeLocks: number;
    queuedLocks: number;
    throughput: number;
  } {
    const activeLocks = this.db.query(`
      SELECT COUNT(*) as count FROM enhanced_locks WHERE expires_at > ?1
    `).get(Date.now()) as { count: number };

    const queuedLocks = this.db.query(`
      SELECT COUNT(*) as count FROM lock_queue 
      WHERE created_at > ?1
    `).get(Date.now() - 300000) as { count: number };

    const firstLock = this.db.query(`
      SELECT MIN(acquired_at) as first_lock FROM enhanced_locks
    `).get() as { first_lock: number } | undefined;

    const uptime = Date.now() - (firstLock?.first_lock || Date.now());
    const throughput = uptime > 0 ? (this.metrics.totalAcquisitions / uptime) * 1000 : 0;

    return {
      ...this.metrics,
      activeLocks: activeLocks.count,
      queuedLocks: queuedLocks.count,
      throughput
    };
  }

  /**
   * Get deadlock reports
   */
  getDeadlockReports(): DeadlockReport[] {
    return this.db.query(`
      SELECT * FROM deadlock_reports 
      ORDER BY timestamp DESC 
      LIMIT 50
    `).all() as DeadlockReport[];
  }

  /**
   * Get lock history
   */
  getHistory(limit: number = 100): LockHistory[] {
    return this.db.query(`
      SELECT * FROM lock_history 
      ORDER BY timestamp DESC 
      LIMIT ?1
    `).all(limit) as LockHistory[];
  }

  /**
   * Close the lock manager and clean up resources
   */
  close(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
    
    this.db.close();
  }

  // Private helper methods

  private canPreempt(existingPriority: string, newPriority: string): boolean {
    const priorityOrder = { 
      [LockPriority.CRITICAL]: 4, 
      [LockPriority.HIGH]: 3, 
      [LockPriority.NORMAL]: 2, 
      [LockPriority.LOW]: 1 
    };
    return priorityOrder[newPriority as LockPriority] > 
           priorityOrder[existingPriority as LockPriority];
  }

  private async waitForLock(resource: string, queueId: string, timeout: number): Promise<boolean> {
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        // Check if we've timed out
        if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          this.db.run(`DELETE FROM lock_queue WHERE id = ?1`, [queueId]);
          resolve(false);
          return;
        }

        // Check if lock is available for us
        const queuePosition = this.db.query(`
          SELECT COUNT(*) as position FROM lock_queue 
          WHERE resource = ?1 AND priority > (SELECT priority FROM lock_queue WHERE id = ?2)
        `).get(resource, queueId) as { position: number };

        const existingLock = this.db.query(`
          SELECT id FROM enhanced_locks WHERE resource = ?1 AND expires_at > ?2
        `).get(resource, Date.now());

        if (!existingLock && queuePosition.position === 0) {
          clearInterval(checkInterval);
          this.db.run(`DELETE FROM lock_queue WHERE id = ?1`, [queueId]);
          resolve(true);
        }
      }, 100);
    });
  }

  private processQueue(resource: string): void {
    const nextInQueue = this.db.query(`
      SELECT * FROM lock_queue 
      WHERE resource = ?1
      ORDER BY priority DESC, created_at ASC 
      LIMIT 1
    `).get(resource) as LockQueue | undefined;

    if (nextInQueue) {
      // Remove from queue (in real implementation, this would use events/websockets)
      this.db.run(`DELETE FROM lock_queue WHERE id = ?1`, [nextInQueue.id]);
    }
  }

  private detectDeadlocks(chainId: string): void {
    // Simple deadlock detection based on chain analysis
    const chainLocks = this.db.query(`
      SELECT resource, owner FROM enhanced_locks WHERE chain_id = ?1
    `).all(chainId) as Array<{ resource: string; owner: string }>;

    // Look for circular dependencies (simplified)
    if (chainLocks.length > 1) {
      const resources = chainLocks.map(l => l.resource);
      const owners = chainLocks.map(l => l.owner);
      
      // Check if any resource appears in multiple chains
      const duplicateResources = resources.filter((r, i) => resources.indexOf(r) !== i);
      
      if (duplicateResources.length > 0) {
        this.metrics.deadlockDetections++;
        
        const report: DeadlockReport = {
          id: randomUUIDv7(),
          timestamp: Date.now(),
          involved_resources: resources,
          involved_owners: owners,
          cycle_detected: duplicateResources,
          resolution: DeadlockResolution.AUTO_RESOLVED
        };

        this.db.run(`
          INSERT INTO deadlock_reports 
          (id, timestamp, involved_resources, involved_owners, cycle_detected, resolution)
          VALUES (?1, ?2, ?3, ?4, ?5, ?6)
        `, [
          report.id, report.timestamp,
          JSON.stringify(report.involved_resources),
          JSON.stringify(report.involved_owners),
          JSON.stringify(report.cycle_detected),
          report.resolution
        ]);
      }
    }
  }

  private recordHistory(action: LockAction, resource: string, owner: string, ttl?: number, chainId?: string): void {
    this.db.run(`
      INSERT INTO lock_history (id, action, resource, owner, timestamp, ttl, chain_id)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
    `, [randomUUIDv7(), action, resource, owner, Date.now(), ttl || null, chainId || null]);
  }

  private updateAverageWaitTime(waitTime: number): void {
    const totalAcquisitions = this.metrics.totalAcquisitions;
    this.metrics.averageWaitTime = 
      ((this.metrics.averageWaitTime * (totalAcquisitions - 1)) + waitTime) / totalAcquisitions;
  }

  private updateResourceHotspot(resource: string): void {
    const existing = this.metrics.resourceHotspots.find(h => h.resource === resource);
    if (existing) {
      existing.count++;
    } else {
      this.metrics.resourceHotspots.push({ resource, count: 1 });
    }

    // Keep only top 10 hotspots
    this.metrics.resourceHotspots.sort((a, b) => b.count - a.count);
    this.metrics.resourceHotspots = this.metrics.resourceHotspots.slice(0, 10);
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      // Clean up expired locks
      this.db.run(`
        DELETE FROM enhanced_locks WHERE expires_at < ?1
      `, [Date.now()]);

      // Clean up old queue entries (older than 5 minutes)
      this.db.run(`
        DELETE FROM lock_queue WHERE created_at < ?1
      `, [Date.now() - 300000]);

      // Update peak concurrent locks
      const currentLocks = this.db.query(`
        SELECT COUNT(*) as count FROM enhanced_locks WHERE expires_at > ?1
      `).get(Date.now()) as { count: number };

      if (currentLocks.count > this.metrics.peakConcurrentLocks) {
        this.metrics.peakConcurrentLocks = currentLocks.count;
      }

    }, 5000); // Run every 5 seconds
  }

  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      const activeLocks = this.db.query(`
        SELECT COUNT(*) as count FROM enhanced_locks WHERE expires_at > ?1
      `).get(Date.now()) as { count: number };

      const queuedLocks = this.db.query(`
        SELECT COUNT(*) as count FROM lock_queue 
        WHERE created_at > ?1
      `).get(Date.now() - 300000) as { count: number };

      const throughput = this.metrics.totalAcquisitions / ((Date.now() - (Date.now() - 86400000)) / 1000); // Last 24h

      this.db.run(`
        INSERT OR REPLACE INTO lock_metrics 
        (timestamp, active_locks, queued_locks, avg_wait_time, throughput)
        VALUES (?1, ?2, ?3, ?4, ?5)
      `, [Date.now(), activeLocks.count, queuedLocks.count, this.metrics.averageWaitTime, throughput]);

      // Keep only last 1000 metric entries
      this.db.run(`
        DELETE FROM lock_metrics WHERE timestamp < ?1
      `, [Date.now() - 86400000]); // Keep last 24 hours

    }, 30000); // Collect metrics every 30 seconds
  }
}

export default EnhancedBunLock;
