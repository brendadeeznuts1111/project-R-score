#!/usr/bin/env bun

/**
 * Filter Watch Session Logger
 * 
 * Logs filter watch sessions to R2 storage for monitoring and analytics.
 * Tracks session duration, restarts, and package changes over time.
 */

import { uploadToR2 } from './r2/r2-client';

// Watch session interface
interface WatchFilterSession {
  id: string;
  pattern: string;
  packages: string[];
  startTime: number;
  restartCount: number;
  lastActivity: number;
  status: 'active' | 'paused' | 'stopped';
  changes: WatchChange[];
}

interface WatchChange {
  timestamp: number;
  type: 'package_added' | 'package_removed' | 'package_modified' | 'script_changed';
  package: string;
  details?: Record<string, any>;
}

// Session logger class
class FilterWatchLogger {
  private activeSessions = new Map<string, WatchFilterSession>();
  private logBatch: Array<{ session: WatchFilterSession; log: any }> = [];
  private batchFlushInterval = 30000; // 30 seconds
  private maxBatchSize = 50;

  constructor() {
    // Flush logs periodically
    setInterval(() => {
      if (this.logBatch.length > 0) {
        this.flushLogBatch();
      }
    }, this.batchFlushInterval);
  }

  /**
   * Start tracking a new watch session
   */
  startSession(pattern: string, packages: string[]): WatchFilterSession {
    const sessionId = `watch-${pattern}-${Date.now()}`;
    const session: WatchFilterSession = {
      id: sessionId,
      pattern,
      packages: [...packages],
      startTime: Date.now(),
      restartCount: 0,
      lastActivity: Date.now(),
      status: 'active',
      changes: []
    };

    this.activeSessions.set(sessionId, session);
    
    // Log session start
    this.logSessionEvent(session, 'session_started', {
      initialPackages: packages.length,
      pattern
    });

    console.log(`📺 Started watch session: ${sessionId} for pattern "${pattern}"`);
    return session;
  }

  /**
   * Log watch session to R2
   */
  async logWatchSession(session: WatchFilterSession): Promise<void> {
    const log = {
      type: 'watch-session',
      sessionId: session.id,
      pattern: session.pattern,
      packages: session.packages,
      packageCount: session.packages.length,
      duration: Date.now() - session.startTime,
      restarts: session.restartCount,
      status: session.status,
      changeCount: session.changes.length,
      lastActivity: session.lastActivity,
      timestamp: new Date().toISOString(),
      changes: session.changes.slice(-10) // Last 10 changes
    };

    // Add to batch for efficient upload
    this.logBatch.push({ session, log });

    // Flush immediately if batch is full
    if (this.logBatch.length >= this.maxBatchSize) {
      await this.flushLogBatch();
    }
  }

