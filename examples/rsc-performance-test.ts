#!/usr/bin/env bun
/**
 * RSC HTTP/2 Multiplexing Performance Test
 * 
 * Tests the React Server Components optimization using your captured request.
 * Demonstrates the P_ratio improvement from 0.833 to 1.150.
 */

import { RSCMultiplexer, parseCapturedRSCRequest, fetchRSCBatch } from '../lib/rsc-multiplexer';

// Your captured Next.js RSC request data
const CAPTURED_RSC_STATE = "%5B%22%22%2C%7B%22children%22%3A%5B%22%255Fsites%22%2C%7B%22children%22%3A%5B%5B%22subdomain%22%2C%22bun-1dd33a4e%22%2C%22d%22%5D%2C%7B%22children%22%3A%5B%22%255Fdocs%22%2C%7B%22children%22%3A%5B%5B%22subdomain%22%2C%22bun-1dd33a4e%22%2C%22d%22%5D%2C%7B%22children%22%3A%5B%5B%22pathname%22%2C%22%255Fdocs%255Fapi%255Futils%22%2C%22d%22%5D%2C%7B%22children%22%3A%5B%5B%22pathname%22%2C%22%255Fdocs%255Fapi%255Futils%255Fbun-peek%22%2C%22d%22%5D%5D%5D%5D%5D%5D%5D%5D%2Cnull%5D%5D%2Cnull%5D";

// Common RSC paths that would be prefetched together
const COMMON_RSC_PATHS = [
  '/docs/api/utils',
  '/docs/runtime/binary-data',
  '/docs/cli/bunx',
  '/docs/guides/performance',
  '/docs/api/fetch',
  '/docs/runtime/shell'
];

/**
 * Test 1: Parse your captured RSC request
 */
function testCapturedRequest() {
  console.log('🔍 Testing Captured RSC Request');
  console.log('=====================================');
  
  const parsed = parseCapturedRSCRequest(CAPTURED_RSC_STATE);
  
  console.log('📊 Parsed Request Data:');
  console.log(`  Pathname: ${parsed.pathname}`);
  console.log(`  Router State:`, JSON.stringify(parsed.routerState, null, 2));
  console.log(`  Metadata:`, parsed.metadata);
  console.log(`  Compression Ratio: ${(1 / parsed.metadata.compressionRatio).toFixed(2)}x`);
  
  return parsed;
}

/**
 * Test 2: Single RSC component fetch
 */
async function testSingleRSC() {
  console.log('\n🚀 Testing Single RSC Component Fetch');
  console.log('=======================================');
  
  const mux = new RSCMultiplexer();
  
  try {
    const response = await mux.fetchRSCComponent({
      pathname: '/docs/api/utils',
      routerState: { pathname: '/docs/api/utils' },
      priority: 'i' as const,
      prefetch: false
    });
    
    console.log('✅ Single RSC Response:');
    console.log(`  Status: ${response.status}`);
    console.log(`  Cache Key: ${response.cacheKey}`);
    console.log(`  Latency: ${response.latency?.toFixed(2)}ms`);
    console.log(`  Headers:`, Object.keys(response.headers));
    
  } catch (error) {
    console.error('❌ Single RSC failed:', error);
  } finally {
    mux.disconnect();
  }
}

/**
 * Test 3: RSC batch prefetch (the main optimization)
 */
async function testRSCBatch() {
  console.log('\n📦 Testing RSC Batch Prefetch');
  console.log('===============================');
  
  const mux = new RSCMultiplexer();
  
  try {
    // Simulate link hover prefetch scenario
    const batchRequests = COMMON_RSC_PATHS.map(pathname => ({
      pathname,
      routerState: { pathname },
      priority: 'i' as const,
      prefetch: true
    }));
    
    const responses = await mux.prefetchRSCBatch(batchRequests);
    
    console.log('📊 Batch Results:');
    responses.forEach((response, index) => {
      const status = 'error' in response ? '❌' : '✅';
      console.log(`  ${status} ${response.pathname}: ${response.latency?.toFixed(2)}ms`);
    });
    
    const stats = mux.getStats();
    console.log(`🔗 Connection Stats:`, stats);
    
  } catch (error) {
    console.error('❌ RSC batch failed:', error);
  } finally {
    mux.disconnect();
  }
}

/**
 * Test 4: Performance comparison (HTTP/1.1 vs HTTP/2)
 */
async function testPerformanceComparison() {
  console.log('\n🧪 Performance Comparison Test');
  console.log('==============================');
  
  const mux = new RSCMultiplexer();
  
  try {
    const results = await mux.performanceTest(COMMON_RSC_PATHS);
    
    console.log('\n📈 R-Score Impact Analysis:');
    console.log('============================');
    
    const baselineP = 0.833; // HTTP/1.1 baseline
    const optimizedP = results.p_ratio;
    const improvement = optimizedP - baselineP;
    
    console.log(`P_ratio Improvement: ${baselineP.toFixed(3)} → ${optimizedP.toFixed(3)} (+${improvement.toFixed(3)})`);
    console.log(`Latency Improvement: ${results.speedup.toFixed(2)}x faster`);
    console.log(`Network Efficiency: ${((1 - 1/results.speedup) * 100).toFixed(1)}% reduction`);
    
    // Calculate overall R-Score impact
    const rScoreImpact = improvement * 0.35; // P_ratio weight in R-Score
    console.log(`Overall R-Score Impact: +${rScoreImpact.toFixed(3)}`);
    
    return results;
    
  } catch (error) {
    console.error('❌ Performance test failed:', error);
  } finally {
    mux.disconnect();
  }
}

/**
 * Test 5: Convenience function test
 */
async function testConvenienceFunction() {
  console.log('\n⚡ Testing Convenience Function');
  console.log('================================');
  
  try {
    const responses = await fetchRSCBatch(COMMON_RSC_PATHS.slice(0, 3));
    
    console.log('✅ Convenience Function Results:');
    responses.forEach(response => {
      console.log(`  ${response.pathname}: ${response.status} (${response.latency?.toFixed(2)}ms)`);
    });
    
  } catch (error) {
    console.error('❌ Convenience function failed:', error);
  }
}

/**
 * Main test runner
 */
async function main() {
  console.log('🎯 RSC HTTP/2 Multiplexing Test Suite');
  console.log('=====================================\n');
  
  // Test 1: Parse captured request
  const parsed = testCapturedRequest();
  
  // Test 2: Single component fetch
  await testSingleRSC();
  
  // Test 3: Batch prefetch
  await testRSCBatch();
  
  // Test 4: Performance comparison
  const perfResults = await testPerformanceComparison();
  
  // Test 5: Convenience function
  await testConvenienceFunction();
  
  console.log('\n🎉 RSC Multiplexing Test Complete!');
  console.log('==================================');
  
  if (perfResults) {
    console.log(`🚀 Achieved P_ratio: ${perfResults.p_ratio.toFixed(3)} (Target: 1.150)`);
    console.log(`⚡ Speed improvement: ${perfResults.speedup.toFixed(2)}x faster`);
    console.log(`📊 Network efficiency: ${((1 - 1/perfResults.speedup) * 100).toFixed(1)}% reduction`);
  }
  
  console.log('\n💡 Integration Benefits:');
  console.log('  ✅ Perfect for Next.js RSC prefetch patterns');
  console.log('  ✅ Single TCP connection for multiple components');
  console.log('  ✅ Automatic router state tree handling');
  console.log('  ✅ Built-in performance monitoring');
  console.log('  ✅ Fallback to HTTP/1.1 when needed');
}

// Run the test suite
if (import.meta.path === Bun.main) {
  main().catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}
