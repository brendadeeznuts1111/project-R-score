// packages/odds-core/src/utils/lifecycle-storage.ts - Lifecycle Storage Implementation

import {
  LifecycleStorage,
  MetadataLifecycle,
  LifecycleStats,
  MetadataLifecycleState
} from '../types/lifecycle';

/**
 * In-memory implementation of lifecycle storage
 * Suitable for development and testing
 */
export class InMemoryLifecycleStorage implements LifecycleStorage {
  private lifecycles: Map<string, MetadataLifecycle> = new Map();

  /**
   * Save lifecycle to storage
   */
  async save(lifecycle: MetadataLifecycle): Promise<void> {
    this.lifecycles.set(lifecycle.id, { ...lifecycle });
  }

  /**
   * Load lifecycle by ID
   */
  async YAML.parse(metadataId: string): Promise<MetadataLifecycle | null> {
    const lifecycle = this.lifecycles.get(metadataId);
    return lifecycle ? { ...lifecycle } : null;
  }

  /**
   * Delete lifecycle by ID
   */
  async delete(metadataId: string): Promise<void> {
    this.lifecycles.delete(metadataId);
  }

  /**
   * Find lifecycles by state
   */
  async findByState(state: MetadataLifecycleState): Promise<MetadataLifecycle[]> {
    return Array.from(this.lifecycles.values())
      .filter(lifecycle => lifecycle.currentState === state)
      .map(lifecycle => ({ ...lifecycle }));
  }

  /**
   * Find expired lifecycles
   */
  async findExpired(): Promise<MetadataLifecycle[]> {
    const now = Date.now();
    return Array.from(this.lifecycles.values())
      .filter(lifecycle => lifecycle.expiresAt && now > lifecycle.expiresAt)
      .map(lifecycle => ({ ...lifecycle }));
  }

  /**
   * Find archival candidates
   */
  async findArchivalCandidates(): Promise<MetadataLifecycle[]> {
    const now = Date.now();
    return Array.from(this.lifecycles.values())
      .filter(lifecycle => {
        const age = now - lifecycle.createdAt;
        const lastAccess = now - lifecycle.lastAccessedAt;
        return lifecycle.currentState === MetadataLifecycleState.ACTIVE &&
               (age > 7 * 24 * 60 * 60 * 1000 || lastAccess > 7 * 24 * 60 * 60 * 1000); // 7 days
      })
      .map(lifecycle => ({ ...lifecycle }));
  }

  /**
   * Update multiple lifecycles
   */
  async updateMultiple(updates: MetadataLifecycle[]): Promise<void> {
    updates.forEach(lifecycle => {
      this.lifecycles.set(lifecycle.id, { ...lifecycle });
    });
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
      const lastAccess = now - lifecycle.lastAccessedAt;
      if (lifecycle.currentState === MetadataLifecycleState.ACTIVE &&
          (age > 7 * 24 * 60 * 60 * 1000 || lastAccess > 7 * 24 * 60 * 60 * 1000)) {
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
   * Clear all lifecycles (for testing)
   */
  async clear(): Promise<void> {
    this.lifecycles.clear();
  }

  /**
   * Get all lifecycles (for testing)
   */
  async getAll(): Promise<MetadataLifecycle[]> {
    return Array.from(this.lifecycles.values()).map(lifecycle => ({ ...lifecycle }));
  }

  /**
   * Get storage size (for testing)
   */
  size(): number {
    return this.lifecycles.size;
  }
}
