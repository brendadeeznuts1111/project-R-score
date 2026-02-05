/**
 * @fileoverview NEXUS Pattern Registry - Self-Updating Arbitrage Detection Patterns
 * @description Industrial-grade pattern management system with URLPattern routing
 * @module patterns
 */

import type { ArbitrageOpportunity, MarketCategory } from '../arbitrage/types';

/**
 * Pattern metadata schema
 */
export interface PatternMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  category: MarketCategory;
  priority: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
  author: string;
  created: string;
  updated: string;
  confidence: number; // 0-1
  performance: {
    avgExecutionTime: number;
    successRate: number;
    falsePositiveRate: number;
    totalMatches: number;
  };
  dependencies: string[]; // Other pattern IDs
  urlPattern?: string; // URLPattern for routing
  enabled: boolean;
}

/**
 * Pattern execution context
 */
export interface PatternContext {
  markets: any[]; // Market data from different venues
  timestamp: number;
  metadata: Record<string, any>;
}

/**
 * Pattern execution result
 */
export interface PatternResult {
  opportunities: ArbitrageOpportunity[];
  confidence: number;
  executionTime: number;
  metadata: Record<string, any>;
}

/**
 * Base pattern interface
 */
export interface ArbitragePattern {
  metadata: PatternMetadata;
  execute(context: PatternContext): Promise<PatternResult>;
  validate?(): boolean;
}

/**
 * Pattern registry entry
 */
interface RegistryEntry {
  pattern: ArbitragePattern;
  lastExecuted?: number;
  executionCount: number;
  avgExecutionTime: number;
  successCount: number;
}

/**
 * Pattern update event
 */
export interface PatternUpdateEvent {
  type: 'added' | 'updated' | 'removed' | 'enabled' | 'disabled';
  patternId: string;
  timestamp: number;
  metadata?: PatternMetadata;
}

/**
 * NEXUS Pattern Registry - Self-updating industrial pattern management
 *
 * Features:
 * - URLPattern-based routing for pattern distribution
 * - Self-updating via remote registries
 * - Performance monitoring and optimization
 * - Dependency management
 * - Priority-based execution
 * - Confidence scoring and validation
 */
export class PatternRegistry {
  private patterns = new Map<string, RegistryEntry>();
  private urlPatterns = new Map<string, { pattern: URLPattern; patternId: string }>();
  private updateCallbacks: Array<(event: PatternUpdateEvent) => void> = [];
  private remoteRegistries: string[] = [];
  private updateInterval?: ReturnType<typeof setInterval>;
  private isUpdating = false;

  constructor(autoUpdate = true) {
    if (autoUpdate) {
      this.startAutoUpdate();
    }
  }

  /**
   * Register a new arbitrage pattern
   */
  register(pattern: ArbitragePattern): void {
    const entry: RegistryEntry = {
      pattern,
      executionCount: 0,
      avgExecutionTime: 0,
      successCount: 0,
    };

    this.patterns.set(pattern.metadata.id, entry);

    // Register URL pattern if provided
    if (pattern.metadata.urlPattern) {
      try {
        const urlPattern = new URLPattern(pattern.metadata.urlPattern, 'http://localhost:3001');
        this.urlPatterns.set(pattern.metadata.id, {
          pattern: urlPattern,
          patternId: pattern.metadata.id,
        });
      } catch (error) {
        console.warn(`Invalid URL pattern for ${pattern.metadata.id}:`, error);
      }
    }

    this.notifyUpdate({
      type: 'added',
      patternId: pattern.metadata.id,
      timestamp: Date.now(),
      metadata: pattern.metadata,
    });
  }

  /**
   * Unregister a pattern
   */
  unregister(patternId: string): boolean {
    const entry = this.patterns.get(patternId);
    if (!entry) return false;

    this.patterns.delete(patternId);
    this.urlPatterns.delete(patternId);

    this.notifyUpdate({
      type: 'removed',
      patternId,
      timestamp: Date.now(),
    });

    return true;
  }

  /**
   * Enable/disable a pattern
   */
  setEnabled(patternId: string, enabled: boolean): boolean {
    const entry = this.patterns.get(patternId);
    if (!entry) return false;

    entry.pattern.metadata.enabled = enabled;

    this.notifyUpdate({
      type: enabled ? 'enabled' : 'disabled',
      patternId,
      timestamp: Date.now(),
      metadata: entry.pattern.metadata,
    });

    return true;
  }

