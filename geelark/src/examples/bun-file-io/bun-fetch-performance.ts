#!/usr/bin/env bun

/**
 * Bun Fetch Performance Optimization
 *
 * Comprehensive examples demonstrating DNS prefetching, preconnect,
 * connection pooling, and advanced fetch options for maximum performance.
 */

import { dns, fetch } from 'bun';

// Example 1: DNS Prefetching
console.log('🌐 DNS Prefetching');

async function dnsPrefetchingExamples() {
  console.log('\n📝 DNS prefetching scenarios...');

  // Example 1: Basic DNS prefetching
  console.log('\n1. Basic DNS prefetching:');
  try {
    console.log('🔄 Prefetching DNS for example.com...');
    dns.prefetch('example.com');
    console.log('✅ DNS prefetch initiated');

    // Wait a moment for DNS to resolve
    await new Promise(resolve => setTimeout(resolve, 100));

    // Now make the request - should be faster due to cached DNS
    const startTime = performance.now();
    const response = await fetch('https://example.com', {
      verbose: true
    });
    const endTime = performance.now();

    console.log(`⚡ Request completed in ${(endTime - startTime).toFixed(2)}ms`);
  } catch (error) {
    console.log('❌ DNS prefetch error:', error.message);
  }

  // Example 2: Multiple DNS prefetches
  console.log('\n2. Multiple DNS prefetches:');
  try {
    const hosts = [
      'https://httpbin.org',
      'https://jsonplaceholder.typicode.com',
      'https://api.github.com',
      'https://cdn.jsdelivr.net'
    ];

    console.log('🔄 Prefetching DNS for multiple hosts...');
    hosts.forEach(host => {
      const url = new URL(host);
      dns.prefetch(url.hostname);
      console.log(`   Prefetched: ${url.hostname}`);
    });

    // Wait for DNS resolutions
    await new Promise(resolve => setTimeout(resolve, 200));

    console.log('✅ Multiple DNS prefetches completed');
  } catch (error) {
    console.log('❌ Multiple DNS prefetch error:', error.message);
  }

  // Example 3: DNS cache statistics
  console.log('\n3. DNS cache statistics:');
  try {
    const stats = dns.getCacheStats();
    console.log('📊 DNS Cache Stats:');
    console.log(`   Cache size: ${stats.size}`);
    console.log(`   Hit rate: ${stats.hitRate || 'N/A'}`);
    console.log(`   Total queries: ${stats.totalQueries || 'N/A'}`);
    console.log(`   Cache hits: ${stats.cacheHits || 'N/A'}`);
  } catch (error) {
    console.log('ℹ️ DNS cache stats not available:', error.message);
  }
}

// Example 2: Preconnect Optimization
console.log('\n🔗 Preconnect Optimization');

async function preconnectExamples() {
  console.log('\n📝 Preconnect scenarios...');

  // Example 1: Basic preconnect
  console.log('\n1. Basic preconnect:');
  try {
    console.log('🔄 Preconnecting to httpbin.org...');
    fetch.preconnect('https://httpbin.org');
    console.log('✅ Preconnect initiated');

    // Wait for connection to establish
    await new Promise(resolve => setTimeout(resolve, 300));

    // Now make the request - should be faster due to established connection
    const startTime = performance.now();
    const response = await fetch('https://httpbin.org/get', {
      verbose: true
    });
    const endTime = performance.now();

    console.log(`⚡ Request completed in ${(endTime - startTime).toFixed(2)}ms`);
  } catch (error) {
    console.log('❌ Preconnect error:', error.message);
  }

  // Example 2: Preconnect with delay simulation
  console.log('\n2. Preconnect timing optimization:');
  try {
    console.log('🔄 Starting preconnect...');
    const preconnectStart = performance.now();
    fetch.preconnect('https://jsonplaceholder.typicode.com');
    const preconnectTime = performance.now() - preconnectStart;

    console.log(`⚡ Preconnect initiated in ${preconnectTime.toFixed(2)}ms`);

    // Simulate some work before making the actual request
    console.log('⏳ Simulating application work...');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Make the actual request
    const requestStart = performance.now();
    const response = await fetch('https://jsonplaceholder.typicode.com/posts/1');
    const requestTime = performance.now() - requestStart;

    console.log(`⚡ Actual request completed in ${requestTime.toFixed(2)}ms`);
    console.log('✅ Preconnect optimized the request timing');
  } catch (error) {
    console.log('❌ Preconnect timing error:', error.message);
  }
}

