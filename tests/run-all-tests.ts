#!/usr/bin/env bun

/**
 * 🧪 Test Runner for All R2 Integration Tests
 * 
 * Runs comprehensive test suite for race conditions, error handling, validation, and edge cases
 */

import { runTests } from '../lib/core/unit-test-framework.ts';

/**
 * Run all test suites
 */
async function runAllTests() {
  console.log('🚀 Starting Comprehensive R2 Integration Test Suite');
  console.log('='.repeat(60));
  
  try {
    // Import and run all test files
    const testFiles = [
      './validation.test.ts',
      './concurrent-operations.test.ts',
      './r2-integration.test.ts',
      './url-handler.test.ts'
    ];

    let totalSuites = 0;
    let totalTests = 0;
    let totalPassed = 0;
    let totalFailed = 0;
    let totalDuration = 0;
    let totalAssertions = 0;

    for (const testFile of testFiles) {
      console.log(`\n📋 Running ${testFile}`);
      console.log('-'.repeat(40));
      
      try {
        // Dynamic import of test file
        const testModule = await import(testFile);
        
        // If the test file has its own runner, use it
        if (testModule.runTests) {
          await testModule.runTests();
        }
        
        console.log(`✅ Completed ${testFile}`);
        
      } catch (error) {
        console.error(`❌ Failed to run ${testFile}:`, error);
      }
    }

    console.log('\n🎉 All Tests Completed!');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

/**
 * Run performance tests
 */
async function runPerformanceTests() {
  console.log('\n⚡ Running Performance Tests');
  console.log('-'.repeat(40));
  
  const { ConcurrentOperationsManager } = await import('../lib/core/concurrent-operations.ts');
  const { globalCache } = await import('../lib/core/cache-manager.ts');
  
  // Test concurrent operations performance
  const manager = new ConcurrentOperationsManager(20);
  const startTime = Date.now();
  
  const operations = Array.from({ length: 1000 }, (_, i) => 
    () => Promise.resolve(`perf-result-${i}`)
  );
  
  const results = await manager.executeConcurrently(operations);
  const duration = Date.now() - startTime;
  
  console.log(`📊 Concurrent Operations:`);
  console.log(`   Operations: ${results.length}`);
  console.log(`   Duration: ${duration}ms`);
  console.log(`   Throughput: ${(results.length / duration * 1000).toFixed(2)} ops/sec`);
  console.log(`   Success Rate: ${(results.filter(r => r.success).length / results.length * 100).toFixed(2)}%`);
  
  // Test cache performance
  const cacheStartTime = Date.now();
  
  for (let i = 0; i < 1000; i++) {
    await globalCache.set(`perf-key-${i}`, { data: i, timestamp: Date.now() });
    await globalCache.get(`perf-key-${i}`);
  }
  
  const cacheDuration = Date.now() - cacheStartTime;
  
  console.log(`\n💾 Cache Performance:`);
  console.log(`   Operations: 2000 (1000 set + 1000 get)`);
  console.log(`   Duration: ${cacheDuration}ms`);
  console.log(`   Throughput: ${(2000 / cacheDuration * 1000).toFixed(2)} ops/sec`);
  
  const cacheStats = globalCache.getStats();
  console.log(`   Hit Rate: ${(cacheStats.hitRate * 100).toFixed(2)}%`);
  console.log(`   Memory Usage: ${(cacheStats.memoryUsage / 1024).toFixed(2)} KB`);
}

/**
 * Run stress tests
 */
async function runStressTests() {
  console.log('\n💪 Running Stress Tests');
  console.log('-'.repeat(40));
  
  const { ConcurrentOperationsManager } = await import('../lib/core/concurrent-operations.ts');
  const { globalCache } = await import('../lib/core/cache-manager.ts');
  
  // Stress test concurrent operations
  const manager = new ConcurrentOperationsManager(50);
  
  console.log('🔄 Stress testing concurrent operations...');
  const stressOperations = Array.from({ length: 5000 }, (_, i) => {
    const delay = Math.random() * 10; // Random delay 0-10ms
    return () => new Promise(resolve => {
      setTimeout(() => resolve(`stress-${i}`), delay);
    });
  });
  
  const stressStartTime = Date.now();
  const stressResults = await manager.executeConcurrently(stressOperations, { 
    failFast: false,
    timeout: 5000 
  });
  const stressDuration = Date.now() - stressStartTime;
  
  console.log(`   Operations: ${stressResults.length}`);
  console.log(`   Duration: ${stressDuration}ms`);
  console.log(`   Success Rate: ${(stressResults.filter(r => r.success).length / stressResults.length * 100).toFixed(2)}%`);
  console.log(`   Average per operation: ${(stressDuration / stressResults.length).toFixed(2)}ms`);
  
  // Stress test cache
  console.log('\n💾 Stress testing cache...');
  const cacheStressStart = Date.now();
  
  const cachePromises = Array.from({ length: 10000 }, async (_, i) => {
    await globalCache.set(`stress-key-${i}`, { 
      index: i, 
      data: 'x'.repeat(100), // 100 bytes per entry
      timestamp: Date.now() 
    });
    return globalCache.get(`stress-key-${i}`);
  });
  
  await Promise.all(cachePromises);
  const cacheStressDuration = Date.now() - cacheStressStart;
  
  console.log(`   Cache Operations: 20000`);
  console.log(`   Duration: ${cacheStressDuration}ms`);
  console.log(`   Throughput: ${(20000 / cacheStressDuration * 1000).toFixed(2)} ops/sec`);
  
  const finalCacheStats = globalCache.getStats();
  console.log(`   Final Hit Rate: ${(finalCacheStats.hitRate * 100).toFixed(2)}%`);
  console.log(`   Total Entries: ${finalCacheStats.totalEntries}`);
}

/**
 * Main test runner
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--performance')) {
    await runPerformanceTests();
  } else if (args.includes('--stress')) {
    await runStressTests();
  } else if (args.includes('--all')) {
    await runAllTests();
    await runPerformanceTests();
    await runStressTests();
  } else {
    await runAllTests();
  }
}

// Run if executed directly
if (import.meta.main) {
  main().catch(console.error);
}
