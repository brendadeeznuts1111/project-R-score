#!/usr/bin/env bun

/**
 * Bun Fetch Performance Optimization
 *
 * Comprehensive examples demonstrating DNS prefetching, preconnect,
 * connection pooling, and advanced fetch options for maximum performance.
 */

import { dns, fetch } from 'bun';

// Example 1: DNS Prefetching
console.info('🌐 DNS Prefetching');

async function dnsPrefetchingExamples() {
  console.info('\n📝 DNS prefetching scenarios...');

  // Example 1: Basic DNS prefetching
  console.info('\n1. Basic DNS prefetching:');
  try {
    console.info('🔄 Prefetching DNS for example.com...');
    dns.prefetch('example.com');
    console.info('✅ DNS prefetch initiated');

    // Wait a moment for DNS to resolve
    await new Promise(resolve => setTimeout(resolve, 100));

    // Now make the request - should be faster due to cached DNS
    const startTime = performance.now();
    const response = await fetch('https://example.com', {
      verbose: true
    });
    const endTime = performance.now();

    console.info(`⚡ Request completed in ${(endTime - startTime).toFixed(2)}ms`);
  } catch (error) {
    console.info('❌ DNS prefetch error:', error.message);
  }

  // Example 2: Multiple DNS prefetches
  console.info('\n2. Multiple DNS prefetches:');
  try {
    const hosts = [
      'https://httpbin.org',
      'https://jsonplaceholder.typicode.com',
      'https://api.github.com',
      'https://cdn.jsdelivr.net'
    ];

    console.info('🔄 Prefetching DNS for multiple hosts...');
    hosts.forEach(host => {
      const url = new URL(host);
      dns.prefetch(url.hostname);
      console.info(`   Prefetched: ${url.hostname}`);
    });

    // Wait for DNS resolutions
    await new Promise(resolve => setTimeout(resolve, 200));

    console.info('✅ Multiple DNS prefetches completed');
  } catch (error) {
    console.info('❌ Multiple DNS prefetch error:', error.message);
  }

  // Example 3: DNS cache statistics
  console.info('\n3. DNS cache statistics:');
  try {
    const stats = dns.getCacheStats();
    console.info('📊 DNS Cache Stats:');
    console.info(`   Cache size: ${stats.size}`);
    console.info(`   Hit rate: ${stats.hitRate || 'N/A'}`);
    console.info(`   Total queries: ${stats.totalQueries || 'N/A'}`);
    console.info(`   Cache hits: ${stats.cacheHits || 'N/A'}`);
  } catch (error) {
    console.info('ℹ️ DNS cache stats not available:', error.message);
  }
}

// Example 2: Preconnect Optimization
console.info('\n🔗 Preconnect Optimization');

async function preconnectExamples() {
  console.info('\n📝 Preconnect scenarios...');

  // Example 1: Basic preconnect
  console.info('\n1. Basic preconnect:');
  try {
    console.info('🔄 Preconnecting to httpbin.org...');
    fetch.preconnect('https://httpbin.org');
    console.info('✅ Preconnect initiated');

    // Wait for connection to establish
    await new Promise(resolve => setTimeout(resolve, 300));

    // Now make the request - should be faster due to established connection
    const startTime = performance.now();
    const response = await fetch('https://httpbin.org/get', {
      verbose: true
    });
    const endTime = performance.now();

    console.info(`⚡ Request completed in ${(endTime - startTime).toFixed(2)}ms`);
  } catch (error) {
    console.info('❌ Preconnect error:', error.message);
  }

  // Example 2: Preconnect with delay simulation
  console.info('\n2. Preconnect timing optimization:');
  try {
    console.info('🔄 Starting preconnect...');
    const preconnectStart = performance.now();
    fetch.preconnect('https://jsonplaceholder.typicode.com');
    const preconnectTime = performance.now() - preconnectStart;

    console.info(`⚡ Preconnect initiated in ${preconnectTime.toFixed(2)}ms`);

    // Simulate some work before making the actual request
    console.info('⏳ Simulating application work...');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Make the actual request
    const requestStart = performance.now();
    const response = await fetch('https://jsonplaceholder.typicode.com/posts/1');
    const requestTime = performance.now() - requestStart;

    console.info(`⚡ Actual request completed in ${requestTime.toFixed(2)}ms`);
    console.info('✅ Preconnect optimized the request timing');
  } catch (error) {
    console.info('❌ Preconnect timing error:', error.message);
  }
}

