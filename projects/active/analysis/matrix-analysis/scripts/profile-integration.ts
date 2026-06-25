#!/usr/bin/env bun
/**
 * Profile Integration with CI Detection
 * 
 * This script demonstrates how to use the new testing and performance profiles
 * with the CIDetector for optimal CI/CD integration
 */

import { CIDetector } from '../src/lib/ci-detector.ts';
import { loadProfile, listProfiles } from '../src/lib/profileLoader.ts';

async function demonstrateProfileIntegration() {
  console.info('🔧 Profile Integration with CI Detection\n');
  
  // Get current CI environment
  const detector = await CIDetector.getInstance();
  const ci = detector.detectSync();
  
  console.info('📊 Current CI Environment:');
  console.info(`  Platform: ${ci.name}`);
  console.info(`  Is CI: ${ci.isCI}`);
  console.info(`  Is PR: ${ci.isPR}`);
  console.info(`  Branch: ${ci.branch || 'N/A'}`);
  console.info(`  Tag: ${ci.tag || 'N/A'}\n`);
  
  // List available profiles
  const profiles = await listProfiles();
  const testProfiles = profiles.filter(p => 
    p.includes('test') || p.includes('benchmark') || p.includes('perf')
  );
  
  console.info('📋 Available Testing/Performance Profiles:');
  testProfiles.forEach((profile, i) => {
    console.info(`  ${i + 1}. ${profile}`);
  });
  
  // Auto-select profile based on CI environment
  let selectedProfile = 'test-comprehensive';
  
  if (ci.name === 'GitHub Actions' && ci.isPR) {
    selectedProfile = 'test-performance';
    console.info('\n✅ PR detected in GitHub Actions - using performance profile');
  } else if (ci.isCI) {
    selectedProfile = 'test-comprehensive';
    console.info('\n✅ CI environment detected - using comprehensive test profile');
  } else {
    selectedProfile = 'test-local';
    console.info('\n✅ Local environment - using local test profile');
  }
  
  // Load and display selected profile
  const profile = await loadProfile(selectedProfile);
  if (profile) {
    console.info(`\n🎯 Selected Profile: ${profile.name}`);
    console.info(`   Description: ${profile.description}`);
    console.info(`   Environment: ${profile.environment}`);
    
    // Apply profile environment variables
    console.info('\n🔧 Applying profile environment variables...');
    Object.entries(profile.env).forEach(([key, value]) => {
      process.env[key] = value;
      if (key.includes('PASSWORD') || key.includes('SECRET') || key.includes('TOKEN')) {
        console.info(`   ${key}: ************`);
      } else {
        console.info(`   ${key}: ${value}`);
      }
    });
    
    // Refresh CI detector with new environment
    detector.refreshEnvironment(process.env);
    const updatedCI = detector.detectSync();
    
    console.info('\n📊 Updated CI Detection:');
    console.info(`  Annotations enabled: ${updatedCI.annotations.enabled}`);
    console.info(`  Annotation format: ${updatedCI.annotations.format}`);
  }
  
  // Performance mode example
  if (selectedProfile === 'benchmark') {
    console.info('\n⚡ Benchmark mode activated');
    console.info('   - Profiling enabled');
    console.info('   - Metrics collection active');
    console.info('   - Performance monitoring on');
  }
  
  console.info('\n✨ Profile integration complete!');
}

// CLI interface
if (import.meta.main) {
  const command = process.argv[2];
  
  if (command === 'demo') {
    demonstrateProfileIntegration();
  } else if (command === 'list') {
    const profiles = await listProfiles();
    console.info('Available profiles:');
    profiles.forEach(p => console.info(`  - ${p}`));
  } else {
    console.info('Usage:');
    console.info('  bun run scripts/profile-integration.ts demo    - Show integration demo');
    console.info('  bun run scripts/profile-integration.ts list    - List all profiles');
  }
}