  /**
   * Execute patterns against market data
   */
  async executePatterns(context: PatternContext): Promise<PatternResult[]> {
    const enabledPatterns = Array.from(this.patterns.values())
      .filter(entry => entry.pattern.metadata.enabled)
      .sort((a, b) => this.getPriorityWeight(b.pattern.metadata.priority) - this.getPriorityWeight(a.pattern.metadata.priority));

    const results: PatternResult[] = [];

    for (const entry of enabledPatterns) {
      try {
        const startTime = performance.now();
        const result = await entry.pattern.execute(context);
        const executionTime = performance.now() - startTime;

        // Update performance metrics
        entry.executionCount++;
        entry.lastExecuted = Date.now();
        entry.avgExecutionTime = (entry.avgExecutionTime * (entry.executionCount - 1) + executionTime) / entry.executionCount;

        if (result.opportunities.length > 0) {
          entry.successCount++;
        }

        // Update pattern metadata
        entry.pattern.metadata.performance = {
          avgExecutionTime: entry.avgExecutionTime,
          successRate: entry.successCount / entry.executionCount,
          falsePositiveRate: 0, // TODO: Implement false positive detection
          totalMatches: entry.successCount,
        };

        results.push(result);

      } catch (error) {
        console.error(`Pattern execution failed for ${entry.pattern.metadata.id}:`, error);
      }
    }

    return results;
  }

  /**
   * Match URL against registered patterns
   */
  matchUrl(url: string): ArbitragePattern | null {
    for (const { pattern, patternId } of this.urlPatterns.values()) {
      try {
        const match = pattern.exec(url);
        if (match) {
          const entry = this.patterns.get(patternId);
          return entry?.pattern || null;
        }
      } catch (error) {
        // Invalid URL, continue
      }
    }
    return null;
  }

  /**
   * Add remote registry for auto-updates
   */
  addRemoteRegistry(url: string): void {
    if (!this.remoteRegistries.includes(url)) {
      this.remoteRegistries.push(url);
    }
  }

  /**
   * Start auto-update process
   */
  startAutoUpdate(intervalMs = 300000): void { // 5 minutes default
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(() => {
      this.updateFromRemoteRegistries();
    }, intervalMs);
  }

