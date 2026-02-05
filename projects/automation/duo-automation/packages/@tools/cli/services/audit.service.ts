/**
 * packages/cli/services/audit.service.ts
 * Comprehensive audit logging for command execution, secrets access, and configuration changes
 * Maintains compliance and security audit trails
 */

import { Logger } from '../utils/logger';
import { Cache } from '../utils/cache';

export interface AuditEntry {
  id: string;
  timestamp: Date;
  type: 'command' | 'secret' | 'config' | 'error' | 'security';
  action: string;
  actor: string;
  resource?: string;
  status: 'success' | 'failed' | 'attempted';
  details?: Record<string, unknown>;
  duration?: number;
  error?: string;
}

export interface AuditFilter {
  type?: AuditEntry['type'];
  action?: string;
  status?: AuditEntry['status'];
  actor?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export interface AuditServiceConfig {
  logger?: Logger;
  persistPath?: string;
  maxEntries?: number;
  actor?: string;
}

/**
 * AuditService - Comprehensive audit logging for compliance and security
 * Tracks all command executions, secrets operations, and configuration changes
 */
export class AuditService {
  private logger: Logger;
  private entries: AuditEntry[] = [];
  private persistPath: string;
  private maxEntries: number;
  private actor: string;
  private saveTimer?: NodeJS.Timeout;

  constructor(config: AuditServiceConfig = {}) {
    this.logger = config.logger || new Logger();
    this.persistPath = config.persistPath || '';
    this.maxEntries = config.maxEntries ?? 10000;
    this.actor = config.actor || this.detectActor();

    this.logger.info('AuditService initialized', {
      persistPath: this.persistPath || '(in-memory)',
      actor: this.actor
    });

    // Start automated persistence
    if (this.persistPath) {
      this.startAutoPersist();
    }
  }

  /**
   * Record a command execution audit entry
   */
  recordCommand(
    command: string,
    args: Record<string, unknown>,
    status: 'success' | 'failed',
    duration: number,
    error?: string
  ): string {
    const entry: AuditEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      type: 'command',
      action: command,
      actor: this.actor,
      status,
      duration,
      details: {
        argumentCount: Object.keys(args).length,
        hasSecrets: Object.keys(args).some(k => 
          k.toLowerCase().includes('secret') || 
          k.toLowerCase().includes('token')
        )
      },
      error
    };

    this.addEntry(entry);
    return entry.id;
  }

  /**
   * Record a secrets operation audit entry
   */
  recordSecretsOperation(
    operation: 'get' | 'set' | 'delete' | 'list' | 'import' | 'export',
    secretName: string,
    status: 'success' | 'failed',
    error?: string
  ): string {
    const entry: AuditEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      type: 'secret',
      action: operation,
      actor: this.actor,
      resource: secretName,
      status,
      error
    };

