#!/usr/bin/env bun
/**
 * Test runner with profile integration
 * Automatically selects and applies the appropriate testing profile
 */

import { CIDetector } from '../src/lib/ci-detector.ts';
import { loadProfile } from '../src/lib/profileLoader.ts';

async function runTestsWithProfile() {
  // Detect CI environment
  const detector = await CIDetector.getInstance();
  const ci = detector.detectSync();
  
  // Select appropriate profile
  let profileName = 'test-local';
  
  if (ci.isCI) {
    if (process.argv.includes('--performance') || process.argv.includes('--perf')) {
      profileName = 'test-performance';
    } else if (process.argv.includes('--comprehensive') || process.argv.includes('--full')) {
      profileName = 'test-comprehensive';
    } else {
      profileName = ci.isPR ? 'test-performance' : 'test-comprehensive';
    }
  }
  
  console.log(`🚀 Loading profile: ${profileName}`);
  
  // Load and apply profile
  const profile = await loadProfile(profileName);
  if (!profile) {
    console.error(`❌ Profile ${profileName} not found`);
    process.exit(1);
  }
  
  // Apply environment variables
  Object.entries(profile.env).forEach(([key, value]) => {
    process.env[key] = value;
  });
  
  // Refresh CI detector
  detector.refreshEnvironment(process.env);
  
  console.log(`✅ Profile applied: ${profile.description}`);
  
  // Run tests with appropriate flags
  const testArgs = process.argv.slice(2).filter(arg => !arg.startsWith('--profile'));
  
  if (profileName === 'test-performance') {
    console.log('⚡ Running performance tests...');
    await Bun.$`bun test ${testArgs} --timeout=30000`;
  } else if (profileName === 'benchmark') {
    console.log('📊 Running benchmarks...');
    await Bun.$`bun test ${testArgs} --timeout=60000`;
  } else {
    console.log('🧪 Running comprehensive tests...');
    await Bun.$`bun test ${testArgs} --coverage`;
  }
}

// Run the script
if (import.meta.main) {
  runTestsWithProfile().catch(err => {
    console.error('❌ Test execution failed:', err);
    process.exit(1);
  });
}
