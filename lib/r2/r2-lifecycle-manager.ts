#!/usr/bin/env bun

/**
 * ⏰ R2 Data Lifecycle Manager - TTL, Archival, and Cleanup
 *
 * Comprehensive data lifecycle management with:
 * - Automatic TTL-based expiration
 * - Tiered storage (hot/warm/cold/archive)
 * - Automated cleanup policies
 * - Compliance-aware retention
 * - Storage class transitions
 */

import { styled, FW_COLORS } from '../theme/colors';
import { r2EventSystem } from './r2-event-system';
import { r2BatchOperations } from './r2-batch-operations';

export type StorageClass = 'hot' | 'warm' | 'cold' | 'archive' | 'deep-archive';

export interface LifecycleRule {
  id: string;
  name: string;
  enabled: boolean;
  prefix?: string;
  tags?: Record<string, string>;

  // TTL Rules
  ttl?: {
    days?: number;
    date?: string;
    deleteAfterDays?: number;
  };

  // Storage Class Transitions
  transitions?: Array<{
    storageClass: StorageClass;
    days: number;
  }>;

  // Cleanup Rules
  cleanup?: {
    incompleteUploads?: number; // days
    oldVersions?: number; // days
    deleteExpired?: boolean;
  };

  // Compliance
  compliance?: {
    retainDays: number;
    legalHold?: boolean;
    preventDelete?: boolean;
  };
}

export interface ObjectLifecycleState {
  key: string;
  bucket: string;
  createdAt: string;
  lastModified: string;
  lastAccessed?: string;
  storageClass: StorageClass;
  size: number;
  ttl?: {
    expiresAt: string;
    ruleId: string;
  };
  transitions: Array<{
    toClass: StorageClass;
    transitionedAt: string;
  }>;
  metadata: Record<string, string>;
  tags: Record<string, string>;
}

export interface LifecycleMetrics {
  totalObjects: number;
  byStorageClass: Record<StorageClass, number>;
  expiredObjects: number;
  pendingTransitions: number;
  totalSize: number;
  sizeByClass: Record<StorageClass, number>;
  estimatedSavings: number;
}

export interface CleanupReport {
  timestamp: string;
  objectsDeleted: number;
  objectsArchived: number;
  objectsTransitioned: number;
  spaceReclaimed: number;
  errors: Array<{ key: string; error: string }>;
  rulesApplied: string[];
}

export class R2LifecycleManager {
  private rules: Map<string, LifecycleRule> = new Map();
  private objectStates: Map<string, ObjectLifecycleState> = new Map();
  private isRunning: boolean = false;
  private scanInterval: number = 3600000; // 1 hour default
  private intervalId?: Timer;

  constructor() {
    this.loadDefaultRules();
  }

  /**
   * Initialize the lifecycle manager
   */
  async initialize(): Promise<void> {
    console.log(styled('⏰ Initializing R2 Lifecycle Manager', 'accent'));

    // Start background scanning
    this.startBackgroundScan();

    console.log(styled('✅ Lifecycle manager initialized', 'success'));
  }

  /**
   * Load default lifecycle rules
   */
  private loadDefaultRules(): void {
    // Default TTL rule for temporary data
    this.addRule({
      id: 'default-ttl-30d',
      name: 'Default 30-Day TTL',
      enabled: true,
      prefix: 'temp/',
      ttl: { deleteAfterDays: 30 },
    });

    // Log archival rule
    this.addRule({
      id: 'logs-archive',
      name: 'Log Archival Policy',
      enabled: true,
      prefix: 'logs/',
      transitions: [
        { storageClass: 'warm', days: 7 },
        { storageClass: 'cold', days: 30 },
        { storageClass: 'archive', days: 90 },
      ],
      cleanup: { oldVersions: 365 },
    });

    // MCP data lifecycle
    this.addRule({
      id: 'mcp-lifecycle',
      name: 'MCP Data Lifecycle',
      enabled: true,
      prefix: 'mcp/',
      transitions: [
        { storageClass: 'warm', days: 30 },
        { storageClass: 'cold', days: 90 },
      ],
      cleanup: { incompleteUploads: 1 },
    });

    // Diagnostics cleanup
    this.addRule({
      id: 'diagnostics-cleanup',
      name: 'Old Diagnostics Cleanup',
      enabled: true,
      prefix: 'mcp/diagnoses/',
      ttl: { deleteAfterDays: 180 },
    });
  }

  /**
   * Add a lifecycle rule
   */
  addRule(rule: LifecycleRule): void {
    this.rules.set(rule.id, rule);
    console.log(styled(`📋 Added lifecycle rule: ${rule.name}`, 'info'));
  }

