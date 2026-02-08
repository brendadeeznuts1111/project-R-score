#!/usr/bin/env bun
/**
 * BarberShop ELITE Feature Flags
 * ==============================
 * Dynamic feature toggling with rollout strategies
 * 
 * Elite Features:
 * - Boolean, gradual, and user-targeted flags
 * - A/B testing support
 * - Real-time updates
 * - Analytics integration
 */

import { nanoseconds } from 'bun';

// ═══════════════════════════════════════════════════════════════════════════════
// FLAG TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type FlagType = 'boolean' | 'gradual' | 'user' | 'time';

interface BaseFlag {
  key: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface BooleanFlag extends BaseFlag {
  type: 'boolean';
  enabled: boolean;
}

interface GradualFlag extends BaseFlag {
  type: 'gradual';
  percentage: number; // 0-100
  salt?: string;
}

interface UserFlag extends BaseFlag {
  type: 'user';
  userIds: string[];
  groups?: string[];
}

interface TimeFlag extends BaseFlag {
  type: 'time';
  startTime: Date;
  endTime?: Date;
}

type FeatureFlag = BooleanFlag | GradualFlag | UserFlag | TimeFlag;

interface FlagContext {
  userId?: string;
  userGroup?: string;
  timestamp?: Date;
  attributes?: Record<string, any>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ELITE FEATURE FLAGS
// ═══════════════════════════════════════════════════════════════════════════════

export class EliteFeatureFlags {
  private flags = new Map<string, FeatureFlag>();
  private listeners = new Set<(flag: FeatureFlag) => void>();
  private analytics: Array<{ key: string; enabled: boolean; context: FlagContext; timestamp: number }> = [];
  