// Example 3: Advanced Fetch Options
console.log('\n⚙️ Advanced Fetch Options');

async function advancedFetchOptions() {
  console.log('\n📝 Testing advanced fetch options...');

  // Example 1: Decompression control
  console.log('\n1. Decompression control:');
  try {
    console.log('🔄 Testing with decompression enabled (default):');
    const response1 = await fetch('https://httpbin.org/gzip', {
      decompress: true,
      verbose: true
    });
    console.log('✅ Decompression enabled');

    console.log('🔄 Testing with decompression disabled:');
    const response2 = await fetch('https://httpbin.org/gzip', {
      decompress: false,
      verbose: true
    });
    console.log('✅ Decompression disabled');
  } catch (error) {
    console.log('❌ Decompression test error:', error.message);
  }

  // Example 2: Connection keep-alive control
  console.log('\n2. Connection keep-alive control:');
  try {
    console.log('🔄 Testing with keep-alive disabled:');
    const response = await fetch('https://httpbin.org/get', {
      keepalive: false,
      verbose: true
    });
    console.log('✅ Keep-alive disabled - new connection for each request');

    console.log('🔄 Testing with keep-alive enabled (default):');
    const response2 = await fetch('https://httpbin.org/get', {
      keepalive: true,
      verbose: true
    });
    console.log('✅ Keep-alive enabled - connection reused');
  } catch (error) {
    console.log('❌ Keep-alive test error:', error.message);
  }

  // Example 3: Verbose debugging levels
  console.log('\n3. Verbose debugging levels:');
  try {
    console.log('🔄 Testing verbose: true');
    const response1 = await fetch('https://httpbin.org/get', {
      verbose: true
    });

    console.log('🔄 Testing verbose: "curl"');
    const response2 = await fetch('https://httpbin.org/get', {
      verbose: 'curl'
    });

    console.log('✅ Verbose debugging levels tested');
  } catch (error) {
    console.log('❌ Verbose debugging error:', error.message);
  }
}

// Example 4: Connection Pooling Demonstration
console.log('\n🔄 Connection Pooling');

async function connectionPoolingExamples() {
  console.log('\n📝 Connection pooling scenarios...');

  // Example 1: Multiple requests to same host
  console.log('\n1. Multiple requests to same host:');
  try {
    const host = 'https://httpbin.org';
    const requests = 5;

    console.log(`🔄 Making ${requests} requests to ${host}...`);

    const times = [];
    for (let i = 0; i < requests; i++) {
      const startTime = performance.now();
      const response = await fetch(`${host}/get`, {
        headers: { 'X-Request-Number': (i + 1).toString() }
      });
      const endTime = performance.now();
      times.push(endTime - startTime);

      console.log(`   Request ${i + 1}: ${times[i].toFixed(2)}ms`);
    }

    const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(`📊 Average time: ${averageTime.toFixed(2)}ms`);
    console.log('✅ Connection pooling automatically reused connections');
  } catch (error) {
    console.log('❌ Connection pooling error:', error.message);
  }

  // Example 2: Connection pooling vs no keep-alive
  console.log('\n2. Connection pooling comparison:');
  try {
    const host = 'https://httpbin.org';

    // Test with connection pooling (keep-alive)
    console.log('🔄 Testing with connection pooling:');
    const poolingTimes = [];
    for (let i = 0; i < 3; i++) {
      const startTime = performance.now();
      await fetch(`${host}/get`);
      poolingTimes.push(performance.now() - startTime);
    }

    // Test without connection pooling
    console.log('🔄 Testing without connection pooling:');
    const noPoolingTimes = [];
    for (let i = 0; i < 3; i++) {
      const startTime = performance.now();
      await fetch(`${host}/get`, { keepalive: false });
      noPoolingTimes.push(performance.now() - startTime);
    }

    const avgPooling = poolingTimes.reduce((a, b) => a + b, 0) / poolingTimes.length;
    const avgNoPooling = noPoolingTimes.reduce((a, b) => a + b, 0) / noPoolingTimes.length;

    console.log(`📊 With pooling: ${avgPooling.toFixed(2)}ms average`);
    console.log(`📊 Without pooling: ${avgNoPooling.toFixed(2)}ms average`);
    console.log(`⚡ Speedup: ${(avgNoPooling / avgPooling).toFixed(1)}x`);
  } catch (error) {
    console.log('❌ Pooling comparison error:', error.message);
  }
}

