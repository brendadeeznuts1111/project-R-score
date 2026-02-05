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
  console.log('🔧 Profile Integration with CI Detection\n');
  
  // Get current CI environment
  const detector = await CIDetector.getInstance();
  const ci = detector.detectSync();
  
  console.log('📊 Current CI Environment:');
  console.log(`  Platform: ${ci.name}`);
  console.log(`  Is CI: ${ci.isCI}`);
  console.log(`  Is PR: ${ci.isPR}`);
  console.log(`  Branch: ${ci.branch || 'N/A'}`);
  console.log(`  Tag: ${ci.tag || 'N/A'}\n`);
  
  // List available profiles
  const profiles = await listProfiles();
  const testProfiles = profiles.filter(p => 
    p.includes('test') || p.includes('benchmark') || p.includes('perf')
  );
  
  console.log('📋 Available Testing/Performance Profiles:');
  testProfiles.forEach((profile, i) => {
    console.log(`  ${i + 1}. ${profile}`);
  });
  
  // Auto-select profile based on CI environment
  let selectedProfile = 'test-comprehensive';
  
  if (ci.name === 'GitHub Actions' && ci.isPR) {
    selectedProfile = 'test-performance';
    console.log('\n✅ PR detected in GitHub Actions - using performance profile');
  } else if (ci.isCI) {
    selectedProfile = 'test-comprehensive';
    console.log('\n✅ CI environment detected - using comprehensive test profile');
  } else {
    selectedProfile = 'test-local';
    console.log('\n✅ Local environment - using local test profile');
  }
  
  // Load and display selected profile
  const profile = await loadProfile(selectedProfile);
  if (profile) {
    console.log(`\n🎯 Selected Profile: ${profile.name}`);
    console.log(`   Description: ${profile.description}`);
    console.log(`   Environment: ${profile.environment}`);
    
    // Apply profile environment variables
    console.log('\n🔧 Applying profile environment variables...');
    Object.entries(profile.env).forEach(([key, value]) => {
      process.env[key] = value;
      if (key.includes('PASSWORD') || key.includes('SECRET') || key.includes('TOKEN')) {
        console.log(`   ${key}: ************`);
      } else {
        console.log(`   ${key}: ${value}`);
      }
    });
    
    // Refresh CI detector with new environment
    detector.refreshEnvironment(process.env);
    const updatedCI = detector.detectSync();
    
    console.log('\n📊 Updated CI Detection:');
    console.log(`  Annotations enabled: ${updatedCI.annotations.enabled}`);
    console.log(`  Annotation format: ${updatedCI.annotations.format}`);
  }
  
  // Performance mode example
  if (selectedProfile === 'benchmark') {
    console.log('\n⚡ Benchmark mode activated');
    console.log('   - Profiling enabled');
    console.log('   - Metrics collection active');
    console.log('   - Performance monitoring on');
  }
  
  console.log('\n✨ Profile integration complete!');
}

// CLI interface
if (import.meta.main) {
  const command = process.argv[2];
  
  if (command === 'demo') {
    demonstrateProfileIntegration();
  } else if (command === 'list') {
    const profiles = await listProfiles();
    console.log('Available profiles:');
    profiles.forEach(p => console.log(`  - ${p}`));
  } else {
    console.log('Usage:');
    console.log('  bun run scripts/profile-integration.ts demo    - Show integration demo');
    console.log('  bun run scripts/profile-integration.ts list    - List all profiles');
  }
}
