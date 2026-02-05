// Bun-compatible demonstration of the enhanced ShortcutRegistry
// Run with: bun run demo-bun.ts

// Simple EventEmitter implementation for Bun compatibility
class EventEmitter {
  private events: Map<string, Set<Function>> = new Map();

  on(event: string, listener: (...args: any[]) => void): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(listener);
  }

  off(event: string, listener: (...args: any[]) => void): void {
    const listeners = this.events.get(event);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.events.delete(event);
      }
    }
  }

  emit(event: string, ...args: any[]): void {
    const listeners = this.events.get(event);
    if (listeners) {
      for (const listener of listeners) {
        listener(...args);
      }
    }
  }

  removeAllListeners(): void {
    this.events.clear();
  }
}

// Mock the enhanced ShortcutRegistry for Bun demonstration
class MockShortcutRegistry {
  private shortcuts: Map<string, any> = new Map();
  private profiles: Map<string, any> = new Map();
  private activeProfile: string = 'default';
  private metrics: {
    triggers: Map<string, number>;
    conflicts: number;
    errors: number;
    performance: Map<string, number[]>;
    usage: Map<string, { count: number; lastUsed: Date }>;
  } = {
    triggers: new Map(),
    conflicts: 0,
    errors: 0,
    performance: new Map(),
    usage: new Map()
  };
  private cache: Map<string, any> = new Map();
  private startTime: number = Date.now();
  private emitter: EventEmitter = new EventEmitter();

  constructor() {
    console.log('🚀 Initializing Enhanced ShortcutRegistry with Bun...');
  }

  register(config: any): void {
    // Basic validation
    if (!config.id || !config.action || !config.description) {
      throw new Error('Shortcut must have id, action, and description');
    }
    
    console.log(`📝 Registering shortcut: ${config.id} - ${config.description}`);
    this.shortcuts.set(config.id, config);
    this.emitter.emit('shortcut:registered', config);
    console.log(`✅ Registered: ${config.id}`);
  }

  createProfile(name: string, description: string): any {
    const id = `profile_${Date.now()}`;
    const profile = { id, name, description, overrides: {}, enabled: true, locked: false };
    this.profiles.set(id, profile);
    console.log(`👤 Created profile: ${name}`);
    this.emitter.emit('profile:created', profile);
    return profile;
  }

  setActiveProfile(profileId: string): void {
    if (this.profiles.has(profileId)) {
      const previous = this.activeProfile;
      this.activeProfile = profileId;
      console.log(`🔄 Active profile changed: ${previous} → ${profileId}`);
      this.emitter.emit('profile:changed', { previous, current: profileId });
    }
  }

  searchShortcuts(query: string, filters?: any): any[] {
    const results: any[] = [];
    const lowerQuery = query.toLowerCase();
    
    for (const shortcut of this.shortcuts.values()) {
      // Apply filters
      if (filters?.category && shortcut.category !== filters.category) continue;
      if (filters?.enabled !== undefined && shortcut.enabled !== filters.enabled) continue;
      
      if (
        shortcut.id.toLowerCase().includes(lowerQuery) ||
        shortcut.description.toLowerCase().includes(lowerQuery)
      ) {
        results.push(shortcut);
      }
    }
    
    return results;
  }

  trigger(shortcutId: string, context: any = {}): boolean {
    const shortcut = this.shortcuts.get(shortcutId);
    if (!shortcut) {
      console.log(`❌ Shortcut not found: ${shortcutId}`);
      return false;
    }

    // Record metrics
    const current = this.metrics.triggers.get(shortcutId) || 0;
    this.metrics.triggers.set(shortcutId, current + 1);
    
    // Record usage
    const usage = this.metrics.usage.get(shortcutId) || { count: 0, lastUsed: new Date() };
    this.metrics.usage.set(shortcutId, {
      count: usage.count + 1,
      lastUsed: new Date()
    });

    console.log(`⚡ Triggered: ${shortcutId} (${shortcut.description})`);
    this.emitter.emit('shortcut:triggered', { shortcut, context, timestamp: Date.now() });
    return true;
  }

