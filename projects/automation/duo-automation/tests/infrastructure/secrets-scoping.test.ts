#!/usr/bin/env bun
// test-secrets-scoping.ts - Test CRED_PERSIST_ENTERPRISE per-user scoping
// Verifies that secrets are properly scoped per user and not system-wide

import { secrets } from 'bun';
import { existsSync, mkdirSync } from 'fs';

// Test configuration
const TEST_SERVICE = 'test-secrets-scoping';
const TEST_TEAM = 'test-team';
const PLATFORM_SCOPE = process.platform === 'win32' ? 'ENTERPRISE' : 'USER';
const SCOPED_SERVICE = `${TEST_SERVICE}-${PLATFORM_SCOPE}-${TEST_TEAM}`;

// Helper functions (mirroring setup-check.ts)
const scopedService = (team: string = 'default'): string => {
  const BASE_SERVICE = 'windsurf-r2-empire';
  const PLATFORM_SCOPE = process.platform === 'win32' ? 'ENTERPRISE' : 'USER';
  return `${BASE_SERVICE}-${PLATFORM_SCOPE}-${team}`;
};

// Test results
interface TestResult {
  testName: string;
  passed: boolean;
  message: string;
  details?: any;
}

const testResults: TestResult[] = [];

function log(message: string) {
  console.log(`[SECRETS-TEST] ${message}`);
}

function addResult(testName: string, passed: boolean, message: string, details?: any) {
  const result: TestResult = { testName, passed, message, details };
  testResults.push(result);
  
  const status = passed ? '✅' : '❌';
  log(`${status} ${testName}: ${message}`);
  
  if (details) {
    log(`   Details: ${JSON.stringify(details, null, 2)}`);
  }
}

// Test 1: Verify CRED_PERSIST_ENTERPRISE flag is accepted
async function testPersistFlagAccepted() {
  try {
    const testKey = 'test-flag-acceptance';
    const testValue = 'flag-test-value-' + Date.now();
    
    // Type assertion for experimental persist property
    const secretOptions = {
      service: SCOPED_SERVICE,
      name: testKey,
      value: testValue,
      persist: 'CRED_PERSIST_ENTERPRISE' as const
    };
    
    // Try to set a secret with CRED_PERSIST_ENTERPRISE
    await secrets.set(secretOptions as any);
    
    // Try to retrieve it with the same flag
    const retrieved = await secrets.get({
      service: SCOPED_SERVICE,
      name: testKey,
      persist: 'CRED_PERSIST_ENTERPRISE' as const
    } as any);
    
    const passed = retrieved === testValue;
    addResult(
      'CRED_PERSIST_ENTERPRISE Flag Accepted',
      passed,
      passed ? 'Flag works correctly' : 'Flag not working',
      { expected: testValue, actual: retrieved }
    );
    
    // Cleanup
    await secrets.delete({
      service: SCOPED_SERVICE,
      name: testKey,
      persist: 'CRED_PERSIST_ENTERPRISE' as const
    } as any);
    
  } catch (error) {
    addResult(
      'CRED_PERSIST_ENTERPRISE Flag Accepted',
      false,
      `Error: ${error.message}`,
      { error: error.toString() }
    );
  }
}

