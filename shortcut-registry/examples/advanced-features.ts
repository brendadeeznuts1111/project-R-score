/**
 * Example: Advanced ShortcutRegistry Features
 *
 * This example demonstrates advanced features like:
 * - Macro sequences
 * - Profile overrides
 * - Conditional shortcuts
 * - Advanced conflict resolution
 * - Backup and restore
 *
 * To run this example:
 *   bun run examples/advanced-features.ts
 */

import { ShortcutRegistry } from '../src/core/registry';

// Create registry instance
const registry = new ShortcutRegistry();

// Load from database
await registry.loadFromDatabase();

// ==================== MACRO SEQUENCES ====================
console.log('=== Macro Sequences ===');

// Create a macro that does "Save, Copy, Paste" sequence
const saveCopyPasteMacro = registry.createMacro(
  'save-copy-paste',
  [
    { action: 'file.save', delay: 100 },
    { action: 'edit.copy', delay: 200 },
    { action: 'edit.paste', delay: 100 },
  ],
  'professional'
);

console.log(`Created macro: ${saveCopyPasteMacro.name} (${saveCopyPasteMacro.sequence.length} steps)`);

// ==================== PROFILE OVERRIDES ====================
console.log('\n=== Profile Overrides ===');

// Create a "Gaming" profile with custom shortcuts
const gamingProfile = registry.createProfile(
  'Gaming Mode',
  'Shortcuts optimized for gaming',
  'professional'
);

// Override Ctrl+S to be a quick save in gaming mode
registry.setOverride('file.save', 'F6', gamingProfile.id);

console.log(`Created gaming profile with Ctrl+S → F5 override`);

// ==================== CONDITIONAL SHORTCUTS ====================
console.log('\n=== Conditional Shortcuts ===');

// Register a shortcut that only works when a file is open
registry.register({
  id: 'file.save-conditional',
  action: 'save-conditional',
  description: 'Save file (only when modified)',
  category: 'general',
  default: { primary: 'Ctrl+S', macOS: 'Cmd+S' },
  enabled: true,
  scope: 'global',
  condition: {
    type: 'function',
    code: 'return document.querySelector(".modified-file") !== null;'
  }
});

// ==================== ADVANCED CONFLICT RESOLUTION ====================
console.log('\n=== Advanced Conflict Resolution ===');

// Show current conflicts
const conflicts = registry.detectConflicts();
console.log(`Found ${conflicts.length} conflicts:`);

conflicts.forEach(conflict => {
  console.log(`  ${conflict.severity}: "${conflict.key}" → ${conflict.actions.join(', ')}`);

  // Try to auto-resolve high severity conflicts
  if (conflict.severity === 'high' && conflict.actions.length >= 2) {
    const resolved = registry.autoResolveConflict(
      conflict.actions[0],
      conflict.key,
      conflict.actions
    );
    console.log(`    Auto-resolved: ${resolved ? '✅' : '❌'}`);
  }
});

// ==================== BACKUP AND RESTORE ====================
console.log('\n=== Backup and Restore ===');

try {
  // Save current state to database
  await registry.saveToDatabase();
  console.log(`✅ Database state saved`);

  // Reload from database
  await registry.loadFromDatabase();
  console.log(`✅ Database state reloaded`);

} catch (error) {
  console.log(`❌ Database operation failed: ${error}`);
}

// ==================== USAGE ANALYTICS ====================
console.log('\n=== Usage Analytics ===');

// Get detailed usage stats
const detailedStats = registry.getUsageStatistics(30);
console.log('Top 5 shortcuts by usage:');
detailedStats.slice(0, 5).forEach((stat, index) => {
  console.log(`  ${index + 1}. ${stat.description}: ${stat.usageCount || 0} uses`);
});

// Get usage statistics for all shortcuts
const allStats = registry.getUsageStatistics(30);
console.log('\nAll shortcuts usage:');
allStats.slice(0, 5).forEach(stat => {
  console.log(`  ${stat.description}: ${stat.usageCount || 0} uses`);
});

// ==================== PROFILE COMPARISON ====================
console.log('\n=== Profile Comparison ===');

const profiles = registry.getAllProfiles();
if (profiles.length >= 2) {
  const profile1 = profiles[0];
  const profile2 = profiles[1];

  console.log(`Comparing "${profile1.name}" vs "${profile2.name}":`);

  // Get shortcuts for each profile
  const shortcuts1 = registry.getShortcutsForProfile(profile1.id);
  const shortcuts2 = registry.getShortcutsForProfile(profile2.id);

  console.log(`  ${profile1.name}: ${shortcuts1.length} shortcuts`);
  console.log(`  ${profile2.name}: ${shortcuts2.length} shortcuts`);

  // Find differences
  const diff = shortcuts1.filter(s1 =>
    !shortcuts2.some(s2 => s2.id === s1.id)
  );

  if (diff.length > 0) {
    console.log(`  Differences: ${diff.length} shortcuts unique to ${profile1.name}`);
  }
}

// ==================== PERFORMANCE MONITORING ====================
console.log('\n=== Performance Monitoring ===');

// Test shortcut triggering performance
const startTime = performance.now();

for (let i = 0; i < 100; i++) {
  registry.trigger('file.save');
  registry.trigger('edit.copy');
}

const endTime = performance.now();
const avgTime = (endTime - startTime) / 200;

console.log(`Performance test: ${avgTime.toFixed(3)}ms per shortcut trigger`);

// ==================== CLEANUP ====================
console.log('\n=== Cleanup ===');

// Validate registry has loaded shortcuts
const shortcuts = registry.getAllShortcuts();
console.log(`Registry contains ${shortcuts.length} shortcuts`);

// Check if registry is properly initialized
const activeProfile = registry.getActiveProfile();
console.log(`Active profile: ${activeProfile?.name || 'None'}`);

console.log('\n🎉 Advanced Features Demo Complete!');
console.log('Your ShortcutRegistry supports macros, profiles, analytics, and more!');