  /**
   * Create boolean flag
   */
  createBoolean(key: string, enabled: boolean, options: Partial<Omit<BooleanFlag, 'key' | 'type' | 'enabled'>> = {}): BooleanFlag {
    const flag: BooleanFlag = {
      key,
      type: 'boolean',
      enabled,
      name: options.name || key,
      description: options.description,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.flags.set(key, flag);
    this.notifyListeners(flag);
    return flag;
  }
  
  /**
   * Create gradual rollout flag
   */
  createGradual(key: string, percentage: number, options: Partial<Omit<GradualFlag, 'key' | 'type' | 'percentage'>> = {}): GradualFlag {
    const flag: GradualFlag = {
      key,
      type: 'gradual',
      percentage: Math.max(0, Math.min(100, percentage)),
      name: options.name || key,
      description: options.description,
      salt: options.salt || Math.random().toString(36).slice(2, 10),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.flags.set(key, flag);
    this.notifyListeners(flag);
    return flag;
  }
  
  /**
   * Create user-targeted flag
   */
  createUserTargeted(key: string, userIds: string[], options: Partial<Omit<UserFlag, 'key' | 'type' | 'userIds'>> = {}): UserFlag {
    const flag: UserFlag = {
      key,
      type: 'user',
      userIds,
      groups: options.groups || [],
      name: options.name || key,
      description: options.description,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.flags.set(key, flag);
    this.notifyListeners(flag);
    return flag;
  }
  
  /**
   * Create time-based flag
   */
  createTimeBased(key: string, startTime: Date, endTime?: Date, options: Partial<Omit<TimeFlag, 'key' | 'type' | 'startTime' | 'endTime'>> = {}): TimeFlag {
    const flag: TimeFlag = {
      key,
      type: 'time',
      startTime,
      endTime,
      name: options.name || key,
      description: options.description,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.flags.set(key, flag);
    this.notifyListeners(flag);
    return flag;
  }
  
  /**
   * Check if flag is enabled
   */
  isEnabled(key: string, context: FlagContext = {}): boolean {
    const flag = this.flags.get(key);
    if (!flag) return false;
    
    const startNs = nanoseconds();
    let result = false;
    
    switch (flag.type) {
      case 'boolean':
        result = flag.enabled;
        break;
      
      case 'gradual':
        result = this.checkGradual(flag, context);
        break;
      
      case 'user':
        result = this.checkUser(flag, context);
        break;
      
      case 'time':
        result = this.checkTime(flag, context);
        break;
    }
    
    // Record analytics
    this.analytics.push({
      key,
      enabled: result,
      context,
      timestamp: Date.now(),
    });
    
    // Keep only last 1000 entries
    if (this.analytics.length > 1000) {
      this.analytics = this.analytics.slice(-1000);
    }
    
    return result;
  }
  
  private checkGradual(flag: GradualFlag, context: FlagContext): boolean {
    if (!context.userId) {
      // Random if no user ID
      return Math.random() * 100 < flag.percentage;
    }
    
    // Consistent hash based on userId
    const hash = this.hashString(`${flag.salt}:${context.userId}`);
    return (hash % 100) < flag.percentage;
  }
  
  private checkUser(flag: UserFlag, context: FlagContext): boolean {
    if (context.userId && flag.userIds.includes(context.userId)) {
      return true;
    }
    if (context.userGroup && flag.groups?.includes(context.userGroup)) {
      return true;
    }
    return false;
  }
  
  private checkTime(flag: TimeFlag, context: FlagContext): boolean {
    const now = context.timestamp || new Date();
    if (now < flag.startTime) return false;
    if (flag.endTime && now > flag.endTime) return false;
    return true;
  }
  
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
  
  /**
   * Update flag
   */
  update(key: string, updates: Partial<FeatureFlag>): void {
    const flag = this.flags.get(key);
    if (!flag) throw new Error(`Flag "${key}" not found`);
    
    Object.assign(flag, updates, { updatedAt: new Date() });
    this.flags.set(key, flag);
    this.notifyListeners(flag);
  }
  
  /**
   * Delete flag
   */
  delete(key: string): boolean {
    return this.flags.delete(key);
  }
  
  /**
   * Get flag details
   */
  get(key: string): FeatureFlag | undefined {
    return this.flags.get(key);
  }
  
  /**
   * List all flags
   */
  list(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }
  
  /**
   * Subscribe to flag changes
   */
  onChange(fn: (flag: FeatureFlag) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  
  private notifyListeners(flag: FeatureFlag): void {
    for (const fn of this.listeners) {
      fn(flag);
    }
  }
  
  /**
   * Get analytics
   */
  getAnalytics(): { key: string; checks: number; enabled: number; disabled: number }[] {
    const stats = new Map<string, { checks: number; enabled: number; disabled: number }>();
    
    for (const entry of this.analytics) {
      const current = stats.get(entry.key) || { checks: 0, enabled: 0, disabled: 0 };
      current.checks++;
      if (entry.enabled) current.enabled++;
      else current.disabled++;
      stats.set(entry.key, current);
    }
    
    return Array.from(stats.entries()).map(([key, stat]) => ({ key, ...stat }));
  }
  
  /**
   * Export flags as JSON
   */
  export(): string {
    return JSON.stringify(Array.from(this.flags.entries()), null, 2);
  }
  
  /**
   * Import flags from JSON
   */
  import(json: string): void {
    const data = JSON.parse(json);
    for (const [key, flag] of data) {
      this.flags.set(key, flag);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// A/B TESTING
// ═══════════════════════════════════════════════════════════════════════════════

export class EliteABTesting {
  private experiments = new Map<string, { variants: string[]; weights: number[] }>();
  
  createExperiment(name: string, variants: string[], weights?: number[]): void {
    const normalizedWeights = weights || variants.map(() => 1 / variants.length);
    this.experiments.set(name, { variants, weights: normalizedWeights });
  }
  
  getVariant(experiment: string, userId: string): string | null {
    const exp = this.experiments.get(experiment);
    if (!exp) return null;
    
    // Consistent hash
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash) + userId.charCodeAt(i);
      hash = hash & hash;
    }
    hash = Math.abs(hash) % 100;
    
    // Select variant based on weights
    let cumulative = 0;
    for (let i = 0; i < exp.variants.length; i++) {
      cumulative += exp.weights[i] * 100;
      if (hash < cumulative) {
        return exp.variants[i];
      }
    }
    
    return exp.variants[exp.variants.length - 1];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════════════════════════════════════

export const featureFlags = new EliteFeatureFlags();
export const abTesting = new EliteABTesting();

// ═══════════════════════════════════════════════════════════════════════════════
// DEMO
// ═══════════════════════════════════════════════════════════════════════════════

if (import.meta.main) {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║  🎛️  ELITE FEATURE FLAGS                                         ║
╠══════════════════════════════════════════════════════════════════╣
║  Boolean • Gradual • User-Targeted • Time-Based • A/B Testing   ║
╚══════════════════════════════════════════════════════════════════╝
`);
  
  const flags = new EliteFeatureFlags();
  
  // Boolean flag
  console.log('1. Boolean Flags\n');
  flags.createBoolean('new-dashboard', true, { name: 'New Dashboard UI' });
  console.log(`   new-dashboard: ${flags.isEnabled('new-dashboard')}`);
  
  // Gradual rollout
  console.log('\n2. Gradual Rollout (25%)\n');
  flags.createGradual('beta-feature', 25, { name: 'Beta Feature', salt: 'abc123' });
  
  let enabledCount = 0;
  for (let i = 0; i < 100; i++) {
    if (flags.isEnabled('beta-feature', { userId: `user-${i}` })) {
      enabledCount++;
    }
  }
  console.log(`   Enabled for ${enabledCount}/100 users (${enabledCount}%)`);
  
  // User-targeted
  console.log('\n3. User-Targeted Flags\n');
  flags.createUserTargeted('vip-feature', ['user-1', 'user-2'], {
    groups: ['admin'],
    name: 'VIP Feature',
  });
  
  console.log(`   user-1: ${flags.isEnabled('vip-feature', { userId: 'user-1' })}`);
  console.log(`   user-99: ${flags.isEnabled('vip-feature', { userId: 'user-99' })}`);
  console.log(`   admin: ${flags.isEnabled('vip-feature', { userGroup: 'admin' })}`);
  
  // Time-based
  console.log('\n4. Time-Based Flags\n');
  const startTime = new Date(Date.now() - 1000); // Started 1 second ago
  const endTime = new Date(Date.now() + 60000); // Ends in 1 minute
  
  flags.createTimeBased('limited-time', startTime, endTime, { name: 'Limited Time Offer' });
  console.log(`   Currently active: ${flags.isEnabled('limited-time')}`);
  
  // A/B Testing
  console.log('\n5. A/B Testing\n');
  const ab = new EliteABTesting();
  ab.createExperiment('button-color', ['red', 'blue', 'green'], [0.5, 0.3, 0.2]);
  
  const distribution = new Map<string, number>();
  for (let i = 0; i < 1000; i++) {
    const variant = ab.getVariant('button-color', `user-${i}`);
    if (variant) {
      distribution.set(variant, (distribution.get(variant) || 0) + 1);
    }
  }
  
  console.log('   Distribution:');
  for (const [variant, count] of distribution) {
    console.log(`     ${variant}: ${count} (${(count / 10).toFixed(1)}%)`);
  }
  
  // Analytics
  console.log('\n6. Analytics\n');
  const analytics = flags.getAnalytics();
  console.log('   Flag usage:');
  for (const stat of analytics) {
    console.log(`     ${stat.key}: ${stat.checks} checks, ${stat.enabled} enabled`);
  }
  
  console.log('\n✅ Feature Flags demo complete!');
  console.log('\nUsage:');
  console.log('   flags.createBoolean("feature", true);');
  console.log('   flags.createGradual("rollout", 10);');
  console.log('   if (flags.isEnabled("feature", { userId })) { ... }');
}

export { EliteFeatureFlags as default };
