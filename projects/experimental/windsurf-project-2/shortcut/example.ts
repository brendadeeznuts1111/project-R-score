import { ShortcutRegistry } from './src/core/registry.ts';
import type { ShortcutConfig, ShortcutProfile } from './src/types.ts';

// Example usage of the enhanced ShortcutRegistry
async function demonstrateRegistry() {
  console.info('🚀 Starting Enhanced ShortcutRegistry Demo...\n');

  // Initialize the registry
  const registry = new ShortcutRegistry();

  try {
    // 1. Create some example shortcuts
    console.info('📝 Registering shortcuts...');
    
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

    console.info(`✅ Registered ${shortcuts.length} shortcuts\n`);

    // 2. Create a custom profile
    console.info('👤 Creating custom profile...');
    const customProfile = registry.createProfile(
      'My Custom Setup',
      'Personalized shortcut configuration'
    );
    console.info(`✅ Created profile: ${customProfile.name}\n`);

    // 3. Set up profile overrides
    console.info('⚙️ Setting up profile overrides...');
    registry.setOverride('save_file', 'Ctrl + Alt + S', customProfile.id);
    registry.setActiveProfile(customProfile.id);
    console.info(`✅ Active profile: ${registry.getActiveProfile()}\n`);

    // 4. Demonstrate search functionality
    console.info('🔍 Searching shortcuts...');
    const searchResults = registry.searchShortcuts('save', { category: 'general' });
    console.info(`Found ${searchResults.length} shortcuts matching 'save':`);
    searchResults.forEach(s => console.info(`  - ${s.id}: ${s.description}`));
    console.info();

    // 5. Get statistics
    console.info('📊 Registry Statistics:');
    const stats = registry.getStatistics();
    console.info(`  Shortcuts: ${stats.shortcuts.total} total, ${stats.shortcuts.enabled} enabled`);
    console.info(`  Profiles: ${stats.profiles.total} total, active: ${stats.profiles.active}`);
    console.info(`  Conflicts: ${stats.conflicts.count} detected`);
    console.info();

    // 6. Check system health
    console.info('🏥 Health Check:');
    const health = await registry.healthCheck();
    console.info(`  Overall Status: ${health.status}`);
    console.info(`  Database: ${health.checks.database.status}`);
    console.info(`  Memory: ${health.checks.memory.status}`);
    console.info(`  Performance: ${health.checks.performance.status}`);
    console.info();

    // 7. Get performance metrics
    console.info('⚡ Performance Metrics:');
    const metrics = registry.getMetrics();
    console.info(`  Uptime: ${Math.round(metrics.uptime / 1000)}s`);
    console.info(`  Cache Size: ${metrics.cache.effectiveKeys} effective keys`);
    console.info();

    // 8. Demonstrate batch operations
    console.info('📦 Batch Operations Demo:');
    
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
    console.info(`✅ Batch registered ${batchShortcuts.length} shortcuts`);
    console.info();

    // 9. Export configuration
    console.info('💾 Exporting configuration...');
    const exportedData = await registry.exportAllData();
    console.info(`Exported ${exportedData.shortcuts.length} shortcuts and ${exportedData.profiles.length} profiles`);
    console.info();

    // 10. Demonstrate triggering shortcuts
    console.info('⚡ Triggering shortcuts...');
    const triggerResult = registry.trigger('save_file', { scope: 'editor' });
    console.info(`Trigger result: ${triggerResult ? 'Success' : 'Failed'}`);
    console.info();

    // 11. Show debug info
    console.info('🐛 Debug Information:');
    const debugInfo = registry.debugInfo();
    console.info(`  Version: ${debugInfo.version}`);
    console.info(`  Platform: ${debugInfo.platform}`);
    console.info(`  Total Triggers: ${debugInfo.metricsStats.triggers}`);
    console.info();

    console.info('🎉 Demo completed successfully!');

  } catch (error) {
    console.error('❌ Error during demo:', error);
    
    if (error instanceof Error && error.name === 'ValidationError') {
      console.error('Validation Details:', (error as any).details);
    }
  } finally {
    // Clean up
    console.info('🧹 Cleaning up...');
    await registry.dispose();
    console.info('✅ Registry disposed');
  }
}

// Event listeners for monitoring
function setupEventListeners(registry: ShortcutRegistry) {
  registry.on('shortcut:registered', (config) => {
    console.info(`📝 Registered: ${config.id} - ${config.description}`);
  });

  registry.on('profile:changed', (data) => {
    console.info(`👤 Profile changed: ${data.previous} → ${data.current}`);
  });

  registry.on('conflict', (conflict) => {
    console.warn(`⚠️ Conflict detected: ${conflict.key} for ${conflict.actions.join(', ')}`);
  });

  registry.on('metrics:flushed', (metrics) => {
    console.info(`📊 Metrics flushed: ${Object.keys(metrics.triggers).length} shortcuts tracked`);
  });

  registry.on('error', (error) => {
    console.error(`❌ Registry error in ${error.operation}: ${error.error}`);
  });
}

// Run the demonstration - use a universal approach
// This will work in Node.js, Bun, and browsers
demonstrateRegistry().catch(console.error);

export { demonstrateRegistry };
