// packages/odds-core/src/utils/lifecycle-manager.ts - Metadata Lifecycle Management

import { EventEmitter } from 'events';
import {
  MetadataLifecycle,
  MetadataLifecycleState,
  LifecycleTransition,
  LifecycleConfig,
  LifecycleEvent,
  LifecycleStats,
  LifecycleManagementRequest,
  LifecycleManagementResponse,
  LifecycleStorage,
  MetadataHistoryEntry,
  MetadataChange
} from '../types/lifecycle';
import { RealtimeMetadata } from './realtime';
import { QualityMetrics } from '../types/enhanced';

/**
 * Metadata lifecycle manager
 */
export class MetadataLifecycleManager extends EventEmitter {
  private lifecycles: Map<string, MetadataLifecycle> = new Map();
  private config: LifecycleConfig;
  private storage: LifecycleStorage;
  private isRunning = false;
  private processingTimer: NodeJS.Timeout | null = null;

  constructor(storage: LifecycleStorage, config: Partial<LifecycleConfig> = {}) {
    super();
    this.storage = storage;
    this.config = this.createDefaultConfig(config);
  }

  /**
   * Start the lifecycle manager
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Lifecycle manager is already running');
    }

    this.isRunning = true;
    await this.loadActiveLifecycles();
    this.startProcessingLoop();

    this.emit('managerStarted', { timestamp: Date.now() });
    console.log('🔄 Metadata lifecycle manager started');
  }

  /**
   * Stop the lifecycle manager
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = null;
    }

    await this.saveAllLifecycles();
    this.emit('managerStopped', { timestamp: Date.now() });
    console.log('🛑 Metadata lifecycle manager stopped');
  }

  /**
   * Create new metadata lifecycle
   */
  async createLifecycle(metadata: RealtimeMetadata, userId?: string): Promise<MetadataLifecycle> {
    const lifecycle: MetadataLifecycle = {
      id: metadata.id,
      currentState: MetadataLifecycleState.CREATED,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastAccessedAt: Date.now(),
      version: 1,
      history: [],
      transitions: [],
      config: this.config
    };

    // Add initial history entry
    const historyEntry: MetadataHistoryEntry = {
      version: 1,
      timestamp: Date.now(),
      state: MetadataLifecycleState.CREATED,
      changes: [{
        field: 'metadata',
        oldValue: null,
        newValue: metadata,
        changeType: 'create'
      }],
      quality: metadata.quality || { overall: 0, completeness: 0, accuracy: 0, freshness: 0, consistency: 0, validity: 0 },
      userId,
      reason: 'Metadata created'
    };

    lifecycle.history.push(historyEntry);
    lifecycle.transitions.push({
      from: MetadataLifecycleState.CREATED,
      to: MetadataLifecycleState.CREATED,
      timestamp: Date.now(),
      reason: 'Initial state',
      userId
    });

    this.lifecycles.set(metadata.id, lifecycle);
    await this.storage.save(lifecycle);

    // Auto-transition to active state
    await this.transitionState(metadata.id, MetadataLifecycleState.ACTIVE, 'Auto-activation', userId);

    this.emit('lifecycleCreated', { metadataId: metadata.id, lifecycle });
    return lifecycle;
  }

  /**
   * Transition metadata state
   */
  async transitionState(
    metadataId: string,
    targetState: MetadataLifecycleState,
    reason: string,
    userId?: string,
    force: boolean = false
  ): Promise<LifecycleManagementResponse> {
    const lifecycle = this.lifecycles.get(metadataId);
    if (!lifecycle) {
      throw new Error(`Lifecycle not found for metadata: ${metadataId}`);
    }

    const oldState = lifecycle.currentState;
    
    // Validate transition
    const validation = this.validateTransition(lifecycle, targetState, force);
    if (!validation.valid) {
      return {
        success: false,
        metadataId,
        oldState,
        newState: oldState,
        transition: {} as LifecycleTransition,
        warnings: validation.warnings,
        errors: validation.errors
      };
    }

    // Create transition
    const transition: LifecycleTransition = {
      from: oldState,
      to: targetState,
      timestamp: Date.now(),
      reason,
      userId
    };

    // Update lifecycle
    lifecycle.currentState = targetState;
    lifecycle.updatedAt = Date.now();
    lifecycle.lastAccessedAt = Date.now();
    lifecycle.transitions.push(transition);

    // Add history entry
    const historyEntry: MetadataHistoryEntry = {
      version: lifecycle.version + 1,
      timestamp: Date.now(),
      state: targetState,
      changes: [{
        field: 'state',
        oldValue: oldState,
        newValue: targetState,
        changeType: 'update'
      }],
      quality: { overall: 0, completeness: 0, accuracy: 0, freshness: 0, consistency: 0, validity: 0 },
      userId,
      reason
    };

    lifecycle.history.push(historyEntry);
    lifecycle.version++;

    // Save and emit
    await this.storage.save(lifecycle);
    this.emit('stateTransitioned', { metadataId, oldState, newState: targetState, transition });

    return {
      success: true,
      metadataId,
      oldState,
      newState: targetState,
      transition,
      warnings: validation.warnings,
      errors: []
    };
  }

