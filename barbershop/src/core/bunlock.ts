#!/usr/bin/env bun
/**
 * BunLock - Universal Lock Manager for Barbershop Demo
 * Provides distributed locking mechanisms for resource management
 */

import { Database } from 'bun:sqlite';
import { randomUUIDv7 } from 'bun';

export interface LockInfo {
  id: string;
  resource: string;
  owner: string;
  acquiredAt: number;
  expiresAt: number;
  ttl: number;
  meta?: Record<string, any>;
}

export interface LockStatus {
  locked: boolean;
  lockId?: string;
  owner?: string;
  remainingTtl?: number;
  waiters: number;
}

export class BunLock {
  private db: Database;
  private cleanupInterval: NodeJS.Timeout;

  constructor(dbPath?: string) {
    this.db = new Database(dbPath || ':memory:');
    this.initDatabase();
    this.startCleanup();
  }

  private initDatabase(): void {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS locks (
        id TEXT PRIMARY KEY,
        resource TEXT NOT NULL,
        owner TEXT NOT NULL,
        acquired_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        ttl INTEGER NOT NULL,
        meta TEXT
      )
    `);

    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_locks_resource ON locks(resource)
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS waiters (
        id TEXT PRIMARY KEY,
        resource TEXT NOT NULL,
        owner TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )
    `);

    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_waiters_resource ON waiters(resource)
    `);
  }

  /**
   * Acquire a lock on a resource
   */
  async acquire(
    resource: string,
    owner: string,
    ttl: number = 30000, // 30 seconds default
    meta?: Record<string, any>
  ): Promise<string | null> {
    const now = Date.now();
    const expiresAt = now + ttl;
    const lockId = randomUUIDv7();

    // Clean up expired locks first
    this.cleanupExpiredLocks();

    // Try to acquire lock
    const stmt = this.db.prepare(`
      INSERT INTO locks (id, resource, owner, acquired_at, expires_at, ttl, meta)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      stmt.run(lockId, resource, owner, now, expiresAt, ttl, meta ? JSON.stringify(meta) : null);
      return lockId;
    } catch (error) {
      if (error instanceof Error && error.message?.includes('UNIQUE constraint failed')) {
        return null; // Resource already locked
      }
      throw error;
    }
  }

  /**
   * Try to acquire a lock with timeout and retry
   */
  async acquireWithRetry(
    resource: string,
    owner: string,
    ttl: number = 30000,
    timeout: number = 10000,
    retryInterval: number = 100
  ): Promise<string | null> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const lockId = await this.acquire(resource, owner, ttl);
      if (lockId) return lockId;
      
      await new Promise(resolve => setTimeout(resolve, retryInterval));
    }
    
    return null;
  }

  /**
   * Release a lock
   */
  async release(lockId: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM locks WHERE id = ?');
    const result = stmt.run(lockId);
    return result.changes > 0;
  }

  /**
   * Release lock by resource and owner
   */
  async releaseByOwner(resource: string, owner: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM locks WHERE resource = ? AND owner = ?');
    const result = stmt.run(resource, owner);
    return result.changes > 0;
  }

  /**
   * Check lock status
   */
  getStatus(resource: string): LockStatus {
    const now = Date.now();
    
    const lockStmt = this.db.prepare(`
      SELECT id, owner, expires_at, ttl FROM locks 
      WHERE resource = ? AND expires_at > ?
      LIMIT 1
    `);
    
    const lock = lockStmt.get(resource, now) as any;
    
    if (!lock) {
      const waiterStmt = this.db.prepare('SELECT COUNT(*) as count FROM waiters WHERE resource = ?');
      const waiters = (waiterStmt.get(resource) as any)?.count || 0;
      
      return {
        locked: false,
        waiters
      };
    }

    const remainingTtl = lock.expires_at - now;
    
    return {
      locked: true,
      lockId: lock.id,
      owner: lock.owner,
      remainingTtl: Math.max(0, remainingTtl),
      waiters: 0
    };
  }

  /**
   * List all active locks
   */
  listActiveLocks(): LockInfo[] {
    const now = Date.now();
    const stmt = this.db.prepare(`
      SELECT id, resource, owner, acquired_at, expires_at, ttl, meta 
      FROM locks 
      WHERE expires_at > ?
      ORDER BY acquired_at DESC
    `);
    
    const rows = stmt.all(now) as any[];
    
    return rows.map(row => ({
      id: row.id,
      resource: row.resource,
      owner: row.owner,
      acquiredAt: row.acquired_at,
      expiresAt: row.expires_at,
      ttl: row.ttl,
      meta: row.meta ? JSON.parse(row.meta) : undefined
    }));
  }

  /**
   * Extend lock TTL
   */
  async extend(lockId: string, additionalTtl: number): Promise<boolean> {
    const now = Date.now();
    const stmt = this.db.prepare(`
      UPDATE locks 
      SET expires_at = expires_at + ?, ttl = ttl + ?
      WHERE id = ? AND expires_at > ?
    `);
    
    const result = stmt.run(additionalTtl, additionalTtl, lockId, now);
    return result.changes > 0;
  }

  /**
   * Force unlock a resource (admin function)
   */
  async forceUnlock(resource: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM locks WHERE resource = ?');
    const result = stmt.run(resource);
    return result.changes > 0;
  }

  /**
   * Clean up expired locks
   */
  private cleanupExpiredLocks(): void {
    const now = Date.now();
    const stmt = this.db.prepare('DELETE FROM locks WHERE expires_at <= ?');
    stmt.run(now);
  }

  /**
   * Start cleanup interval
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredLocks();
    }, 5000); // Clean up every 5 seconds
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalLocks: number;
    activeLocks: number;
    expiredLocks: number;
    uniqueResources: number;
    uniqueOwners: number;
  } {
    const now = Date.now();
    
    const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM locks');
    const activeStmt = this.db.prepare('SELECT COUNT(*) as count FROM locks WHERE expires_at > ?');
    const resourceStmt = this.db.prepare('SELECT COUNT(DISTINCT resource) as count FROM locks WHERE expires_at > ?');
    const ownerStmt = this.db.prepare('SELECT COUNT(DISTINCT owner) as count FROM locks WHERE expires_at > ?');
    
    const total = (totalStmt.get() as any)?.count || 0;
    const active = (activeStmt.get(now) as any)?.count || 0;
    const resources = (resourceStmt.get(now) as any)?.count || 0;
    const owners = (ownerStmt.get(now) as any)?.count || 0;
    
    return {
      totalLocks: total,
      activeLocks: active,
      expiredLocks: total - active,
      uniqueResources: resources,
      uniqueOwners: owners
    };
  }

  /**
   * Close the lock manager
   */
  close(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.db.close();
  }
}

// Global instance
const globalLockManager = new BunLock();

export default globalLockManager;