  /**
   * Stop auto-update process
   */
  stopAutoUpdate(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = undefined;
    }
  }

  /**
   * Update patterns from remote registries
   */
  private async updateFromRemoteRegistries(): Promise<void> {
    if (this.isUpdating || this.remoteRegistries.length === 0) return;

    this.isUpdating = true;

    try {
      for (const registryUrl of this.remoteRegistries) {
        try {
          const response = await fetch(`${registryUrl}/patterns`);
          if (!response.ok) continue;

          const remotePatterns: PatternMetadata[] = await response.json();

          for (const remoteMeta of remotePatterns) {
            const localEntry = this.patterns.get(remoteMeta.id);

            // Update if newer version or doesn't exist
            if (!localEntry || this.compareVersions(remoteMeta.version, localEntry.pattern.metadata.version) > 0) {
              // Fetch full pattern
              const patternResponse = await fetch(`${registryUrl}/patterns/${remoteMeta.id}`);
              if (patternResponse.ok) {
                const fullPattern: ArbitragePattern = await patternResponse.json();
                this.register(fullPattern);
              }
            }
          }
        } catch (error) {
          console.warn(`Failed to update from registry ${registryUrl}:`, error);
        }
      }
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * Subscribe to pattern update events
   */
  onUpdate(callback: (event: PatternUpdateEvent) => void): () => void {
    this.updateCallbacks.push(callback);
    return () => {
      const index = this.updateCallbacks.indexOf(callback);
      if (index > -1) {
        this.updateCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Get all registered patterns
   */
  getAllPatterns(): PatternMetadata[] {
    return Array.from(this.patterns.values()).map(entry => entry.pattern.metadata);
  }

  /**
   * Get pattern by ID
   */
  getPattern(patternId: string): ArbitragePattern | null {
    return this.patterns.get(patternId)?.pattern || null;
  }

  /**
   * Get patterns by category
   */
  getPatternsByCategory(category: MarketCategory): ArbitragePattern[] {
    return Array.from(this.patterns.values())
      .filter(entry => entry.pattern.metadata.category === category)
      .map(entry => entry.pattern);
  }

  /**
   * Get patterns by priority
   */
  getPatternsByPriority(priority: PatternMetadata['priority']): ArbitragePattern[] {
    return Array.from(this.patterns.values())
      .filter(entry => entry.pattern.metadata.priority === priority)
      .map(entry => entry.pattern);
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalPatterns: number;
    enabledPatterns: number;
    categories: Record<MarketCategory, number>;
    priorities: Record<PatternMetadata['priority'], number>;
    avgExecutionTime: number;
    totalExecutions: number;
  } {
    const entries = Array.from(this.patterns.values());
    const enabled = entries.filter(e => e.pattern.metadata.enabled);

    const categories: Record<string, number> = {};
    const priorities: Record<string, number> = {};

    let totalExecutionTime = 0;
    let totalExecutions = 0;

    for (const entry of entries) {
      const cat = entry.pattern.metadata.category;
      const pri = entry.pattern.metadata.priority;

      categories[cat] = (categories[cat] || 0) + 1;
      priorities[pri] = (priorities[pri] || 0) + 1;

      totalExecutionTime += entry.avgExecutionTime * entry.executionCount;
      totalExecutions += entry.executionCount;
    }

    return {
      totalPatterns: entries.length,
      enabledPatterns: enabled.length,
      categories: categories as Record<MarketCategory, number>,
      priorities: priorities as Record<PatternMetadata['priority'], number>,
      avgExecutionTime: totalExecutions > 0 ? totalExecutionTime / totalExecutions : 0,
      totalExecutions,
    };
  }

  /**
   * Export registry as JSON
   */
  export(): { patterns: PatternMetadata[]; stats: ReturnType<PatternRegistry['getStats']> } {
    return {
      patterns: this.getAllPatterns(),
      stats: this.getStats(),
    };
  }

  /**
   * Import patterns from JSON
   */
  import(data: { patterns: ArbitragePattern[] }): void {
    for (const pattern of data.patterns) {
      this.register(pattern);
    }
  }

  private getPriorityWeight(priority: PatternMetadata['priority']): number {
    const weights = { critical: 4, high: 3, medium: 2, low: 1 };
    return weights[priority];
  }

  private compareVersions(version1: string, version2: string): number {
    const v1 = version1.split('.').map(Number);
    const v2 = version2.split('.').map(Number);

    for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
      const num1 = v1[i] || 0;
      const num2 = v2[i] || 0;

      if (num1 > num2) return 1;
      if (num1 < num2) return -1;
    }

    return 0;
  }

  private notifyUpdate(event: PatternUpdateEvent): void {
    for (const callback of this.updateCallbacks) {
      try {
        callback(event);
      } catch (error) {
        console.error('Pattern update callback error:', error);
      }
    }
  }
}

/**
 * Global pattern registry instance
 */
export const globalPatternRegistry = new PatternRegistry();

/**
 * Create a new pattern registry
 */
export function createPatternRegistry(autoUpdate = true): PatternRegistry {
  return new PatternRegistry(autoUpdate);
}

/**
 * Built-in arbitrage patterns
 */

// Cross-market spread pattern
export class CrossMarketSpreadPattern implements ArbitragePattern {
  metadata: PatternMetadata = {
    id: 'cross-market-spread',
    name: 'Cross-Market Spread Arbitrage',
    description: 'Detects arbitrage opportunities between different prediction markets',
    version: '1.0.0',
    category: 'crypto',
    priority: 'high',
    tags: ['spread', 'cross-market', 'prediction-markets'],
    author: 'NEXUS',
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    confidence: 0.85,
    performance: {
      avgExecutionTime: 0,
      successRate: 0,
      falsePositiveRate: 0,
      totalMatches: 0,
    },
    dependencies: [],
    urlPattern: '/api/arbitrage/crypto/*',
    enabled: true,
  };

  async execute(context: PatternContext): Promise<PatternResult> {
    const startTime = performance.now();

    // Implementation would analyze market data for spread opportunities
    const opportunities: ArbitrageOpportunity[] = [];

    // Mock implementation - in real scenario, this would analyze actual market data
    if (context.markets.length >= 2) {
      // Simple spread detection logic would go here
      opportunities.push({
        id: `spread-${Date.now()}`,
        event: {
          category: 'crypto',
          description: 'BTC Price Prediction',
          venue1: 'polymarket',
          venue2: 'kalshi',
        },
        spreadPercent: Math.random() * 5,
        isArbitrage: Math.random() > 0.7,
        liquidity: Math.random() * 100000,
        expectedValue: Math.random() * 0.1,
        timestamp: Date.now(),
      });
    }

    return {
      opportunities,
      confidence: this.metadata.confidence,
      executionTime: performance.now() - startTime,
      metadata: {
        marketsAnalyzed: context.markets.length,
        patternVersion: this.metadata.version,
      },
    };
  }
}

// Register built-in patterns
globalPatternRegistry.register(new CrossMarketSpreadPattern());