// examples/bun-anti-detection-usage.ts - Complete usage examples for BunAntiDetection

import { BunAntiDetection, antiDetection } from '../automation/enhanced-bun-anti-detection';

/**
 * Basic usage example with singleton instance
 */
async function basicUsage() {
  console.info('🚀 Basic BunAntiDetection Usage');
  
  const agentId = 'web-scraper-001';
  
  // Apply rate limiting and humanized delay
  await antiDetection.delay(agentId);
  
  // Get randomized user agent
  const userAgent = antiDetection.userAgent(agentId);
  console.info(`📱 User Agent: ${userAgent}`);
  
  // Get healthy proxy
  const proxy = antiDetection.proxy(agentId);
  if (proxy) {
    console.info(`🌐 Proxy: ${proxy}`);
  } else {
    console.info('⚠️ No healthy proxies available');
  }
  
  // View system stats
  const stats = antiDetection.stats();
  console.info('📊 System Stats:', stats);
}

/**
 * Advanced usage with custom configuration
 */
async function advancedUsage() {
  console.info('\n🔧 Advanced Usage with Custom Config');
  
  // Create custom instance with specific configuration
  const customDetector = new BunAntiDetection({
    maxRequestsPerMinute: 10,
    minDelayMs: 1000,
    maxDelayMs: 5000,
    bucketSize: 15,
    cleanupIntervalMs: 180000, // 3 minutes
    proxyFailureThreshold: 5,
    metricsEnabled: true
  });
  
  const agentId = 'advanced-agent-002';
  
  try {
    // Chain operations for efficient workflow
    await customDetector.delay(agentId);
    const userAgent = customDetector.userAgent(agentId);
    const proxy = customDetector.proxy(agentId);
    
    console.info(`✅ Agent ${agentId} configured successfully`);
    console.info(`🔍 UA: ${userAgent.substring(0, 50)}...`);
    console.info(`🔗 Proxy: ${proxy || 'direct'}`);
    
    // Simulate proxy failure to test circuit breaker
    if (proxy) {
      customDetector.failProxy(proxy);
      console.info(`🚫 Reported proxy failure: ${proxy}`);
    }
    
    // Check stats after failure
    const stats = customDetector.stats();
    console.info('📈 Updated Stats:', stats);
    
  } catch (error) {
    console.error('❌ Error in advanced usage:', error);
  } finally {
    // Clean up resources
    customDetector.destroy();
    console.info('🧹 Custom detector cleaned up');
  }
}

/**
 * Multi-agent coordination example
 */
async function multiAgentExample() {
  console.info('\n👥 Multi-Agent Coordination');
  
  const agents = ['scraper-001', 'scraper-002', 'scraper-003'];
  const detector = new BunAntiDetection({
    maxRequestsPerMinute: 3,
    minDelayMs: 2000,
    maxDelayMs: 7000,
    metricsEnabled: true
  });
  
  try {
    // Run multiple agents concurrently
    const promises = agents.map(async (agentId) => {
      console.info(`🤖 Starting agent: ${agentId}`);
      
      await detector.delay(agentId);
      const userAgent = detector.userAgent(agentId);
      const proxy = detector.proxy(agentId);
      
      return {
        agentId,
        userAgent: userAgent.substring(0, 30) + '...',
        proxy: proxy || 'direct',
        timestamp: new Date().toISOString()
      };
    });
    
    const results = await Promise.all(promises);
    
    console.info('📋 Agent Results:');
    results.forEach(result => {
      console.info(`  ${result.agentId}: ${result.proxy} | ${result.userAgent}`);
    });
    
    // Final system stats
    const finalStats = detector.stats();
    console.info('\n📊 Final System Stats:', finalStats);
    
  } finally {
    detector.destroy();
  }
}

/**
 * Error handling and validation examples
 */
async function errorHandlingExample() {
  console.info('\n⚠️ Error Handling & Validation');
  
  const detector = new BunAntiDetection();
  
  try {
    // Test invalid agent IDs
    const invalidIds = ['', null as any, undefined as any, 'invalid@id', 'a'.repeat(101)];
    
    for (const invalidId of invalidIds) {
      try {
        await detector.delay(invalidId);
        console.info(`❌ Should have failed for: ${invalidId}`);
      } catch (error) {
        console.info(`✅ Correctly rejected: ${invalidId} -> ${(error as Error).message}`);
      }
    }
    
    // Test valid agent ID
    await detector.delay('valid-agent-123');
    console.info('✅ Valid agent ID accepted');
    
  } finally {
    detector.destroy();
  }
}

/**
 * Performance monitoring example
 */
async function performanceMonitoring() {
  console.info('\n📈 Performance Monitoring');
  
  const detector = new BunAntiDetection({
    maxRequestsPerMinute: 20,
    minDelayMs: 500,
    maxDelayMs: 2000,
    metricsEnabled: true
  });
  
  const startTime = Date.now();
  const agentId = 'perf-test-agent';
  
  try {
    // Simulate burst of requests
    console.info('🔄 Simulating request burst...');
    
    for (let i = 0; i < 25; i++) {
      const requestStart = Date.now();
      await detector.delay(agentId);
      const requestTime = Date.now() - requestStart;
      
      console.info(`Request ${i + 1}: ${requestTime}ms`);
    }
    
    const totalTime = Date.now() - startTime;
    const stats = detector.stats();
    
    console.info('\n📊 Performance Summary:');
    console.info(`Total time: ${totalTime}ms`);
    console.info(`Average per request: ${Math.round(totalTime / 25)}ms`);
    console.info(`Rate limit hits: ${stats.rateLimitHits}`);
    console.info(`Total requests: ${stats.totalRequests}`);
    
  } finally {
    detector.destroy();
  }
}

/**
 * Circuit breaker demonstration
 */
async function circuitBreakerDemo() {
  console.info('\n🔌 Circuit Breaker Demo');
  
  const detector = new BunAntiDetection({
    proxyFailureThreshold: 2,
    metricsEnabled: true
  });
  
  const agentId = 'circuit-test';
  
  try {
    // Get initial proxy
    const initialProxy = detector.proxy(agentId);
    console.info(`🌐 Initial proxy: ${initialProxy}`);
    
    if (initialProxy) {
      // Simulate multiple failures to trigger circuit breaker
      console.info('💥 Simulating proxy failures...');
      detector.failProxy(initialProxy);
      detector.failProxy(initialProxy);
      
      // Try to get proxy again (should fail or return different one)
      const fallbackProxy = detector.proxy(agentId);
      console.info(`🔄 Fallback proxy: ${fallbackProxy}`);
      
      // Check system health
      const stats = detector.stats();
      console.info('📊 System health:', stats);
    }
    
  } finally {
    detector.destroy();
  }
}

// Run all examples
async function runAllExamples() {
  console.info('🎯 BunAntiDetection Complete Usage Examples\n');
  
  try {
    await basicUsage();
    await advancedUsage();
    await multiAgentExample();
    await errorHandlingExample();
    await performanceMonitoring();
    await circuitBreakerDemo();
    
    console.info('\n✅ All examples completed successfully!');
    
  } catch (error) {
    console.error('❌ Example failed:', error);
  }
}

// Export for individual testing
export {
  basicUsage,
  advancedUsage,
  multiAgentExample,
  errorHandlingExample,
  performanceMonitoring,
  circuitBreakerDemo,
  runAllExamples
};

// Run if called directly
if (import.meta.main) {
  runAllExamples();
}