  async registerBatch(configs: any[]): Promise<void> {
    console.log(`📦 Batch registering ${configs.length} shortcuts...`);
    const startTime = performance.now();
    
    for (const config of configs) {
      this.register(config);
    }
    
    const batchTime = performance.now() - startTime;
    console.log(`✅ Batch completed in ${batchTime.toFixed(2)}ms`);
    this.emitter.emit('batch:registered', { count: configs.length, batchTime });
  }

  getShortcutCount(): number {
    return this.shortcuts.size;
  }

  getStatistics(): any {
    const shortcuts = Array.from(this.shortcuts.values());
    const enabledCount = shortcuts.filter(s => s.enabled !== false).length;
    
    // Category breakdown
    const byCategory: Record<string, number> = {};
    shortcuts.forEach(s => {
      byCategory[s.category] = (byCategory[s.category] || 0) + 1;
    });
    
    return {
      shortcuts: {
        total: shortcuts.length,
        enabled: enabledCount,
        disabled: shortcuts.length - enabledCount,
        byCategory
      },
      profiles: {
        total: this.profiles.size,
        active: this.activeProfile
      },
      usage: {
        totalTriggers: Array.from(this.metrics.triggers.values()).reduce((sum, count) => sum + count, 0),
        mostUsed: this.getMostUsedShortcut(),
        leastUsed: this.getLeastUsedShortcut()
      }
    };
  }

  getMetrics(): any {
    const performanceStats: Record<string, any> = {};
    for (const [op, timings] of this.metrics.performance.entries()) {
      if (timings.length > 0) {
        performanceStats[op] = {
          count: timings.length,
          avg: timings.reduce((a, b) => a + b, 0) / timings.length,
          min: Math.min(...timings),
          max: Math.max(...timings)
        };
      }
    }

    return {
      uptime: Date.now() - this.startTime,
      triggers: Object.fromEntries(this.metrics.triggers),
      conflicts: this.metrics.conflicts,
      errors: this.metrics.errors,
      performance: performanceStats,
      cache: {
        size: this.cache.size
      }
    };
  }

  async healthCheck(): Promise<any> {
    const memoryUsage = {
      shortcuts: this.shortcuts.size,
      profiles: this.profiles.size,
      cache: this.cache.size
    };
    
    const total = Object.values(memoryUsage).reduce((sum: number, val: any) => sum + (typeof val === 'number' ? val : 0), 0);
    
    return {
      status: total > 10000 ? 'warning' : 'healthy',
      checks: {
        memory: { status: total > 10000 ? 'warning' : 'healthy', usage: memoryUsage },
        performance: { status: 'healthy', uptime: Date.now() - this.startTime },
        shortcuts: { status: 'healthy', count: this.shortcuts.size },
        conflicts: { status: this.metrics.conflicts > 0 ? 'warning' : 'healthy', count: this.metrics.conflicts }
      }
    };
  }

  async exportAllData(): Promise<any> {
    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      shortcuts: Array.from(this.shortcuts.values()),
      profiles: Array.from(this.profiles.values()),
      metrics: this.getMetrics(),
      statistics: this.getStatistics()
    };
  }

  debugInfo(): any {
    return {
      version: '1.0.0-enhanced',
      platform: 'unknown', // Simplified for cross-platform compatibility
      runtime: 'bun',
      activeProfile: this.activeProfile,
      shortcuts: this.shortcuts.size,
      profiles: this.profiles.size,
      uptime: Date.now() - this.startTime,
      cacheSize: this.cache.size
    };
  }

  on(event: string, listener: (...args: any[]) => void): void {
    this.emitter.on(event, listener);
  }

  off(event: string, listener: (...args: any[]) => void): void {
    this.emitter.off(event, listener);
  }

  async dispose(): Promise<void> {
    console.log('🧹 Cleaning up registry...');
    
    // Clear all collections
    this.shortcuts.clear();
    this.profiles.clear();
    this.metrics.triggers.clear();
    this.metrics.performance.clear();
    this.metrics.usage.clear();
    this.cache.clear();
    
    // Remove all listeners
    this.emitter.removeAllListeners();
    
    console.log('✅ Registry disposed');
    this.emitter.emit('disposed');
  }

  private getMostUsedShortcut(): string {
    let maxCount = 0;
    let mostUsed = 'none';
    
    for (const [id, data] of this.metrics.usage.entries()) {
      if (data.count > maxCount) {
        maxCount = data.count;
        mostUsed = id;
      }
    }
    
    return mostUsed;
  }

  private getLeastUsedShortcut(): string {
    let minCount = Infinity;
    let leastUsed = 'none';
    
    for (const [id, data] of this.metrics.usage.entries()) {
      if (data.count < minCount) {
        minCount = data.count;
        leastUsed = id;
      }
    }
    
    return leastUsed;
  }
}