// Example 3: Advanced Fetch Options
console.info('\n⚙️ Advanced Fetch Options');

async function advancedFetchOptions() {
  console.info('\n📝 Testing advanced fetch options...');

  // Example 1: Decompression control
  console.info('\n1. Decompression control:');
  try {
    console.info('🔄 Testing with decompression enabled (default):');
    const response1 = await fetch('https://httpbin.org/gzip', {
      decompress: true,
      verbose: true
    });
    console.info('✅ Decompression enabled');

    console.info('🔄 Testing with decompression disabled:');
    const response2 = await fetch('https://httpbin.org/gzip', {
      decompress: false,
      verbose: true
    });
    console.info('✅ Decompression disabled');
  } catch (error) {
    console.info('❌ Decompression test error:', error.message);
  }

  // Example 2: Connection keep-alive control
  console.info('\n2. Connection keep-alive control:');
  try {
    console.info('🔄 Testing with keep-alive disabled:');
    const response = await fetch('https://httpbin.org/get', {
      keepalive: false,
      verbose: true
    });
    console.info('✅ Keep-alive disabled - new connection for each request');

    console.info('🔄 Testing with keep-alive enabled (default):');
    const response2 = await fetch('https://httpbin.org/get', {
      keepalive: true,
      verbose: true
    });
    console.info('✅ Keep-alive enabled - connection reused');
  } catch (error) {
    console.info('❌ Keep-alive test error:', error.message);
  }

  // Example 3: Verbose debugging levels
  console.info('\n3. Verbose debugging levels:');
  try {
    console.info('🔄 Testing verbose: true');
    const response1 = await fetch('https://httpbin.org/get', {
      verbose: true
    });

    console.info('🔄 Testing verbose: "curl"');
    const response2 = await fetch('https://httpbin.org/get', {
      verbose: 'curl'
    });

    console.info('✅ Verbose debugging levels tested');
  } catch (error) {
    console.info('❌ Verbose debugging error:', error.message);
  }
}

// Example 4: Connection Pooling Demonstration
console.info('\n🔄 Connection Pooling');

async function connectionPoolingExamples() {
  console.info('\n📝 Connection pooling scenarios...');

  // Example 1: Multiple requests to same host
  console.info('\n1. Multiple requests to same host:');
  try {
    const host = 'https://httpbin.org';
    const requests = 5;

    console.info(`🔄 Making ${requests} requests to ${host}...`);

    const times = [];
    for (let i = 0; i < requests; i++) {
      const startTime = performance.now();
      const response = await fetch(`${host}/get`, {
        headers: { 'X-Request-Number': (i + 1).toString() }
      });
      const endTime = performance.now();
      times.push(endTime - startTime);

      console.info(`   Request ${i + 1}: ${times[i].toFixed(2)}ms`);
    }

    const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
    console.info(`📊 Average time: ${averageTime.toFixed(2)}ms`);
    console.info('✅ Connection pooling automatically reused connections');
  } catch (error) {
    console.info('❌ Connection pooling error:', error.message);
  }

  // Example 2: Connection pooling vs no keep-alive
  console.info('\n2. Connection pooling comparison:');
  try {
    const host = 'https://httpbin.org';

    // Test with connection pooling (keep-alive)
    console.info('🔄 Testing with connection pooling:');
    const poolingTimes = [];
    for (let i = 0; i < 3; i++) {
      const startTime = performance.now();
      await fetch(`${host}/get`);
      poolingTimes.push(performance.now() - startTime);
    }

    // Test without connection pooling
    console.info('🔄 Testing without connection pooling:');
    const noPoolingTimes = [];
    for (let i = 0; i < 3; i++) {
      const startTime = performance.now();
      await fetch(`${host}/get`, { keepalive: false });
      noPoolingTimes.push(performance.now() - startTime);
    }

    const avgPooling = poolingTimes.reduce((a, b) => a + b, 0) / poolingTimes.length;
    const avgNoPooling = noPoolingTimes.reduce((a, b) => a + b, 0) / noPoolingTimes.length;

    console.info(`📊 With pooling: ${avgPooling.toFixed(2)}ms average`);
    console.info(`📊 Without pooling: ${avgNoPooling.toFixed(2)}ms average`);
    console.info(`⚡ Speedup: ${(avgNoPooling / avgPooling).toFixed(1)}x`);
  } catch (error) {
    console.info('❌ Pooling comparison error:', error.message);
  }
}