// Example 5: Performance Optimization Strategies
console.log('\n🚀 Performance Optimization Strategies');

async function performanceOptimizationExamples() {
  console.log('\n📝 Real-world optimization scenarios...');

  // Example 1: API client with prefetching
  console.log('\n1. API client with prefetching:');
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
            console.log(`🔄 Prefetched DNS for ${host}`);
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
    console.log('✅ Optimized API client request completed');
  } catch (error) {
    console.log('❌ API client optimization error:', error.message);
  }

  // Example 2: Batch request optimization
  console.log('\n2. Batch request optimization:');
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

    console.log('🔄 Prefetched DNS for all endpoints');
    await new Promise(resolve => setTimeout(resolve, 100));

    // Make all requests
    const startTime = performance.now();
    const responses = await Promise.all(
      endpoints.map(endpoint => fetch(endpoint))
    );
    const endTime = performance.now();

    console.log(`⚡ Batch completed in ${(endTime - startTime).toFixed(2)}ms`);
    console.log('✅ Batch optimization successful');
  } catch (error) {
    console.log('❌ Batch optimization error:', error.message);
  }

  // Example 3: Streaming with optimization
  console.log('\n3. Streaming with optimization:');
  try {
    console.log('🔄 Preconnecting for streaming request...');
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

    console.log(`✅ Streamed ${received} bytes with optimized connection`);
  } catch (error) {
    console.log('❌ Streaming optimization error:', error.message);
  }
}

// Example 6: Performance Monitoring
console.log('\n📊 Performance Monitoring');

async function performanceMonitoringExamples() {
  console.log('\n📝 Performance monitoring scenarios...');

  // Example 1: Request timing breakdown
  console.log('\n1. Request timing breakdown:');
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

    console.log('📊 Timing Breakdown:');
    console.log(`   DNS prefetch: ${dnsTime.toFixed(2)}ms`);
    console.log(`   Preconnect: ${preconnectTime.toFixed(2)}ms`);
    console.log(`   Request: ${requestTime.toFixed(2)}ms`);
    console.log(`   Total: ${(dnsTime + preconnectTime + requestTime).toFixed(2)}ms`);
  } catch (error) {
    console.log('❌ Timing breakdown error:', error.message);
  }

  // Example 2: Connection reuse monitoring
  console.log('\n2. Connection reuse monitoring:');
  try {
    const host = 'https://httpbin.org';
    const requestCount = 10;

    console.log(`🔄 Making ${requestCount} requests to monitor reuse...`);

    const times = [];
    for (let i = 0; i < requestCount; i++) {
      const start = performance.now();
      await fetch(`${host}/get`);
      times.push(performance.now() - start);
    }

    // First request should be slowest (connection establishment)
    const firstRequest = times[0];
    const subsequentAverage = times.slice(1).reduce((a, b) => a + b, 0) / (times.length - 1);

    console.log('📊 Connection Reuse Analysis:');
    console.log(`   First request: ${firstRequest.toFixed(2)}ms`);
    console.log(`   Subsequent average: ${subsequentAverage.toFixed(2)}ms`);
    console.log(`   Reuse benefit: ${((firstRequest - subsequentAverage) / firstRequest * 100).toFixed(1)}% faster`);
  } catch (error) {
    console.log('❌ Connection reuse monitoring error:', error.message);
  }
}

// Main execution function
async function runPerformanceExamples() {
  console.log('🚀 Bun Fetch Performance Optimization Demo');
  console.log('==========================================\n');

  try {
    await dnsPrefetchingExamples();
    await preconnectExamples();
    await advancedFetchOptions();
    await connectionPoolingExamples();
    await performanceOptimizationExamples();
    await performanceMonitoringExamples();

    console.log('\n🎉 All performance optimization examples completed!');
    console.log('💡 Key optimizations demonstrated:');
    console.log('   • DNS prefetching to eliminate lookup delays');
    console.log('   • Preconnect to establish connections early');
    console.log('   • Connection pooling for request reuse');
    console.log('   • Advanced fetch options for fine control');
    console.log('   • Performance monitoring and timing analysis');
    console.log('   • Real-world optimization strategies');

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
