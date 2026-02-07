#!/usr/bin/env bun

/**
 * Filter Watch Session Demo
 * 
 * Demonstrates the watch session logging system with simulated
 * file changes and package updates.
 */

import { 
  startWatchSession, 
  recordWatchChange, 
  updateWatchPackages, 
  restartWatchSession,
  stopWatchSession,
  getWatchSessionStats
} from '../lib/filter-watch-logger';

// Demo configuration
const DEMO_PATTERNS = ['app-*', 'lib-*', 'test-*'];
const DEMO_PACKAGES = {
  'app-*': ['app-web', 'app-api', 'app-mobile'],
  'lib-*': ['lib-utils', 'lib-components', 'lib-auth'],
  'test-*': ['test-unit', 'test-integration', 'test-e2e']
};

// Simulated changes
const SIMULATED_CHANGES = [
  { type: 'package_added' as const, package: 'app-desktop', delay: 1000 },
  { type: 'package_modified' as const, package: 'app-web', delay: 2000, details: { file: 'package.json', change: 'version bump' } },
  { type: 'script_changed' as const, package: 'app-api', delay: 3000, details: { script: 'build', change: 'added new script' } },
  { type: 'package_removed' as const, package: 'app-mobile', delay: 4000 },
  { type: 'package_added' as const, package: 'app-tablet', delay: 5000 },
];

/**
 * Run a single watch session demo
 */
async function runWatchSessionDemo(pattern: string, initialPackages: string[]): Promise<void> {
  console.log(`\n🎬 Starting watch session demo for pattern: ${pattern}`);
  console.log(`📦 Initial packages: ${initialPackages.join(', ')}`);
  
  // Start session
  const session = startWatchSession(pattern, initialPackages);
  
  // Simulate changes over time
  for (const change of SIMULATED_CHANGES) {
    await new Promise(resolve => setTimeout(resolve, change.delay));
    
    console.log(`🔄 Recording change: ${change.type} - ${change.package}`);
    recordWatchChange(session.id, change.type, change.package, change.details);
  }
  
  // Update packages (simulate workspace scan)
  await new Promise(resolve => setTimeout(resolve, 6000));
  const updatedPackages = [...initialPackages, 'app-desktop', 'app-tablet'].filter(p => p !== 'app-mobile');
  console.log(`📦 Updating packages: ${updatedPackages.join(', ')}`);
  updateWatchPackages(session.id, updatedPackages);
  
  // Restart session with new pattern
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log(`🔄 Restarting session with new pattern: ${pattern}-v2`);
  restartWatchSession(session.id, `${pattern}-v2`);
  
  // Stop session
  await new Promise(resolve => setTimeout(resolve, 2000));
  await stopWatchSession(session.id);
  
  console.log(`✅ Watch session demo completed for: ${pattern}`);
}

/**
 * Run multiple concurrent watch sessions
 */
async function runConcurrentSessionsDemo(): Promise<void> {
  console.log('\n🚀 Starting concurrent watch sessions demo...');
  
  const sessions = [];
  
  // Start multiple sessions
  for (const pattern of DEMO_PATTERNS) {
    const session = startWatchSession(pattern, DEMO_PACKAGES[pattern as keyof typeof DEMO_PACKAGES]);
    sessions.push(session);
    
    console.log(`📺 Started session: ${session.id}`);
  }
  
  // Simulate some activity in each session
  for (let i = 0; i < 3; i++) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    sessions.forEach((session, index) => {
      const changeTypes = ['package_added', 'package_modified', 'script_changed'];
      const randomType = changeTypes[Math.floor(Math.random() * changeTypes.length)] as any;
      const randomPackage = `demo-package-${index}-${i}`;
      
      recordWatchChange(session.id, randomType, randomPackage, { demo: true, iteration: i });
      console.log(`🔄 Change recorded in ${session.id}: ${randomType} - ${randomPackage}`);
    });
  }
  
  // Stop all sessions
  await new Promise(resolve => setTimeout(resolve, 2000));
  console.log('\n🛑 Stopping all sessions...');
  
  for (const session of sessions) {
    await stopWatchSession(session.id);
  }
  
  console.log('✅ Concurrent sessions demo completed');
}

/**
 * Display session statistics
 */
function displayStats(): void {
  const stats = getWatchSessionStats();
  
  console.log('\n📊 Current Session Statistics:');
  console.log(`   Active Sessions: ${stats.activeSessions}`);
  console.log(`   Total Changes: ${stats.totalChanges}`);
  console.log(`   Average Duration: ${stats.averageSessionDuration}ms`);
  
  if (Object.keys(stats.patterns).length > 0) {
    console.log('   Patterns:');
    Object.entries(stats.patterns).forEach(([pattern, count]) => {
      console.log(`     ${pattern}: ${count} sessions`);
    });
  }
}

/**
 * Main demo runner
 */
async function main(): Promise<void> {
  console.log('🎯 Filter Watch Session Logger Demo');
  console.log('=====================================');
  
  try {
    // Single session demo
    await runWatchSessionDemo('app-*', DEMO_PACKAGES['app-*']);
    
    // Display stats
    displayStats();
    
    // Concurrent sessions demo
    await runConcurrentSessionsDemo();
    
    // Final stats
    displayStats();
    
    console.log('\n🎉 All demos completed successfully!');
    console.log('📁 Check the data/r2-logs directory for uploaded session logs.');
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

// Run demo if this file is executed directly
if (import.meta.main) {
  main().catch(console.error);
}
