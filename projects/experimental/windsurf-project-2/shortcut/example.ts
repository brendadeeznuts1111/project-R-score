import { ShortcutRegistry } from './src/core/registry.ts';
import type { ShortcutConfig, ShortcutProfile } from './src/types.ts';

// Example usage of the enhanced ShortcutRegistry
async function demonstrateRegistry() {
  console.log('🚀 Starting Enhanced ShortcutRegistry Demo...\n');

  // Initialize the registry
  const registry = new ShortcutRegistry();

  try {
    // 1. Create some example shortcuts
    console.log('📝 Registering shortcuts...');
    
    const shortcuts: ShortcutConfig[] = [
      {
        id: 'save_file',
        action: 'file.save',
        description: 'Save the current file',
        category: 'general',
        default: {
          primary: 'Ctrl + S',
          macOS: 'Cmd + S'
        },
        enabled: true,
        scope: 'global'
      },
      {
        id: 'open_settings',
        action: 'app.openSettings',
        description: 'Open application settings',
        category: 'ui',
        default: {
          primary: 'Ctrl + ,',
          macOS: 'Cmd + ,'
        },
        enabled: true,
        scope: 'global'
      },
      {
        id: 'toggle_terminal',
        action: 'terminal.toggle',
        description: 'Toggle terminal panel',
        category: 'developer',
        default: {
          primary: 'Ctrl + `'
        },
        enabled: true,
        scope: 'panel'
      }
    ];

    // Register shortcuts individually
    for (const shortcut of shortcuts) {
      registry.register(shortcut);
    }

    console.log(`✅ Registered ${shortcuts.length} shortcuts\n`);

    // 2. Create a custom profile
    console.log('👤 Creating custom profile...');
    const customProfile = registry.createProfile(
      'My Custom Setup',
      'Personalized shortcut configuration'
    );
    console.log(`✅ Created profile: ${customProfile.name}\n`);

    // 3. Set up profile overrides
    console.log('⚙️ Setting up profile overrides...');
    registry.setOverride('save_file', 'Ctrl + Alt + S', customProfile.id);
    registry.setActiveProfile(customProfile.id);
    console.log(`✅ Active profile: ${registry.getActiveProfile()}\n`);

    // 4. Demonstrate search functionality
    console.log('🔍 Searching shortcuts...');
    const searchResults = registry.searchShortcuts('save', { category: 'general' });
    console.log(`Found ${searchResults.length} shortcuts matching 'save':`);
    searchResults.forEach(s => console.log(`  - ${s.id}: ${s.description}`));
    console.log();

    // 5. Get statistics
    console.log('📊 Registry Statistics:');
    const stats = registry.getStatistics();
    console.log(`  Shortcuts: ${stats.shortcuts.total} total, ${stats.shortcuts.enabled} enabled`);
    console.log(`  Profiles: ${stats.profiles.total} total, active: ${stats.profiles.active}`);
    console.log(`  Conflicts: ${stats.conflicts.count} detected`);
    console.log();

    // 6. Check system health
    console.log('🏥 Health Check:');
    const health = await registry.healthCheck();
    console.log(`  Overall Status: ${health.status}`);
    console.log(`  Database: ${health.checks.database.status}`);
    console.log(`  Memory: ${health.checks.memory.status}`);
    console.log(`  Performance: ${health.checks.performance.status}`);
    console.log();

    // 7. Get performance metrics
    console.log('⚡ Performance Metrics:');
    const metrics = registry.getMetrics();
    console.log(`  Uptime: ${Math.round(metrics.uptime / 1000)}s`);
    console.log(`  Cache Size: ${metrics.cache.effectiveKeys} effective keys`);
    console.log();

    // 8. Demonstrate batch operations
    console.log('📦 Batch Operations Demo:');
    
    const batchShortcuts: ShortcutConfig[] = [
      {
        id: 'copy',
        action: 'edit.copy',
        description: 'Copy selection',
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
      }
    ];

    await registry.registerBatch(batchShortcuts);
    console.log(`✅ Batch registered ${batchShortcuts.length} shortcuts`);
    console.log();

    // 9. Export configuration
    console.log('💾 Exporting configuration...');
    const exportedData = await registry.exportAllData();
    console.log(`Exported ${exportedData.shortcuts.length} shortcuts and ${exportedData.profiles.length} profiles`);
    console.log();

    // 10. Demonstrate triggering shortcuts
    console.log('⚡ Triggering shortcuts...');
    const triggerResult = registry.trigger('save_file', { scope: 'editor' });
    console.log(`Trigger result: ${triggerResult ? 'Success' : 'Failed'}`);
    console.log();

    // 11. Show debug info
    console.log('🐛 Debug Information:');
    const debugInfo = registry.debugInfo();
    console.log(`  Version: ${debugInfo.version}`);
    console.log(`  Platform: ${debugInfo.platform}`);
    console.log(`  Total Triggers: ${debugInfo.metricsStats.triggers}`);
    console.log();

    console.log('🎉 Demo completed successfully!');

  } catch (error) {
    console.error('❌ Error during demo:', error);
    
    if (error instanceof Error && error.name === 'ValidationError') {
      console.error('Validation Details:', (error as any).details);
    }
  } finally {
    // Clean up
    console.log('🧹 Cleaning up...');
    await registry.dispose();
    console.log('✅ Registry disposed');
  }
}

// Event listeners for monitoring
function setupEventListeners(registry: ShortcutRegistry) {
  registry.on('shortcut:registered', (config) => {
    console.log(`📝 Registered: ${config.id} - ${config.description}`);
  });

  registry.on('profile:changed', (data) => {
    console.log(`👤 Profile changed: ${data.previous} → ${data.current}`);
  });

  registry.on('conflict', (conflict) => {
    console.warn(`⚠️ Conflict detected: ${conflict.key} for ${conflict.actions.join(', ')}`);
  });

  registry.on('metrics:flushed', (metrics) => {
    console.log(`📊 Metrics flushed: ${Object.keys(metrics.triggers).length} shortcuts tracked`);
  });

  registry.on('error', (error) => {
    console.error(`❌ Registry error in ${error.operation}: ${error.error}`);
  });
}

// Run the demonstration - use a universal approach
// This will work in Node.js, Bun, and browsers
demonstrateRegistry().catch(console.error);

export { demonstrateRegistry };