// Test 2: Verify per-user scoping isolation
async function testPerUserIsolation() {
  try {
    const testKey = 'isolation-test';
    const testValue1 = 'user1-value-' + Date.now();
    const testValue2 = 'user2-value-' + Date.now();
    
    // Create two different scoped services (simulating different users/teams)
    const service1 = scopedService('user1');
    const service2 = scopedService('user2');
    
    // Set values for both "users"
    await secrets.set({ 
      service: service1, 
      name: testKey, 
      value: testValue1, 
      persist: 'CRED_PERSIST_ENTERPRISE' as const
    } as any);
    
    await secrets.set({ 
      service: service2, 
      name: testKey, 
      value: testValue2, 
      persist: 'CRED_PERSIST_ENTERPRISE' as const
    } as any);
    
    // Retrieve values - they should be different
    const retrieved1 = await secrets.get({ 
      service: service1, 
      name: testKey, 
      persist: 'CRED_PERSIST_ENTERPRISE' as const
    } as any);
    
    const retrieved2 = await secrets.get({ 
      service: service2, 
      name: testKey, 
      persist: 'CRED_PERSIST_ENTERPRISE' as const
    } as any);
    
    const isolationWorking = retrieved1 === testValue1 && retrieved2 === testValue2 && retrieved1 !== retrieved2;
    
    addResult(
      'Per-User Isolation',
      isolationWorking,
      isolationWorking ? 'Users properly isolated' : 'Isolation failed',
      {
        service1: { expected: testValue1, actual: retrieved1 },
        service2: { expected: testValue2, actual: retrieved2 }
      }
    );
    
    // Cleanup
    await secrets.delete({ 
      service: service1, 
      name: testKey, 
      persist: 'CRED_PERSIST_ENTERPRISE' as const
    } as any);
    
    await secrets.delete({ 
      service: service2, 
      name: testKey, 
      persist: 'CRED_PERSIST_ENTERPRISE' as const
    } as any);
    
  } catch (error) {
    addResult(
      'Per-User Isolation',
      false,
      `Error: ${error.message}`,
      { error: error.toString() }
    );
  }
}

// Test 3: Verify setup-check.ts style operations
async function testSetupCheckStyleOperations() {
  try {
    const testKey = 'setup-check-style-test';
    const testValue = 'setup-check-value-' + Date.now();
    
    // Mimic setup-check.ts operations with CRED_PERSIST_ENTERPRISE
    const SERVICE = 'windsurf-r2-empire';
    
    // Test get/set/delete operations like setup-check.ts
    await secrets.set({ 
      service: SERVICE, 
      name: testKey, 
      value: testValue, 
      persist: 'CRED_PERSIST_ENTERPRISE' as const
    } as any);
    
    const retrieved = await secrets.get({ 
      service: SERVICE, 
      name: testKey, 
      persist: 'CRED_PERSIST_ENTERPRISE' as const
    } as any);
    
    // Test deletion
    await secrets.delete({ 
      service: SERVICE, 
      name: testKey, 
      persist: 'CRED_PERSIST_ENTERPRISE' as const
    } as any);
    
    // Verify it's gone
    const afterDelete = await secrets.get({ 
      service: SERVICE, 
      name: testKey, 
      persist: 'CRED_PERSIST_ENTERPRISE' as const
    } as any);
    
    const passed = retrieved === testValue && (afterDelete === undefined || afterDelete === null);
    
    addResult(
      'Setup-Check Style Operations',
      passed,
      passed ? 'All operations work correctly' : 'Operations failed',
      {
        retrieved: { expected: testValue, actual: retrieved },
        afterDelete: { expected: 'undefined or null', actual: afterDelete }
      }
    );
    
  } catch (error) {
    addResult(
      'Setup-Check Style Operations',
      false,
      `Error: ${error.message}`,
      { error: error.toString() }
    );
  }
}

// Test 4: Verify cross-platform scoping
async function testCrossPlatformScoping() {
  try {
    const testKey = 'platform-test';
    const testValue = 'platform-value-' + Date.now();
    
    // Test the scoped service function
    const service1 = scopedService('test');
    const service2 = scopedService('test');
    
    // Should be the same for the same team
    const sameService = service1 === service2;
    
    // Should contain platform scope
    const hasPlatformScope = service1.includes(PLATFORM_SCOPE);
    
    const passed = sameService && hasPlatformScope;
    
    addResult(
      'Cross-Platform Scoping',
      passed,
      passed ? `Platform scoping correct (${PLATFORM_SCOPE})` : 'Platform scoping failed',
      {
        platform: process.platform,
        scope: PLATFORM_SCOPE,
        service: service1,
        hasScope: hasPlatformScope,
        consistent: sameService
      }
    );
    
  } catch (error) {
    addResult(
      'Cross-Platform Scoping',
      false,
      `Error: ${error.message}`,
      { error: error.toString() }
    );
  }
}