  /**
   * Process lifecycle management request
   */
  async processRequest(request: LifecycleManagementRequest): Promise<LifecycleManagementResponse> {
    const lifecycle = this.lifecycles.get(request.metadataId);
    if (!lifecycle) {
      throw new Error(`Lifecycle not found for metadata: ${request.metadataId}`);
    }

    switch (request.action) {
      case 'transition':
        if (!request.targetState) {
          throw new Error('Target state is required for transition action');
        }
        return await this.transitionState(
          request.metadataId,
          request.targetState,
          request.reason,
          request.userId,
          request.force
        );

      case 'extend':
        return await this.extendLifecycle(request.metadataId, request.reason, request.userId);

      case 'archive':
        return await this.archiveMetadata(request.metadataId, request.reason, request.userId, request.force);

      case 'delete':
        return await this.deleteMetadata(request.metadataId, request.reason, request.userId, request.force);

      case 'restore':
        return await this.restoreMetadata(request.metadataId, request.reason, request.userId);

      default:
        throw new Error(`Unknown action: ${request.action}`);
    }
  }

  /**
   * Get lifecycle for metadata
   */
  getLifecycle(metadataId: string): MetadataLifecycle | null {
    return this.lifecycles.get(metadataId) || null;
  }

  /**
   * Get all lifecycles by state
   */
  getLifecyclesByState(state: MetadataLifecycleState): MetadataLifecycle[] {
    return Array.from(this.lifecycles.values())
      .filter(lifecycle => lifecycle.currentState === state);
  }

  /**
   * Get lifecycle statistics
   */
  async getStats(): Promise<LifecycleStats> {
    const lifecycles = Array.from(this.lifecycles.values());
    const now = Date.now();

    // Count by state
    const byState: Record<MetadataLifecycleState, number> = {} as any;
    Object.values(MetadataLifecycleState).forEach(state => {
      byState[state] = 0;
    });

    let totalAge = 0;
    let transitionsToday = 0;
    let expiredCount = 0;
    let archivalCandidates = 0;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayTimestamp = todayStart.getTime();

    lifecycles.forEach(lifecycle => {
      byState[lifecycle.currentState]++;
      
      const age = now - lifecycle.createdAt;
      totalAge += age;

      // Count transitions today
      const todayTransitions = lifecycle.transitions.filter(t => t.timestamp >= todayTimestamp);
      transitionsToday += todayTransitions.length;

      // Check for expiration
      if (lifecycle.expiresAt && now > lifecycle.expiresAt) {
        expiredCount++;
      }

      // Check for archival candidates
      if (this.isArchivalCandidate(lifecycle)) {
        archivalCandidates++;
      }
    });

    return {
      total: lifecycles.length,
      byState,
      averageAge: lifecycles.length > 0 ? totalAge / lifecycles.length : 0,
      transitionsToday,
      expiredCount,
      archivalCandidates
    };
  }

  /**
   * Update metadata access time
   */
  updateAccessTime(metadataId: string): void {
    const lifecycle = this.lifecycles.get(metadataId);
    if (lifecycle) {
      lifecycle.lastAccessedAt = Date.now();
    }
  }

  /**
   * Validate state transition
   */
  private validateTransition(
    lifecycle: MetadataLifecycle,
    targetState: MetadataLifecycleState,
    force: boolean = false
  ): { valid: boolean; warnings: string[]; errors: string[] } {
    const warnings: string[] = [];
    const errors: string[] = [];

    if (!force) {
      // Check if transition is allowed
      const allowedTransitions = this.config.allowedTransitions.get(lifecycle.currentState) || [];
      if (!allowedTransitions.includes(targetState)) {
        errors.push(`Transition from ${lifecycle.currentState} to ${targetState} is not allowed`);
      }

      // Check quality threshold
      if (targetState === MetadataLifecycleState.ACTIVE) {
        // Would need to fetch current quality - simplified for now
        // const quality = this.getCurrentQuality(lifecycle.id);
        // if (quality < this.config.minQualityThreshold) {
        //   errors.push(`Quality below threshold for active state`);
        // }
      }

      // Check age constraints
      const age = Date.now() - lifecycle.createdAt;
      if (targetState === MetadataLifecycleState.ACTIVE && age > this.config.maxAgeThreshold) {
        warnings.push('Metadata is old for active state');
      }
    }

    return {
      valid: errors.length === 0,
      warnings,
      errors
    };
  }

