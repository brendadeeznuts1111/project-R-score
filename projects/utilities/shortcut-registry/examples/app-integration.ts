/**
 * Example: Integrating ShortcutRegistry into a Real Application
 *
 * This example shows how to integrate the ShortcutRegistry into
 * a desktop application with keyboard event handling, UI updates,
 * and macro execution.
 *
 * To run this example:
 *   bun run examples/app-integration.ts
 */

import { ShortcutRegistry } from '../src/core/registry';

// Create registry instance
const registry = new ShortcutRegistry();

// Load shortcuts from database
await registry.loadFromDatabase();

// Get current shortcuts and display them
console.log('=== Loaded Shortcuts ===');
const shortcuts = registry.getAllShortcuts();
shortcuts.forEach(shortcut => {
  console.log(`${shortcut.id}: ${shortcut.description} (${shortcut.default.primary})`);
});

// Set up event listeners for shortcuts
registry.on('file.save', () => {
  console.log('💾 Save action triggered!');
  // In a real app, this would save the current file
});

registry.on('file.new', () => {
  console.log('📄 New file action triggered!');
  // In a real app, this would create a new file
});

registry.on('edit.copy', () => {
  console.log('📋 Copy action triggered!');
  // In a real app, this would copy selected text
});

registry.on('edit.paste', () => {
  console.log('📄 Paste action triggered!');
  // In a real app, this would paste from clipboard
});

// Simulate keyboard events (in a real app, this would come from DOM events)
function simulateKeyPress(shortcutId: string) {
  console.log(`\n🎹 Simulating key press for: ${shortcutId}`);
  registry.trigger(shortcutId);
}

// Test some shortcuts
setTimeout(() => simulateKeyPress('file.save'), 100);
setTimeout(() => simulateKeyPress('edit.copy'), 200);
setTimeout(() => simulateKeyPress('file.new'), 300);

// Show profile information
console.log('\n=== Profile Information ===');
const profiles = registry.getAllProfiles();
profiles.forEach(profile => {
  console.log(`${profile.name} (${profile.category}): ${profile.description || 'No description'}`);
});

console.log(`\nActive Profile: ${registry.getActiveProfile()?.name}`);

// Show usage statistics
console.log('\n=== Usage Statistics ===');
const stats = registry.getUsageStatistics(30);
stats.slice(0, 5).forEach(stat => {
  console.log(`${stat.description}: ${stat.usageCount} uses`);
});

// Demonstrate conflict detection
console.log('\n=== Conflict Detection ===');
const conflicts = registry.detectConflicts();
if (conflicts.length > 0) {
  conflicts.forEach(conflict => {
    console.log(`⚠️  ${conflict.severity.toUpperCase()} conflict: "${conflict.key}" used by: ${conflict.actions.join(', ')}`);
  });
} else {
  console.log('✅ No conflicts detected');
}

// Show how to create a custom profile
console.log('\n=== Creating Custom Profile ===');
const customProfile = registry.createProfile(
  'My Custom Profile',
  'A profile with my preferred shortcuts',
  'professional' // based on professional profile
);

console.log(`Created profile: ${customProfile.name} (ID: ${customProfile.id})`);

// Switch to the new profile
registry.setActiveProfile(customProfile.id);
console.log(`Switched to active profile: ${registry.getActiveProfile()?.name}`);

// Run if executed directly
if (import.meta.main) {
  console.log('\n🎉 ShortcutRegistry Integration Demo Complete!');
  console.log('This shows how to integrate shortcuts into your application.');
}