  /**
   * Remove a lifecycle rule
   */
  removeRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  /**
   * Get all rules
   */
  getRules(): LifecycleRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get rule by ID
   */
  getRule(ruleId: string): LifecycleRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Enable/disable rule
   */
  setRuleEnabled(ruleId: string, enabled: boolean): boolean {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = enabled;
      return true;
    }
    return false;
  }

  /**
   * Register an object for lifecycle management
   */
  registerObject(
    key: string,
    bucket: string,
    metadata: Record<string, string> = {},
    tags: Record<string, string> = {}
  ): ObjectLifecycleState {
    const existing = this.objectStates.get(`${bucket}/${key}`);

    const state: ObjectLifecycleState = {
      key,
      bucket,
      createdAt: existing?.createdAt || new Date().toISOString(),
      lastModified: new Date().toISOString(),
      storageClass: existing?.storageClass || 'hot',
      size: parseInt(metadata['content-length'] || '0'),
      transitions: existing?.transitions || [],
      metadata,
      tags,
    };

    // Apply matching rules
    this.applyRulesToObject(state);

    this.objectStates.set(`${bucket}/${key}`, state);
    return state;
  }

  /**
   * Apply matching lifecycle rules to an object
   */
  private applyRulesToObject(state: ObjectLifecycleState): void {
    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;
      if (!this.objectMatchesRule(state, rule)) continue;

      // Apply TTL
      if (rule.ttl?.deleteAfterDays) {
        const expiresAt = new Date(state.createdAt);
        expiresAt.setDate(expiresAt.getDate() + rule.ttl.deleteAfterDays);
        state.ttl = {
          expiresAt: expiresAt.toISOString(),
          ruleId: rule.id,
        };
      }

      // Note: Transitions are handled during scan
    }
  }

  /**
   * Check if object matches a rule
   */
  private objectMatchesRule(state: ObjectLifecycleState, rule: LifecycleRule): boolean {
    // Check prefix
    if (rule.prefix && !state.key.startsWith(rule.prefix)) {
      return false;
    }

    // Check tags
    if (rule.tags) {
      for (const [key, value] of Object.entries(rule.tags)) {
        if (state.tags[key] !== value) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Start background scanning for lifecycle actions
   */
  private startBackgroundScan(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.intervalId = setInterval(() => {
      this.performLifecycleScan();
    }, this.scanInterval);

    console.log(
      styled(`🔄 Background scan started (interval: ${this.scanInterval / 60000}min)`, 'info')
    );
  }

  /**
   * Stop background scanning
   */
  stopBackgroundScan(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.isRunning = false;
    console.log(styled('🛑 Background scan stopped', 'warning'));
  }

  /**
   * Perform lifecycle scan
   */
  async performLifecycleScan(): Promise<CleanupReport> {
    console.log(styled('🔍 Performing lifecycle scan...', 'info'));

    const report: CleanupReport = {
      timestamp: new Date().toISOString(),
      objectsDeleted: 0,
      objectsArchived: 0,
      objectsTransitioned: 0,
      spaceReclaimed: 0,
      errors: [],
      rulesApplied: [],
    };

    const now = new Date();
    const objectsToDelete: string[] = [];
    const objectsToTransition: Array<{ key: string; toClass: StorageClass }> = [];

    // Scan all registered objects
    for (const state of this.objectStates.values()) {
      // Check TTL expiration
      if (state.ttl) {
        const expiresAt = new Date(state.ttl.expiresAt);
        if (now >= expiresAt) {
          objectsToDelete.push(state.key);
          report.objectsDeleted++;
          report.spaceReclaimed += state.size;

          r2EventSystem.emit({
            type: 'lifecycle:expired',
            bucket: state.bucket,
            key: state.key,
            source: 'R2LifecycleManager',
          });
          continue;
        }
      }

      // Check transitions
      for (const rule of this.rules.values()) {
        if (!rule.enabled || !this.objectMatchesRule(state, rule)) continue;

        if (rule.transitions) {
          for (const transition of rule.transitions) {
            const daysSinceCreation =
              (now.getTime() - new Date(state.createdAt).getTime()) / (1000 * 60 * 60 * 24);

            if (
              daysSinceCreation >= transition.days &&
              state.storageClass !== transition.storageClass
            ) {
              // Check if already transitioned to this class
              const alreadyTransitioned = state.transitions.some(
                t => t.toClass === transition.storageClass
              );

              if (!alreadyTransitioned) {
                objectsToTransition.push({
                  key: state.key,
                  toClass: transition.storageClass,
                });
                report.objectsTransitioned++;

                if (
                  transition.storageClass === 'archive' ||
                  transition.storageClass === 'deep-archive'
                ) {
                  report.objectsArchived++;
                }
              }
            }
          }
        }
      }
    }

    // Execute deletions
    if (objectsToDelete.length > 0) {
      try {
        // Group by bucket
        const byBucket = new Map<string, string[]>();
        for (const key of objectsToDelete) {
          const state = this.objectStates.get(key);
          if (state) {
            const bucket = state.bucket;
            if (!byBucket.has(bucket)) byBucket.set(bucket, []);
            byBucket.get(bucket)!.push(key);
          }
        }

        for (const [bucket, keys] of byBucket) {
          await r2BatchOperations.batchDelete(bucket, keys);
        }
      } catch (error) {
        report.errors.push({ key: 'batch-delete', error: error.message });
      }
    }

    // Execute transitions
    for (const { key, toClass } of objectsToTransition) {
      try {
        await this.transitionObject(key, toClass);
      } catch (error) {
        report.errors.push({ key, error: error.message });
      }
    }

    report.rulesApplied = Array.from(this.rules.values())
      .filter(r => r.enabled)
      .map(r => r.id);

    console.log(
      styled(
        `✅ Lifecycle scan complete: ${report.objectsDeleted} deleted, ${report.objectsTransitioned} transitioned`,
        'success'
      )
    );

    return report;
  }

  /**
   * Transition object to different storage class
   */
  async transitionObject(key: string, toClass: StorageClass): Promise<void> {
    const state = this.objectStates.get(key);
    if (!state) throw new Error(`Object not found: ${key}`);

    const fromClass = state.storageClass;

    // Update state
    state.storageClass = toClass;
    state.transitions.push({
      toClass,
      transitionedAt: new Date().toISOString(),
    });

    // Emit event
    r2EventSystem.emit({
      type: 'lifecycle:archived',
      bucket: state.bucket,
      key: state.key,
      source: 'R2LifecycleManager',
      metadata: { fromClass, toClass },
    });

    console.log(styled(`📦 Transitioned ${key}: ${fromClass} → ${toClass}`, 'info'));
  }

  /**
   * Manually delete expired objects
   */
  async cleanupExpired(bucket?: string): Promise<CleanupReport> {
    console.log(styled('🧹 Cleaning up expired objects...', 'info'));
    return this.performLifecycleScan();
  }

  /**
   * Get lifecycle metrics
   */
  getMetrics(): LifecycleMetrics {
    const metrics: LifecycleMetrics = {
      totalObjects: 0,
      byStorageClass: { hot: 0, warm: 0, cold: 0, archive: 0, 'deep-archive': 0 },
      expiredObjects: 0,
      pendingTransitions: 0,
      totalSize: 0,
      sizeByClass: { hot: 0, warm: 0, cold: 0, archive: 0, 'deep-archive': 0 },
      estimatedSavings: 0,
    };

    const now = new Date();

    for (const state of this.objectStates.values()) {
      metrics.totalObjects++;
      metrics.byStorageClass[state.storageClass]++;
      metrics.totalSize += state.size;
      metrics.sizeByClass[state.storageClass] += state.size;

      // Check if expired
      if (state.ttl && new Date(state.ttl.expiresAt) <= now) {
        metrics.expiredObjects++;
      }

      // Calculate potential savings (archive vs hot)
      if (state.storageClass === 'hot' || state.storageClass === 'warm') {
        metrics.estimatedSavings += state.size * 0.7; // Assume 70% savings for archive
      }
    }

    return metrics;
  }

  /**
   * Set object TTL
   */
  setObjectTTL(key: string, days: number): boolean {
    const state = this.objectStates.get(key);
    if (!state) return false;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    state.ttl = {
      expiresAt: expiresAt.toISOString(),
      ruleId: 'manual',
    };

    return true;
  }

  /**
   * Clear object TTL
   */
  clearObjectTTL(key: string): boolean {
    const state = this.objectStates.get(key);
    if (!state) return false;

    delete state.ttl;
    return true;
  }

  /**
   * Get objects nearing expiration
   */
  getExpiringObjects(days: number = 7): ObjectLifecycleState[] {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);

    return Array.from(this.objectStates.values()).filter(state => {
      if (!state.ttl) return false;
      const expiresAt = new Date(state.ttl.expiresAt);
      return expiresAt <= cutoff;
    });
  }

  /**
   * Generate compliance report
   */
  generateComplianceReport(): {
    timestamp: string;
    retentionSummary: Record<string, { count: number; size: number }>;
    complianceStatus: 'compliant' | 'warning' | 'violation';
    recommendations: string[];
  } {
    const metrics = this.getMetrics();
    const recommendations: string[] = [];

    // Analyze storage distribution
    const hotRatio = metrics.byStorageClass.hot / metrics.totalObjects;
    if (hotRatio > 0.5) {
      recommendations.push(
        'Consider transitioning more objects to warm/cold storage to reduce costs'
      );
    }

    // Check for expired objects
    if (metrics.expiredObjects > 0) {
      recommendations.push(`${metrics.expiredObjects} expired objects should be cleaned up`);
    }

    // Compliance status
    let complianceStatus: 'compliant' | 'warning' | 'violation' = 'compliant';
    if (metrics.expiredObjects > 100) complianceStatus = 'violation';
    else if (metrics.expiredObjects > 0) complianceStatus = 'warning';

    return {
      timestamp: new Date().toISOString(),
      retentionSummary: {
        hot: { count: metrics.byStorageClass.hot, size: metrics.sizeByClass.hot },
        warm: { count: metrics.byStorageClass.warm, size: metrics.sizeByClass.warm },
        cold: { count: metrics.byStorageClass.cold, size: metrics.sizeByClass.cold },
        archive: { count: metrics.byStorageClass.archive, size: metrics.sizeByClass.archive },
      },
      complianceStatus,
      recommendations,
    };
  }

  /**
   * Display lifecycle status
   */
  displayStatus(): void {
    console.log(styled('\n⏰ R2 Lifecycle Manager Status', 'accent'));
    console.log(styled('==============================', 'accent'));

    console.log(styled('\n📋 Active Rules:', 'info'));
    for (const rule of this.rules.values()) {
      const status = rule.enabled ? styled('✅', 'success') : styled('❌', 'error');
      console.log(styled(`  ${status} ${rule.name} (${rule.id})`, 'muted'));
      if (rule.ttl) {
        console.log(styled(`     TTL: ${rule.ttl.deleteAfterDays} days`, 'muted'));
      }
      if (rule.transitions) {
        rule.transitions.forEach(t => {
          console.log(styled(`     → ${t.storageClass}: ${t.days} days`, 'muted'));
        });
      }
    }

    const metrics = this.getMetrics();
    console.log(styled('\n📊 Storage Metrics:', 'info'));
    console.log(styled(`  Total Objects: ${metrics.totalObjects}`, 'muted'));
    console.log(
      styled(`  Total Size: ${(metrics.totalSize / 1024 / 1024).toFixed(2)} MB`, 'muted')
    );
    console.log(
      styled(
        `  Expired Objects: ${metrics.expiredObjects}`,
        metrics.expiredObjects > 0 ? 'warning' : 'muted'
      )
    );

    console.log(styled('\n📦 Storage Distribution:', 'info'));
    for (const [cls, count] of Object.entries(metrics.byStorageClass)) {
      if (count > 0) {
        const size = (metrics.sizeByClass[cls as StorageClass] / 1024 / 1024).toFixed(2);
        console.log(styled(`  ${cls}: ${count} objects (${size} MB)`, 'muted'));
      }
    }
  }
}

// Export singleton
export const r2LifecycleManager = new R2LifecycleManager();

// CLI interface
if (import.meta.main) {
  const lifecycle = r2LifecycleManager;
  await lifecycle.initialize();

  console.log(styled('⏰ R2 Lifecycle Manager Demo', 'accent'));
  console.log(styled('============================', 'accent'));

  // Register some test objects
  lifecycle.registerObject(
    'temp/file1.json',
    'scanner-cookies',
    { 'content-length': '1024' },
    { type: 'temp' }
  );

  lifecycle.registerObject(
    'logs/app-2024-01-01.log',
    'scanner-cookies',
    { 'content-length': '10485760' },
    { type: 'log' }
  );

  lifecycle.registerObject(
    'mcp/diagnoses/test.json',
    'scanner-cookies',
    { 'content-length': '2048' },
    { type: 'diagnosis' }
  );

  // Display status
  lifecycle.displayStatus();

  // Perform cleanup
  console.log(styled('\n🧹 Running cleanup scan...', 'info'));
  const report = await lifecycle.performLifecycleScan();

  console.log(styled('\n📋 Cleanup Report:', 'info'));
  console.log(styled(`  Objects Deleted: ${report.objectsDeleted}`, 'muted'));
  console.log(styled(`  Objects Transitioned: ${report.objectsTransitioned}`, 'muted'));
  console.log(
    styled(`  Space Reclaimed: ${(report.spaceReclaimed / 1024 / 1024).toFixed(2)} MB`, 'muted')
  );

  // Compliance report
  const compliance = lifecycle.generateComplianceReport();
  console.log(
    styled(
      '\n📜 Compliance Status:',
      compliance.complianceStatus === 'compliant' ? 'success' : 'warning'
    )
  );
  console.log(styled(`  Status: ${compliance.complianceStatus.toUpperCase()}`, 'muted'));
  compliance.recommendations.forEach(rec => {
    console.log(styled(`  💡 ${rec}`, 'info'));
  });
}