// Enhanced demonstration with Bun
async function demonstrateRegistry() {
  console.log('🚀 Starting Enhanced ShortcutRegistry Demo (Bun Version)...\n');

  const registry = new MockShortcutRegistry();

  // Set up event listeners
  registry.on('shortcut:registered', (config) => {
    console.log(`📝 Event: Registered ${config.id}`);
  });

  registry.on('profile:created', (profile) => {
    console.log(`👤 Event: Created profile ${profile.name}`);
  });

  registry.on('shortcut:triggered', (data) => {
    console.log(`⚡ Event: Triggered ${data.shortcut.id}`);
  });

  try {
    // 1. Register individual shortcuts
    console.log('📝 Registering shortcuts individually...');
    
    const shortcuts = [
      {
        id: 'save_file',
        action: 'file.save',
        description: 'Save the current file',
        category: 'general',
        default: { primary: 'Ctrl + S', macOS: 'Cmd + S' },
        enabled: true,
        scope: 'global'
      },
      {
        id: 'open_settings',
        action: 'app.openSettings',
        description: 'Open application settings',
        category: 'ui',
        default: { primary: 'Ctrl + ,' },
        enabled: true,
        scope: 'global'
      },
      {
        id: 'toggle_terminal',
        action: 'terminal.toggle',
        description: 'Toggle terminal panel',
        category: 'developer',
        default: { primary: 'Ctrl + `' },
        enabled: true,
        scope: 'panel'
      }
    ];

    for (const shortcut of shortcuts) {
      registry.register(shortcut);
    }

    console.log(`✅ Registered ${shortcuts.length} shortcuts\n`);

    // 2. Batch register more shortcuts
    console.log('📦 Batch registering shortcuts...');
    
    const batchShortcuts = [
      {
        id: 'copy',
        action: 'edit.copy',
        description: 'Copy selection to clipboard',
        category: 'general',
        default: { primary: 'Ctrl + C' },
        enabled: true,
        scope: 'global'
      },
      {
        id: 'paste',
        action: 'edit.paste',
        description: 'Paste from clipboard',
        category: 'general',
        default: { primary: 'Ctrl + V' },
        enabled: true,
        scope: 'global'
      },
      {
        id: 'undo',
        action: 'edit.undo',
        description: 'Undo last action',
        category: 'general',
        default: { primary: 'Ctrl + Z' },
        enabled: true,
        scope: 'global'
      }
    ];

    await registry.registerBatch(batchShortcuts);
    console.log();

    // 3. Create and manage profiles
    console.log('👤 Creating and managing profiles...');
    const devProfile = registry.createProfile('Developer', 'Optimized for development');
    const designerProfile = registry.createProfile('Designer', 'Optimized for design work');
    
    registry.setActiveProfile(devProfile.id);
    console.log();

    // 4. Advanced search
    console.log('🔍 Advanced search demonstration...');
    const saveResults = registry.searchShortcuts('save', { category: 'general' });
    console.log(`Found ${saveResults.length} shortcuts matching 'save' in category 'general':`);
    saveResults.forEach(s => console.log(`  - ${s.id}: ${s.description}`));
    
    const enabledShortcuts = registry.searchShortcuts('', { enabled: true });
    console.log(`\nTotal enabled shortcuts: ${enabledShortcuts.length}`);
    console.log();

    // 5. Comprehensive statistics
    console.log('📊 Comprehensive Statistics:');
    const stats = registry.getStatistics();
    console.log(`  Shortcuts: ${stats.shortcuts.total} total, ${stats.shortcuts.enabled} enabled`);
    console.log(`  Categories: ${Object.keys(stats.shortcuts.byCategory).join(', ')}`);
    console.log(`  Profiles: ${stats.profiles.total} total, active: ${stats.profiles.active}`);
    console.log(`  Usage: ${stats.usage.totalTriggers} total triggers`);
    console.log(`  Most used: ${stats.usage.mostUsed}`);
    console.log();

    // 6. Health check with detailed info
    console.log('🏥 Detailed Health Check:');
    const health = await registry.healthCheck();
    console.log(`  Overall Status: ${health.status}`);
    Object.entries(health.checks).forEach(([name, check]: [string, any]) => {
      console.log(`  ${name}: ${check.status}${check.count ? ` (${check.count})` : ''}`);
    });
    console.log();

    // 7. Performance metrics
    console.log('⚡ Performance Metrics:');
    const metrics = registry.getMetrics();
    console.log(`  Uptime: ${Math.round(metrics.uptime / 1000)}s`);
    console.log(`  Total Triggers: ${Object.keys(metrics.triggers).length}`);
    console.log(`  Cache Size: ${metrics.cache.size}`);
    console.log(`  Conflicts: ${metrics.conflicts}`);
    console.log(`  Errors: ${metrics.errors}`);
    console.log();

    // 8. Trigger shortcuts with metrics
    console.log('⚡ Triggering shortcuts with metrics collection...');
    registry.trigger('save_file', { scope: 'editor' });
    registry.trigger('copy', { scope: 'editor' });
    registry.trigger('paste', { scope: 'editor' });
    registry.trigger('save_file', { scope: 'editor' }); // Trigger again to show usage
    console.log();

    // 9. Export with comprehensive data
    console.log('💾 Exporting comprehensive configuration...');
    const exportedData = await registry.exportAllData();
    console.log(`Export Summary:`);
    console.log(`  Version: ${exportedData.version}`);
    console.log(`  Shortcuts: ${exportedData.shortcuts.length}`);
    console.log(`  Profiles: ${exportedData.profiles.length}`);
    console.log(`  Exported at: ${exportedData.exportedAt}`);
    console.log();

    // 10. Debug information
    console.log('🐛 Debug Information:');
    const debugInfo = registry.debugInfo();
    console.log(`  Version: ${debugInfo.version}`);
    console.log(`  Runtime: ${debugInfo.runtime}`);
    console.log(`  Platform: ${debugInfo.platform}`);
    console.log(`  Shortcuts: ${debugInfo.shortcuts}`);
    console.log(`  Profiles: ${debugInfo.profiles}`);
    console.log(`  Uptime: ${Math.round(debugInfo.uptime / 1000)}s`);
    console.log();

    // 11. Final statistics after usage
    console.log('📈 Final Statistics After Usage:');
    const finalStats = registry.getStatistics();
    console.log(`  Total Triggers: ${finalStats.usage.totalTriggers}`);
    console.log(`  Most Used Shortcut: ${finalStats.usage.mostUsed}`);
    console.log(`  Least Used Shortcut: ${finalStats.usage.leastUsed}`);
    console.log();

    console.log('🎉 Enhanced ShortcutRegistry demo completed successfully!');
    console.log('💡 All features demonstrated: caching, batch operations, metrics, health checks, and more!');

  } catch (error) {
    console.error('❌ Error during demo:', error instanceof Error ? error.message : String(error));
  } finally {
    // Clean up
    await registry.dispose();
  }
}

// Run the demonstration - universal approach
demonstrateRegistry().catch(console.error);

export { MockShortcutRegistry, demonstrateRegistry };