  /**
   * Extend metadata lifecycle
   */
  private async extendLifecycle(
    metadataId: string,
    reason: string,
    userId?: string
  ): Promise<LifecycleManagementResponse> {
    const lifecycle = this.lifecycles.get(metadataId);
    if (!lifecycle) {
      throw new Error(`Lifecycle not found for metadata: ${metadataId}`);
    }

    const oldState = lifecycle.currentState;
    
    // Extend expiration
    if (lifecycle.expiresAt) {
      lifecycle.expiresAt = Date.now() + this.config.activeTimeout;
    } else {
      lifecycle.expiresAt = Date.now() + this.config.activeTimeout;
    }

    lifecycle.updatedAt = Date.now();
    lifecycle.lastAccessedAt = Date.now();

    const transition: LifecycleTransition = {
      from: oldState,
      to: oldState,
      timestamp: Date.now(),
      reason: 'Lifecycle extended',
      userId
    };

    lifecycle.transitions.push(transition);
    await this.storage.save(lifecycle);

    this.emit('lifecycleExtended', { metadataId, lifecycle });

    return {
      success: true,
      metadataId,
      oldState,
      newState: oldState,
      transition,
      warnings: [],
      errors: []
    };
  }

  /**
   * Archive metadata
   */
  private async archiveMetadata(
    metadataId: string,
    reason: string,
    userId?: string,
    force: boolean = false
  ): Promise<LifecycleManagementResponse> {
    return await this.transitionState(
      metadataId,
      MetadataLifecycleState.ARCHIVING,
      reason,
      userId,
      force
    );
  }

  /**
   * Delete metadata
   */
  private async deleteMetadata(
    metadataId: string,
    reason: string,
    userId?: string,
    force: boolean = false
  ): Promise<LifecycleManagementResponse> {
    const lifecycle = this.lifecycles.get(metadataId);
    if (!lifecycle) {
      throw new Error(`Lifecycle not found for metadata: ${metadataId}`);
    }

    const oldState = lifecycle.currentState;
    
    if (!force && oldState !== MetadataLifecycleState.ARCHIVED) {
      return {
        success: false,
        metadataId,
        oldState,
        newState: oldState,
        transition: {} as LifecycleTransition,
        warnings: ['Metadata must be archived before deletion'],
        errors: ['Cannot delete metadata from non-archived state']
      };
    }

    // Transition to deleted
    const response = await this.transitionState(
      metadataId,
      MetadataLifecycleState.DELETED,
      reason,
      userId,
      force
    );

    if (response.success) {
      // Remove from active memory
      this.lifecycles.delete(metadataId);
      await this.storage.delete(metadataId);
    }

    return response;
  }

  /**
   * Restore metadata
   */
  private async restoreMetadata(
    metadataId: string,
    reason: string,
    userId?: string
  ): Promise<LifecycleManagementResponse> {
    const lifecycle = this.lifecycles.get(metadataId);
    if (!lifecycle) {
      throw new Error(`Lifecycle not found for metadata: ${metadataId}`);
    }

    if (lifecycle.currentState !== MetadataLifecycleState.ARCHIVED) {
      return {
        success: false,
        metadataId,
        oldState: lifecycle.currentState,
        newState: lifecycle.currentState,
        transition: {} as LifecycleTransition,
        warnings: [],
        errors: ['Only archived metadata can be restored']
      };
    }

    return await this.transitionState(
      metadataId,
      MetadataLifecycleState.ACTIVE,
      reason,
      userId
    );
  }

  /**
   * Check if metadata is archival candidate
   */
  private isArchivalCandidate(lifecycle: MetadataLifecycle): boolean {
    const now = Date.now();
    const age = now - lifecycle.createdAt;
    const lastAccess = now - lifecycle.lastAccessedAt;

    return (
      lifecycle.currentState === MetadataLifecycleState.ACTIVE &&
      (age > this.config.archivalDelay || lastAccess > this.config.archivalDelay)
    );
  }

  /**
   * Load active lifecycles from storage
   */
  private async loadActiveLifecycles(): Promise<void> {
    try {
      // Load all non-deleted lifecycles
      const activeStates = [
        MetadataLifecycleState.CREATED,
        MetadataLifecycleState.ACTIVE,
        MetadataLifecycleState.UPDATING,
        MetadataLifecycleState.VALIDATING,
        MetadataLifecycleState.DEPRECATED,
        MetadataLifecycleState.ARCHIVING,
        MetadataLifecycleState.ARCHIVED
      ];

      for (const state of activeStates) {
        const lifecycles = await this.storage.findByState(state);
        lifecycles.forEach(lifecycle => {
          this.lifecycles.set(lifecycle.id, lifecycle);
        });
      }

      console.log(`📂 Loaded ${this.lifecycles.size} active lifecycles`);
    } catch (error) {
      console.error('❌ Failed to load lifecycles:', error);
      throw error;
    }
  }

