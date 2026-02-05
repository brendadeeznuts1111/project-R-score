// Simple Node.js demonstration of the enhanced ShortcutRegistry
// Run with: node demo.js

const fs = require('fs');
const path = require('path');

// Mock the enhanced ShortcutRegistry for demonstration
class MockShortcutRegistry {
  constructor() {
    this.shortcuts = new Map();
    this.profiles = new Map();
    this.activeProfile = 'default';
    this.metrics = {
      triggers: new Map(),
      conflicts: 0,
      errors: 0,
      performance: new Map(),
      usage: new Map()
    };
    this.cache = new Map();
    this.startTime = Date.now();
  }

  register(config) {
    // Basic validation
    if (!config.id || !config.action || !config.description) {
      throw new Error('Shortcut must have id, action, and description');
    }
    
    console.log(`📝 Registering shortcut: ${config.id} - ${config.description}`);
    this.shortcuts.set(config.id, config);
    console.log(`✅ Registered: ${config.id}`);
  }

  createProfile(name, description) {
    const id = `profile_${Date.now()}`;
    const profile = { id, name, description, overrides: {} };
    this.profiles.set(id, profile);
    console.log(`👤 Created profile: ${name}`);
    return profile;
  }

  setActiveProfile(profileId) {
    if (this.profiles.has(profileId)) {
      this.activeProfile = profileId;
      console.log(`🔄 Active profile set to: ${profileId}`);
    }
  }

  searchShortcuts(query) {
    const results = [];
    const lowerQuery = query.toLowerCase();
    
    for (const shortcut of this.shortcuts.values()) {
      if (
        shortcut.id.toLowerCase().includes(lowerQuery) ||
        shortcut.description.toLowerCase().includes(lowerQuery)
      ) {
        results.push(shortcut);
      }
    }
    
    return results;
  }

  trigger(shortcutId, context = {}) {
    const shortcut = this.shortcuts.get(shortcutId);
    if (!shortcut) {
      console.log(`❌ Shortcut not found: ${shortcutId}`);
      return false;
    }

    // Record metrics
    const current = this.metrics.triggers.get(shortcutId) || 0;
    this.metrics.triggers.set(shortcutId, current + 1);
    
    console.log(`⚡ Triggered: ${shortcutId} (${shortcut.description})`);
    return true;
  }

  getShortcutCount() {
    return this.shortcuts.size;
  }

  getStatistics() {
    const shortcuts = Array.from(this.shortcuts.values());
    const enabledCount = shortcuts.filter(s => s.enabled !== false).length;
    
    return {
      shortcuts: {
        total: shortcuts.length,
        enabled: enabledCount,
        disabled: shortcuts.length - enabledCount
      },
      profiles: {
        total: this.profiles.size,
        active: this.activeProfile
      },
      usage: {
        totalTriggers: Array.from(this.metrics.triggers.values()).reduce((sum, count) => sum + count, 0)
      }
    };
  }

  getMetrics() {
    return {
      uptime: Date.now() - this.startTime,
      triggers: Object.fromEntries(this.metrics.triggers),
      conflicts: this.metrics.conflicts,
      errors: this.metrics.errors,
      cache: {
        size: this.cache.size
      }
    };
  }

  async healthCheck() {
    return {
      status: 'healthy',
      checks: {
        memory: { status: 'healthy' },
        performance: { status: 'healthy' },
        shortcuts: { status: 'healthy', count: this.shortcuts.size }
      }
    };
  }

  async exportAllData() {
    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      shortcuts: Array.from(this.shortcuts.values()),
      profiles: Array.from(this.profiles.values()),
      metrics: this.getMetrics()
    };
  }

  debugInfo() {
    return {
      version: '1.0.0-enhanced',
      platform: process.platform,
      activeProfile: this.activeProfile,
      shortcuts: this.shortcuts.size,
      profiles: this.profiles.size,
      uptime: Date.now() - this.startTime
    };
  }

  dispose() {
    console.log('🧹 Cleaning up registry...');
    this.shortcuts.clear();
    this.profiles.clear();
    this.metrics.triggers.clear();
    this.cache.clear();
    console.log('✅ Registry disposed');
  }
}

// Demonstration function
async function demonstrateRegistry() {
  console.log('🚀 Starting Enhanced ShortcutRegistry Demo (Node.js Version)...\n');

  const registry = new MockShortcutRegistry();

  try {
    // 1. Register shortcuts
    console.log('📝 Registering shortcuts...');
    
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

    // 2. Create profile
    console.log('👤 Creating custom profile...');
    const customProfile = registry.createProfile('My Custom Setup', 'Personalized shortcut configuration');
    registry.setActiveProfile(customProfile.id);
    console.log();

    // 3. Search functionality
    console.log('🔍 Searching shortcuts...');
    const searchResults = registry.searchShortcuts('save');
    console.log(`Found ${searchResults.length} shortcuts matching 'save':`);
    searchResults.forEach(s => console.log(`  - ${s.id}: ${s.description}`));
    console.log();

    // 4. Statistics
    console.log('📊 Registry Statistics:');
    const stats = registry.getStatistics();
    console.log(`  Shortcuts: ${stats.shortcuts.total} total, ${stats.shortcuts.enabled} enabled`);
    console.log(`  Profiles: ${stats.profiles.total} total, active: ${stats.profiles.active}`);
    console.log();

    // 5. Health check
    console.log('🏥 Health Check:');
    const health = await registry.healthCheck();
    console.log(`  Overall Status: ${health.status}`);
    Object.entries(health.checks).forEach(([name, check]) => {
      console.log(`  ${name}: ${check.status}`);
    });
    console.log();

    // 6. Metrics
    console.log('⚡ Performance Metrics:');
    const metrics = registry.getMetrics();
    console.log(`  Uptime: ${Math.round(metrics.uptime / 1000)}s`);
    console.log(`  Total Triggers: metrics.usage.totalTriggers}`);
    console.log(`  Cache Size: ${metrics.cache.size}`);
    console.log();

    // 7. Trigger shortcuts
    console.log('⚡ Triggering shortcuts...');
    registry.trigger('save_file', { scope: 'editor' });
    registry.trigger('open_settings');
    console.log();

    // 8. Export data
    console.log('💾 Exporting configuration...');
    const exportedData = await registry.exportAllData();
    console.log(`Exported ${exportedData.shortcuts.length} shortcuts and ${exportedData.profiles.length} profiles`);
    console.log();

    // 9. Debug info
    console.log('🐛 Debug Information:');
    const debugInfo = registry.debugInfo();
    console.log(`  Version: ${debugInfo.version}`);
    console.log(`  Platform: ${debugInfo.platform}`);
    console.log(`  Shortcuts: ${debugInfo.shortcuts}`);
    console.log(`  Profiles: ${debugInfo.profiles}`);
    console.log();

    console.log('🎉 Demo completed successfully!');

  } catch (error) {
    console.error('❌ Error during demo:', error.message);
  } finally {
    // Clean up
    registry.dispose();
  }
}

// Run the demonstration
if (require.main === module) {
  demonstrateRegistry().catch(console.error);
}

module.exports = { MockShortcutRegistry, demonstrateRegistry };