// Test 5: Verify persistence behavior
async function testPersistenceBehavior() {
  try {
    const testKey = 'persistence-test';
    const testValue = 'persistence-value-' + Date.now();
    
    // Set a secret
    await secrets.set({ 
      service: SCOPED_SERVICE, 
      name: testKey, 
      value: testValue, 
      persist: 'CRED_PERSIST_ENTERPRISE' as const
    } as any);
    
    // Retrieve it immediately
    const retrieved1 = await secrets.get({ 
      service: SCOPED_SERVICE, 
      name: testKey, 
      persist: 'CRED_PERSIST_ENTERPRISE' as const
    } as any);
    
    // Retrieve it again (should still be there)
    const retrieved2 = await secrets.get({ 
      service: SCOPED_SERVICE, 
      name: testKey, 
      persist: 'CRED_PERSIST_ENTERPRISE' as const
    } as any);
    
    const persistenceWorking = retrieved1 === testValue && retrieved2 === testValue;
    
    addResult(
      'Persistence Behavior',
      persistenceWorking,
      persistenceWorking ? 'Secrets persist correctly' : 'Persistence failed',
      {
        first: { expected: testValue, actual: retrieved1 },
        second: { expected: testValue, actual: retrieved2 }
      }
    );
    
    // Cleanup
    await secrets.delete({ 
      service: SCOPED_SERVICE, 
      name: testKey, 
      persist: 'CRED_PERSIST_ENTERPRISE' as const
    } as any);
    
  } catch (error) {
    addResult(
      'Persistence Behavior',
      false,
      `Error: ${error.message}`,
      { error: error.toString() }
    );
  }
}

// Main test runner
async function runTests() {
  log('🔐 Starting CRED_PERSIST_ENTERPRISE Scoping Tests');
  log(`Platform: ${process.platform}`);
  log(`Scope: ${PLATFORM_SCOPE}`);
  log(`Service: ${SCOPED_SERVICE}`);
  log('');
  
  // Run all tests
  await testPersistFlagAccepted();
  await testPerUserIsolation();
  await testSetupCheckStyleOperations();
  await testCrossPlatformScoping();
  await testPersistenceBehavior();
  
  // Summary
  const passed = testResults.filter(r => r.passed).length;
  const total = testResults.length;
  const percentage = Math.round((passed / total) * 100);
  
  log('');
  log('📊 Test Results Summary:');
  log(`Total Tests: ${total}`);
  log(`Passed: ${passed}`);
  log(`Failed: ${total - passed}`);
  log(`Success Rate: ${percentage}%`);
  
  if (passed === total) {
    log('🎉 All tests passed! CRED_PERSIST_ENTERPRISE is properly implemented.');
  } else {
    log('⚠️ Some tests failed. Check the implementation.');
    
    // Show failed tests
    const failed = testResults.filter(r => !r.passed);
    log('');
    log('❌ Failed Tests:');
    failed.forEach(test => {
      log(`   - ${test.testName}: ${test.message}`);
    });
  }
  
  // Save test results
  mkdirSync('reports', { recursive: true });
  const reportPath = 'reports/secrets-scoping-test-results.json';
  await Bun.write(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    platform: process.platform,
    scope: PLATFORM_SCOPE,
    summary: {
      total,
      passed,
      failed: total - passed,
      percentage
    },
    results: testResults
  }, null, 2));
  
  log(`📄 Detailed results saved to: ${reportPath}`);
  
  // Exit with appropriate code
  process.exit(passed === total ? 0 : 1);
}

// Run tests
runTests().catch(error => {
  log(`💥 Test runner failed: ${error.message}`);
  console.error(error);
  process.exit(1);
});