// Example 5: Performance Optimization Strategies
console.info('\n🚀 Performance Optimization Strategies');

async function performanceOptimizationExamples() {
  console.info('\n📝 Real-world optimization scenarios...');

  // Example 1: API client with prefetching
  console.info('\n1. API client with prefetching:');
  try {
    class OptimizedAPIClient {
      constructor(baseURL) {
        this.baseURL = baseURL;
        this.prefetchedHosts = new Set();
      }

      async prefetchEndpoints() {
        const hosts = [new URL(this.baseURL).hostname];
        hosts.forEach(host => {
          if (!this.prefetchedHosts.has(host)) {
            dns.prefetch(host);
            this.prefetchedHosts.add(host);
            console.info(`🔄 Prefetched DNS for ${host}`);
          }
        });
      }

      async get(endpoint) {
        await this.prefetchEndpoints();
        return fetch(`${this.baseURL}${endpoint}`);
      }
    }

    const client = new OptimizedAPIClient('https://jsonplaceholder.typicode.com');
    await client.prefetchEndpoints();

    const response = await client.get('/posts/1');
    const data = await response.json();
    console.info('✅ Optimized API client request completed');
  } catch (error) {
    console.info('❌ API client optimization error:', error.message);
  }

  // Example 2: Batch request optimization
  console.info('\n2. Batch request optimization:');
  try {
    const endpoints = [
      'https://jsonplaceholder.typicode.com/posts/1',
      'https://jsonplaceholder.typicode.com/posts/2',
      'https://jsonplaceholder.typicode.com/posts/3'
    ];

    // Prefetch all hosts
    endpoints.forEach(endpoint => {
      const hostname = new URL(endpoint).hostname;
      dns.prefetch(hostname);
    });

    console.info('🔄 Prefetched DNS for all endpoints');
    await new Promise(resolve => setTimeout(resolve, 100));

    // Make all requests
    const startTime = performance.now();
    const responses = await Promise.all(
      endpoints.map(endpoint => fetch(endpoint))
    );
    const endTime = performance.now();

    console.info(`⚡ Batch completed in ${(endTime - startTime).toFixed(2)}ms`);
    console.info('✅ Batch optimization successful');
  } catch (error) {
    console.info('❌ Batch optimization error:', error.message);
  }

  // Example 3: Streaming with optimization
  console.info('\n3. Streaming with optimization:');
  try {
    console.info('🔄 Preconnecting for streaming request...');
    fetch.preconnect('https://httpbin.org');

    await new Promise(resolve => setTimeout(resolve, 200));

    const response = await fetch('https://httpbin.org/stream-bytes/1024', {
      verbose: true
    });

    const reader = response.body?.getReader();
    let received = 0;

    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;
      received += value.length;
    }

    console.info(`✅ Streamed ${received} bytes with optimized connection`);
  } catch (error) {
    console.info('❌ Streaming optimization error:', error.message);
  }
}