  /**
   * Record a change in the watched packages
   */
  recordChange(sessionId: string, type: WatchChange['type'], packageName: string, details?: Record<string, any>): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      console.warn(`⚠️ Session ${sessionId} not found for change recording`);
      return;
    }

    const change: WatchChange = {
      timestamp: Date.now(),
      type,
      package: packageName,
      details
    };

    session.changes.push(change);
    session.lastActivity = Date.now();

    // Keep only last 100 changes to prevent memory bloat
    if (session.changes.length > 100) {
      session.changes = session.changes.slice(-100);
    }

    this.logSessionEvent(session, 'change_detected', {
      changeType: type,
      package: packageName,
      totalChanges: session.changes.length
    });
  }

  /**
   * Update package list for a session
   */
  updatePackages(sessionId: string, newPackages: string[]): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    const oldPackages = new Set(session.packages);
    const newPackagesSet = new Set(newPackages);

    // Detect added packages
    for (const pkg of newPackages) {
      if (!oldPackages.has(pkg)) {
        this.recordChange(sessionId, 'package_added', pkg);
      }
    }

    // Detect removed packages
    for (const pkg of session.packages) {
      if (!newPackagesSet.has(pkg)) {
        this.recordChange(sessionId, 'package_removed', pkg);
      }
    }

    session.packages = [...newPackages];
    session.lastActivity = Date.now();
  }

  /**
   * Restart a session (e.g., after pattern change)
   */
  restartSession(sessionId: string, newPattern?: string): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    session.restartCount++;
    session.lastActivity = Date.now();
    
    if (newPattern) {
      session.pattern = newPattern;
    }

    this.logSessionEvent(session, 'session_restarted', {
      restartCount: session.restartCount,
      newPattern: session.pattern
    });

    console.log(`🔄 Restarted watch session: ${sessionId} (restart #${session.restartCount})`);
  }

  /**
   * Pause a session
   */
  pauseSession(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    session.status = 'paused';
    session.lastActivity = Date.now();

    this.logSessionEvent(session, 'session_paused', {
      duration: Date.now() - session.startTime
    });
  }

  /**
   * Resume a session
   */
  resumeSession(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    session.status = 'active';
    session.lastActivity = Date.now();

    this.logSessionEvent(session, 'session_resumed', {
      pausedDuration: Date.now() - session.lastActivity
    });
  }

  /**
   * Stop and log a session
   */
  async stopSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    session.status = 'stopped';
    session.lastActivity = Date.now();

    // Final log entry
    await this.logWatchSession(session);

    // Remove from active sessions
    this.activeSessions.delete(sessionId);

    console.log(`🛑 Stopped watch session: ${sessionId} (duration: ${Date.now() - session.startTime}ms)`);
  }

  /**
   * Get session statistics
   */
  getSessionStats(): {
    activeSessions: number;
    totalChanges: number;
    averageSessionDuration: number;
    patterns: Record<string, number>;
  } {
    const sessions = Array.from(this.activeSessions.values());
    const totalChanges = sessions.reduce((sum, session) => sum + session.changes.length, 0);
    const averageDuration = sessions.length > 0 
      ? sessions.reduce((sum, session) => sum + (Date.now() - session.startTime), 0) / sessions.length
      : 0;

    const patterns: Record<string, number> = {};
    sessions.forEach(session => {
      patterns[session.pattern] = (patterns[session.pattern] || 0) + 1;
    });

    return {
      activeSessions: sessions.length,
      totalChanges,
      averageSessionDuration: Math.round(averageDuration),
      patterns
    };
  }

  /**
   * Log a specific session event
   */
  private logSessionEvent(session: WatchFilterSession, eventType: string, data: Record<string, any>): void {
    const eventLog = {
      type: 'watch-event',
      sessionId: session.id,
      eventType,
      pattern: session.pattern,
      timestamp: new Date().toISOString(),
      sessionDuration: Date.now() - session.startTime,
      restartCount: session.restartCount,
      packageCount: session.packages.length,
      ...data
    };

    // Add to batch
    this.logBatch.push({ session, log: eventLog });
  }

  /**
   * Flush log batch to R2
   */
  private async flushLogBatch(): Promise<void> {
    if (this.logBatch.length === 0) return;

    const batch = [...this.logBatch];
    this.logBatch = [];

    try {
      // Group logs by session for efficient storage
      const logsBySession = new Map<string, any[]>();
      
      batch.forEach(({ session, log }) => {
        if (!logsBySession.has(session.pattern)) {
          logsBySession.set(session.pattern, []);
        }
        logsBySession.get(session.pattern)!.push(log);
      });

      // Upload each session's logs
      for (const [pattern, logs] of Array.from(logsBySession.entries())) {
        const timestamp = Date.now();
        const filename = `watch-sessions/${pattern}/${timestamp}-batch.json`;
        
        await uploadToR2(filename, {
          batchId: timestamp,
          pattern,
          logCount: logs.length,
          logs,
          uploadedAt: new Date().toISOString()
        });

        console.log(`📤 Uploaded ${logs.length} watch logs for pattern "${pattern}"`);
      }

    } catch (error) {
      console.error('❌ Failed to upload watch log batch:', error);
      
      // Re-add failed logs to batch for retry
      this.logBatch.unshift(...batch);
    }
  }

  /**
   * Cleanup old sessions and flush remaining logs
   */
  async cleanup(): Promise<void> {
    // Remove inactive sessions (older than 1 hour)
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    for (const [sessionId, session] of Array.from(this.activeSessions.entries())) {
      if (session.lastActivity < oneHourAgo && session.status === 'stopped') {
        this.activeSessions.delete(sessionId);
      }
    }

    // Flush remaining logs
    if (this.logBatch.length > 0) {
      await this.flushLogBatch();
    }
  }
}

// Global logger instance
const watchLogger = new FilterWatchLogger();

// Export functions for external use
export async function logWatchSession(session: WatchFilterSession): Promise<void> {
  return watchLogger.logWatchSession(session);
}

export function startWatchSession(pattern: string, packages: string[]): WatchFilterSession {
  return watchLogger.startSession(pattern, packages);
}

export function recordWatchChange(sessionId: string, type: WatchChange['type'], packageName: string, details?: Record<string, any>): void {
  watchLogger.recordChange(sessionId, type, packageName, details);
}

export function updateWatchPackages(sessionId: string, packages: string[]): void {
  watchLogger.updatePackages(sessionId, packages);
}

export function restartWatchSession(sessionId: string, newPattern?: string): void {
  watchLogger.restartSession(sessionId, newPattern);
}

export function stopWatchSession(sessionId: string): Promise<void> {
  return watchLogger.stopSession(sessionId);
}

export function getWatchSessionStats() {
  return watchLogger.getSessionStats();
}

// Cleanup on process exit
process.on('SIGINT', async () => {
  console.log('🧹 Cleaning up watch logger...');
  await watchLogger.cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
console.log('🧹 Cleaning up watch logger...');
await watchLogger.cleanup();
process.exit(0);
});

// Run demo if this file is executed directly
if (process.argv[1] && process.argv[1].endsWith('filter-watch-logger.ts')) {
console.log('📺 Filter Watch Session Logger Demo');
  
// Start a demo session
const session = startWatchSession('app-*', ['app-web', 'app-api', 'app-mobile']);
  
// Simulate some changes
setTimeout(() => {
recordWatchChange(session.id, 'package_added', 'app-desktop');
}, 1000);
  setTimeout(() => {
    recordWatchChange(session.id, 'package_added', 'app-desktop');
  }, 1000);
  
  setTimeout(() => {
    recordWatchChange(session.id, 'package_modified', 'app-web', { file: 'package.json', change: 'version bump' });
  }, 2000);
  
  setTimeout(() => {
    updateWatchPackages(session.id, ['app-web', 'app-api', 'app-mobile', 'app-desktop']);
  }, 3000);
  
  setTimeout(() => {
    stopWatchSession(session.id);
  }, 5000);
}
