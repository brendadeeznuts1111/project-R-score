/**
 * Feature Flags Service
 * Manages feature toggles and conditional functionality
 */

import { BaseService } from './base-service';

export interface FeatureFlag {
  name: string;
  enabled: boolean;
  description: string;
  rolloutPercentage?: number;
  userWhitelist?: string[];
  conditions?: FeatureCondition[];
}

export interface FeatureCondition {
  type: 'user' | 'environment' | 'time' | 'custom';
  value: any;
}

export class FeatureFlagsService extends BaseService {
  private flags: Map<string, FeatureFlag> = new Map();
  private userCache: Map<string, boolean> = new Map();

  constructor() {
    super('FeatureFlagsService');
    this.initializeDefaultFlags();
  }

  async initialize(): Promise<void> {
    await super.initialize();
    console.log('Feature flags service initialized');
  }

  /**
   * Initialize default feature flags
   */
  private initializeDefaultFlags(): void {
    const defaultFlags: FeatureFlag[] = [
      {
        name: 'new-dashboard',
        enabled: true,
        description: 'New dashboard interface with enhanced analytics',
      },
      {
        name: 'real-time-notifications',
        enabled: false,
        description: 'Real-time notification system',
        rolloutPercentage: 25,
      },
      {
        name: 'advanced-logging',
        enabled: true,
        description: 'Enhanced logging with detailed analytics',
      },
      {
        name: 'beta-features',
        enabled: false,
        description: 'Experimental features for beta testing',
        userWhitelist: ['admin@example.com'],
      },
    ];

    defaultFlags.forEach(flag => this.flags.set(flag.name, flag));
  }

  /**
   * Check if a feature is enabled for a user
   */
  isEnabled(featureName: string, userId?: string, context?: any): boolean {
    const flag = this.flags.get(featureName);
    if (!flag) {
      console.warn(`Feature flag '${featureName}' not found`);
      return false;
    }

    if (!flag.enabled) {
      return false;
    }

    // Check user whitelist
    if (flag.userWhitelist && userId) {
      if (!flag.userWhitelist.includes(userId)) {
        return false;
      }
    }

    // Check rollout percentage
    if (flag.rolloutPercentage !== undefined && userId) {
      if (!this.isUserInRollout(userId, flag.rolloutPercentage)) {
        return false;
      }
    }

    // Check custom conditions
    if (flag.conditions && context) {
      return this.evaluateConditions(flag.conditions, context);
    }

    return true;
  }

  /**
   * Enable or disable a feature flag
   */
  setEnabled(featureName: string, enabled: boolean): boolean {
    const flag = this.flags.get(featureName);
    if (!flag) {
      console.warn(`Feature flag '${featureName}' not found`);
      return false;
    }

    flag.enabled = enabled;
    console.log(`Feature '${featureName}' ${enabled ? 'enabled' : 'disabled'}`);
    return true;
  }

  /**
   * Update feature flag configuration
   */
  updateFlag(featureName: string, updates: Partial<FeatureFlag>): boolean {
    const flag = this.flags.get(featureName);
    if (!flag) {
      console.warn(`Feature flag '${featureName}' not found`);
      return false;
    }

    Object.assign(flag, updates);
    console.log(`Feature '${featureName}' updated:`, updates);
    return true;
  }

  /**
   * Add a new feature flag
   */
  addFlag(flag: FeatureFlag): boolean {
    if (this.flags.has(flag.name)) {
      console.warn(`Feature flag '${flag.name}' already exists`);
      return false;
    }

    this.flags.set(flag.name, flag);
    console.log(`Feature flag '${flag.name}' added`);
    return true;
  }

  /**
   * Remove a feature flag
   */
  removeFlag(featureName: string): boolean {
    const removed = this.flags.delete(featureName);
    if (removed) {
      console.log(`Feature flag '${featureName}' removed`);
    } else {
      console.warn(`Feature flag '${featureName}' not found`);
    }
    return removed;
  }

  /**
   * Get all feature flags
   */
  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  /**
   * Get a specific feature flag
   */
  getFlag(featureName: string): FeatureFlag | undefined {
    return this.flags.get(featureName);
  }

  /**
   * Get feature flags for a user
   */
  getUserFlags(userId: string): Record<string, boolean> {
    const userFlags: Record<string, boolean> = {};

    for (const [name, flag] of this.flags) {
      userFlags[name] = this.isEnabled(name, userId);
    }

    return userFlags;
  }

  /**
   * Check if user is in rollout percentage
   */
  private isUserInRollout(userId: string, percentage: number): boolean {
    // Use user ID hash to determine if user is in rollout
    const hash = this.simpleHash(userId);
    const normalizedHash = ((hash % 100) + 100) % 100; // Ensure positive 0-99
    return normalizedHash < percentage;
  }

  /**
   * Evaluate custom conditions
   */
  private evaluateConditions(conditions: FeatureCondition[], context: any): boolean {
    return conditions.every(condition => {
      switch (condition.type) {
        case 'user':
          return context.userId === condition.value;
        case 'environment':
          return process.env.NODE_ENV === condition.value;
        case 'time':
          return new Date() < new Date(condition.value);
        case 'custom':
          return this.evaluateCustomCondition(condition.value, context);
        default:
          return false;
      }
    });
  }

  /**
   * Evaluate custom condition logic
   */
  private evaluateCustomCondition(condition: any, context: any): boolean {
    // Implement custom condition logic here
    // This could include complex business rules
    return true; // Placeholder
  }

  /**
   * Simple hash function for rollout calculation
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  /**
   * Export feature flags configuration
   */
  exportConfig(): Record<string, FeatureFlag> {
    const config: Record<string, FeatureFlag> = {};
    for (const [name, flag] of this.flags) {
      config[name] = { ...flag };
    }
    return config;
  }

  /**
   * Import feature flags configuration
   */
  importConfig(config: Record<string, FeatureFlag>): void {
    this.flags.clear();
    for (const [name, flag] of Object.entries(config)) {
      this.flags.set(name, flag);
    }
    console.log(`Imported ${Object.keys(config).length} feature flags`);
  }
}