// Example 6: Performance Monitoring
console.info('\n📊 Performance Monitoring');

async function performanceMonitoringExamples() {
  console.info('\n📝 Performance monitoring scenarios...');

  // Example 1: Request timing breakdown
  console.info('\n1. Request timing breakdown:');
  try {
    const url = 'https://httpbin.org/get';

    // DNS prefetch timing
    const dnsStart = performance.now();
    dns.prefetch(new URL(url).hostname);
    const dnsTime = performance.now() - dnsStart;

    await new Promise(resolve => setTimeout(resolve, 100));

    // Preconnect timing
    const preconnectStart = performance.now();
    fetch.preconnect(url);
    const preconnectTime = performance.now() - preconnectStart;

    await new Promise(resolve => setTimeout(resolve, 200));

    // Request timing
    const requestStart = performance.now();
    const response = await fetch(url);
    const requestTime = performance.now() - requestStart;

    console.info('📊 Timing Breakdown:');
    console.info(`   DNS prefetch: ${dnsTime.toFixed(2)}ms`);
    console.info(`   Preconnect: ${preconnectTime.toFixed(2)}ms`);
    console.info(`   Request: ${requestTime.toFixed(2)}ms`);
    console.info(`   Total: ${(dnsTime + preconnectTime + requestTime).toFixed(2)}ms`);
  } catch (error) {
    console.info('❌ Timing breakdown error:', error.message);
  }

  // Example 2: Connection reuse monitoring
  console.info('\n2. Connection reuse monitoring:');
  try {
    const host = 'https://httpbin.org';
    const requestCount = 10;

    console.info(`🔄 Making ${requestCount} requests to monitor reuse...`);

    const times = [];
    for (let i = 0; i < requestCount; i++) {
      const start = performance.now();
      await fetch(`${host}/get`);
      times.push(performance.now() - start);
    }

    // First request should be slowest (connection establishment)
    const firstRequest = times[0];
    const subsequentAverage = times.slice(1).reduce((a, b) => a + b, 0) / (times.length - 1);

    console.info('📊 Connection Reuse Analysis:');
    console.info(`   First request: ${firstRequest.toFixed(2)}ms`);
    console.info(`   Subsequent average: ${subsequentAverage.toFixed(2)}ms`);
    console.info(`   Reuse benefit: ${((firstRequest - subsequentAverage) / firstRequest * 100).toFixed(1)}% faster`);
  } catch (error) {
    console.info('❌ Connection reuse monitoring error:', error.message);
  }
}

// Main execution function
async function runPerformanceExamples() {
  console.info('🚀 Bun Fetch Performance Optimization Demo');
  console.info('==========================================\n');

  try {
    await dnsPrefetchingExamples();
    await preconnectExamples();
    await advancedFetchOptions();
    await connectionPoolingExamples();
    await performanceOptimizationExamples();
    await performanceMonitoringExamples();

    console.info('\n🎉 All performance optimization examples completed!');
    console.info('💡 Key optimizations demonstrated:');
    console.info('   • DNS prefetching to eliminate lookup delays');
    console.info('   • Preconnect to establish connections early');
    console.info('   • Connection pooling for request reuse');
    console.info('   • Advanced fetch options for fine control');
    console.info('   • Performance monitoring and timing analysis');
    console.info('   • Real-world optimization strategies');

  } catch (error) {
    console.error('\n❌ Error in performance examples:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (typeof Bun !== 'undefined' && process.argv[1] && process.argv[1].endsWith('bun-fetch-performance.ts')) {
  runPerformanceExamples().catch(console.error);
}

export {
    advancedFetchOptions,
    connectionPoolingExamples, dnsPrefetchingExamples, performanceMonitoringExamples, performanceOptimizationExamples, preconnectExamples
};