  /**
   * Save all lifecycles to storage
   */
  private async saveAllLifecycles(): Promise<void> {
    try {
      const lifecycleArray = Array.from(this.lifecycles.values());
      if (lifecycleArray.length > 0) {
        await this.storage.updateMultiple(lifecycleArray);
        console.log(`💾 Saved ${lifecycleArray.length} lifecycles to storage`);
      }
    } catch (error) {
      console.error('❌ Failed to save lifecycles:', error);
    }
  }

  /**
   * Start processing loop for automatic transitions
   */
  private startProcessingLoop(): void {
    this.processingTimer = setInterval(async () => {
      if (!this.isRunning) {
        return;
      }

      try {
        await this.processAutomaticTransitions();
      } catch (error) {
        console.error('❌ Processing loop error:', error);
      }
    }, 60000); // Process every minute
  }

  /**
   * Process automatic transitions
   */
  private async processAutomaticTransitions(): Promise<void> {
    const now = Date.now();
    const lifecycles = Array.from(this.lifecycles.values());

    for (const lifecycle of lifecycles) {
      // Check for expiration
      if (lifecycle.expiresAt && now > lifecycle.expiresAt) {
        if (lifecycle.currentState === MetadataLifecycleState.ACTIVE) {
          await this.transitionState(
            lifecycle.id,
            MetadataLifecycleState.DEPRECATED,
            'Metadata expired',
            'system'
          );
        }
      }

      // Check for archival candidates
      if (this.isArchivalCandidate(lifecycle)) {
        await this.transitionState(
          lifecycle.id,
          MetadataLifecycleState.ARCHIVING,
          'Metadata ready for archival',
          'system'
        );
      }

      // Process auto-transitions
      const autoRule = this.config.autoTransitions.get(lifecycle.currentState);
      if (autoRule && autoRule.enabled) {
        // Simplified condition checking - would be more complex in production
        if (this.shouldAutoTransition(lifecycle, autoRule)) {
          await this.transitionState(
            lifecycle.id,
            autoRule.targetState,
            `Automatic transition: ${autoRule.condition}`,
            'system'
          );
        }
      }
    }
  }

  /**
   * Check if metadata should auto-transition
   */
  private shouldAutoTransition(
    lifecycle: MetadataLifecycle,
    rule: LifecycleTransitionRule
  ): boolean {
    // Simplified condition checking
    const now = Date.now();
    const timeSinceLastTransition = now - lifecycle.updatedAt;
    
    return timeSinceLastTransition > rule.cooldown;
  }

  /**
   * Create default configuration
   */
  private createDefaultConfig(overrides: Partial<LifecycleConfig>): LifecycleConfig {
    const defaultConfig: LifecycleConfig = {
      activeTimeout: 24 * 60 * 60 * 1000, // 24 hours
      validationInterval: 60 * 60 * 1000, // 1 hour
      archivalDelay: 7 * 24 * 60 * 60 * 1000, // 7 days
      deletionDelay: 30 * 24 * 60 * 60 * 1000, // 30 days
      minQualityThreshold: 0.7,
      maxAgeThreshold: 30 * 24 * 60 * 60 * 1000, // 30 days
      allowedTransitions: new Map([
        [MetadataLifecycleState.CREATED, [MetadataLifecycleState.ACTIVE, MetadataLifecycleState.DELETED]],
        [MetadataLifecycleState.ACTIVE, [MetadataLifecycleState.UPDATING, MetadataLifecycleState.VALIDATING, MetadataLifecycleState.DEPRECATED, MetadataLifecycleState.ARCHIVING]],
        [MetadataLifecycleState.UPDATING, [MetadataLifecycleState.ACTIVE, MetadataLifecycleState.DEPRECATED]],
        [MetadataLifecycleState.VALIDATING, [MetadataLifecycleState.ACTIVE, MetadataLifecycleState.DEPRECATED]],
        [MetadataLifecycleState.DEPRECATED, [MetadataLifecycleState.ARCHIVING, MetadataLifecycleState.DELETED]],
        [MetadataLifecycleState.ARCHIVING, [MetadataLifecycleState.ARCHIVED, MetadataLifecycleState.ACTIVE]],
        [MetadataLifecycleState.ARCHIVED, [MetadataLifecycleState.DELETED, MetadataLifecycleState.ACTIVE]],
        [MetadataLifecycleState.DELETED, []] // No transitions from deleted
      ]),
      autoTransitions: new Map([
        [MetadataLifecycleState.ARCHIVING, {
          condition: 'archiving_complete',
          targetState: MetadataLifecycleState.ARCHIVED,
          cooldown: 5 * 60 * 1000, // 5 minutes
          enabled: true
        }]
      ])
    };

    return { ...defaultConfig, ...overrides };
  }
}