    this.addEntry(entry);
    return entry.id;
  }

  /**
   * Record a configuration change audit entry
   */
  recordConfigChange(
    changes: Record<string, unknown>,
    status: 'success' | 'failed',
    error?: string
  ): string {
    const entry: AuditEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      type: 'config',
      action: 'update',
      actor: this.actor,
      status,
      details: {
        changedFields: Object.keys(changes)
      },
      error
    };

    this.addEntry(entry);
    return entry.id;
  }

  /**
   * Record a security-relevant event
   */
  recordSecurityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details?: Record<string, unknown>
  ): string {
    const entry: AuditEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      type: 'security',
      action: event,
      actor: this.actor,
      status: 'attempted',
      details: {
        severity,
        ...details
      }
    };

    this.addEntry(entry);
    this.logger.warn(`Security event: ${event}`, { severity, details });
    return entry.id;
  }

  /**
   * Record an error for audit trail
   */
  recordError(
    component: string,
    error: Error | string,
    context?: Record<string, unknown>
  ): string {
    const entry: AuditEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      type: 'error',
      action: component,
      actor: this.actor,
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
      details: context
    };

    this.addEntry(entry);
    return entry.id;
  }

  /**
   * Query audit log with filtering
   */
  query(filter: AuditFilter = {}): AuditEntry[] {
    let results = [...this.entries];

    if (filter.type) {
      results = results.filter(e => e.type === filter.type);
    }

    if (filter.action) {
      results = results.filter(e => e.action === filter.action);
    }

    if (filter.status) {
      results = results.filter(e => e.status === filter.status);
    }

    if (filter.actor) {
      results = results.filter(e => e.actor === filter.actor);
    }

    if (filter.startDate) {
      results = results.filter(e => e.timestamp >= filter.startDate!);
    }

    if (filter.endDate) {
      results = results.filter(e => e.timestamp <= filter.endDate!);
    }

    // Sort by timestamp descending
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit
    if (filter.limit) {
      results = results.slice(0, filter.limit);
    }

    return results;
  }

  /**
   * Get recent entries
   */
  getRecent(count = 50): AuditEntry[] {
    return this.entries.slice(-count).reverse();
  }

  /**
   * Get audit statistics
   */
  getStats(): Record<string, unknown> {
    const stats: Record<string, unknown> = {
      totalEntries: this.entries.length,
      types: {},
      actions: {},
      statuses: {}
    };

    for (const entry of this.entries) {
      // Count by type
      const typeCount = (stats.types as Record<string, number>)[entry.type] || 0;
      (stats.types as Record<string, number>)[entry.type] = typeCount + 1;

      // Count by action
      const actionCount = (stats.actions as Record<string, number>)[entry.action] || 0;
      (stats.actions as Record<string, number>)[entry.action] = actionCount + 1;

      // Count by status
      const statusCount = (stats.statuses as Record<string, number>)[entry.status] || 0;
      (stats.statuses as Record<string, number>)[entry.status] = statusCount + 1;
    }

    return stats;
  }

  /**
   * Export audit log to JSON
   */
  export(filter?: AuditFilter): Record<string, unknown> {
    const entries = filter ? this.query(filter) : this.entries;
    
    return {
      exported: new Date().toISOString(),
      actor: this.actor,
      count: entries.length,
      entries: entries.map(e => ({
        ...e,
        timestamp: e.timestamp.toISOString()
      }))
    };
  }

  /**
   * Clear all audit entries (WARNING: destructive)
   */
  clear(): void {
    const count = this.entries.length;
    this.entries = [];
    this.logger.warn(`Audit log cleared (${count} entries removed)`);
  }

  /**
   * Get entry count
   */
  count(): number {
    return this.entries.length;
  }

  /**
   * Persist audit log to file
   */
  async persist(): Promise<void> {
    if (!this.persistPath) return;

    try {
      const exported = this.export();
      await Bun.write(this.persistPath, JSON.stringify(exported, null, 2));
      this.logger.debug(`Audit log persisted to ${this.persistPath}`);
    } catch (error) {
      this.logger.error(`Failed to persist audit log: ${error}`);
    }
  }

  /**
   * Load audit log from file
   */
  async YAML.parse(): Promise<void> {
    if (!this.persistPath) return;

    try {
      const file = Bun.file(this.persistPath);
      const exists = await file.exists?.();
      
      if (!exists) return;

      const json = await file.json() as Record<string, unknown>;
      const entries = (json.entries as Array<Record<string, unknown>>) || [];

      for (const entry of entries) {
        this.entries.push({
          id: String(entry.id),
          timestamp: new Date(String(entry.timestamp)),
          type: entry.type as AuditEntry['type'],
          action: String(entry.action),
          actor: String(entry.actor),
          status: entry.status as AuditEntry['status'],
          resource: entry.resource as string | undefined,
          details: entry.details as Record<string, unknown> | undefined,
          duration: entry.duration as number | undefined,
          error: entry.error as string | undefined
        });
      }

      this.logger.debug(`Loaded ${this.entries.length} audit entries`);
    } catch (error) {
      this.logger.error(`Failed to load audit log: ${error}`);
    }
  }

  /**
   * Add entry and enforce size limits
   */
  private addEntry(entry: AuditEntry): void {
    this.entries.push(entry);

    // Enforce max entries
    if (this.entries.length > this.maxEntries) {
      const removed = this.entries.length - this.maxEntries;
      this.entries = this.entries.slice(-this.maxEntries);
      this.logger.debug(`Audit log trimmed (removed ${removed} oldest entries)`);
    }
  }

  /**
   * Generate unique audit entry ID
   */
  private generateId(): string {
    return `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Detect current actor (user/process)
   */
  private detectActor(): string {
    return Bun.env.USER || Bun.env.USERNAME || 'unknown-actor';
  }

  /**
   * Start automated persistence
   */
  private startAutoPersist(): void {
    // Auto-persist every 5 minutes
    this.saveTimer = setInterval(() => {
      this.persist().catch(err => 
        this.logger.error('Auto-persist failed:', { error: err })
      );
    }, 300000) as unknown as NodeJS.Timeout;

    if (this.saveTimer && typeof this.saveTimer.unref === 'function') {
      this.saveTimer.unref();
    }
  }

  /**
   * Stop automated persistence
   */
  stopAutoPersist(): void {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = undefined;
    }
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    this.stopAutoPersist();
    await this.persist();
  }
}

/**
 * Global audit service instance
 */
let globalAuditService: AuditService;

export function getGlobalAuditService(): AuditService {
  if (!globalAuditService) {
    globalAuditService = new AuditService();
  }
  return globalAuditService;
}

export function setGlobalAuditService(service: AuditService): void {
  globalAuditService = service;
}

export function resetGlobalAuditService(): void {
  globalAuditService = new AuditService();
}