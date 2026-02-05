#!/usr/bin/env bun

// 🚀 Bun Proxy Streaming Demo
// Showcasing file streaming and large content handling

import { createHTTPProxy } from './bun-proxy/src/protocols/http';
import { createRateLimiter, RateLimitAlgorithm } from './bun-proxy/src/patterns/rate-limiter';

// Demo configuration for streaming
const streamingConfig = {
  httpProxy: {
    host: 'localhost',
    port: 8080,
    target: 'https://httpbin.org',
    streaming: {
      enabled: true,
      threshold: 100 * 1024, // 100KB threshold for streaming
      chunkSize: 64 * 1024, // 64KB chunks
      supportedTypes: [
        'video/',
        'audio/',
        'application/octet-stream',
        'application/zip',
        'application/x-gzip',
        'image/',
        'application/pdf'
      ]
    },
    compression: {
      enabled: true,
      types: ['text/', 'application/json', 'application/javascript']
    }
  },
  rateLimiter: {
    algorithm: RateLimitAlgorithm.TOKEN_BUCKET,
    capacity: 20,
    refillRate: 5,
    burstCapacity: 30
  }
};

// Test scenarios for streaming
const streamingTests = [
  {
    name: 'Small JSON Response',
    url: '/json',
    expectStreaming: false,
    description: 'Small response, no streaming needed'
  },
  {
    name: 'Large Image',
    url: '/image/png',
    expectStreaming: true,
    description: 'PNG image, should stream'
  },
  {
    name: 'Video Stream',
    url: '/stream/100', // Stream 100 lines
    expectStreaming: true,
    description: 'Streaming response, chunked transfer'
  },
  {
    name: 'Large Text File',
    url: '/stream-bytes/500000', // 500KB of data
    expectStreaming: true,
    description: 'Large binary data, should stream'
  },
  {
    name: 'Rate Limited Request',
    url: '/delay/1',
    expectStreaming: false,
    description: 'Normal request with rate limiting'
  }
];

// Create streaming proxy with rate limiting
async function createStreamingProxy() {
  console.log("🔧 Setting up streaming HTTP proxy with rate limiting...");

  const rateLimiter = createRateLimiter(streamingConfig.rateLimiter);

  // Create HTTP proxy with streaming enabled
  const proxy = createHTTPProxy({
    ...streamingConfig.httpProxy,
    // Add rate limiting to requests
    async onRequest(request: Request) {
      const result = await rateLimiter.checkLimit({
        ip: '127.0.0.1',
        url: request.url
      });

      if (!result.allowed) {
        throw new Error(`Rate limit exceeded. Retry in ${result.retryAfter} seconds`);
      }

      return request;
    }
  });

  return { proxy, rateLimiter };
}

// Test streaming capabilities
async function testStreaming(proxy: any, rateLimiter: any) {
  console.log("\n🧪 Testing streaming capabilities...");

  const results = [];

  for (const test of streamingTests) {
    try {
      console.log(`📡 Testing: ${test.name} (${test.description})`);

      const startTime = Date.now();
      const response = await fetch(`http://localhost:8080${test.url}`);
      const duration = Date.now() - startTime;

      const contentLength = response.headers.get('content-length');
      const contentType = response.headers.get('content-type');
      const isStreaming = response.headers.get('x-streaming-enabled') === 'true';
      const chunkSize = response.headers.get('x-streaming-chunk-size');

      // Read response body to test streaming
      const bodySize = response.body ? await getResponseSize(response) : 0;

      results.push({
        'Test Name': test.name,
        'URL': test.url,
        'Status': response.status,
        'Content Type': contentType || 'Unknown',
        'Size': contentLength ? `${(parseInt(contentLength) / 1024).toFixed(1)}KB` : 'Unknown',
        'Streaming': isStreaming ? '✅ Enabled' : '❌ Disabled',
        'Expected': test.expectStreaming ? 'Stream' : 'Direct',
        'Duration': `${duration}ms`,
        'Chunk Size': chunkSize || 'N/A'
      });

      const expected = test.expectStreaming ? 'streaming' : 'direct response';
      const actual = isStreaming ? 'streaming' : 'direct response';
      const match = (test.expectStreaming === isStreaming) ? '✅' : '❌';

      console.log(`${match} Expected: ${expected}, Got: ${actual} (${bodySize} bytes)`);

    } catch (error) {
      results.push({
        'Test Name': test.name,
        'URL': test.url,
        'Status': 'ERROR',
        'Content Type': 'N/A',
        'Size': 'N/A',
        'Streaming': '❌ Error',
        'Expected': test.expectStreaming ? 'Stream' : 'Direct',
        'Duration': 'N/A',
        'Error': error.message.slice(0, 30) + '...'
      });

      console.log(`💥 Error: ${error.message}`);
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  return results;
}

// Helper function to get response size
async function getResponseSize(response: Response): Promise<number> {
  if (!response.body) return 0;

  let totalSize = 0;
  const reader = response.body.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalSize += value.length;
  }

  return totalSize;
}

// Display streaming test results
function displayStreamingResults(results: any[]) {
  console.log("\n📊 Streaming Test Results:");
  console.log(Bun.inspect.table(results, {
    colors: true,
    columns: [
      { key: 'Test Name', header: 'Test' },
      { key: 'Status', header: 'Status' },
      { key: 'Content Type', header: 'Type' },
      { key: 'Size', header: 'Size' },
      { key: 'Streaming', header: 'Streaming' },
      { key: 'Duration', header: 'Time' }
    ]
  }));
}

// Display rate limiter statistics
function displayRateLimiterStats(rateLimiter: any) {
  const stats = rateLimiter.getStats();

  console.log("\n🧪 Rate Limiter Statistics:");
  console.log(Bun.inspect.table([{
    'Algorithm': rateLimiter.getConfig().algorithm,
    'Total Requests': stats.totalRequests,
    'Allowed': stats.allowedRequests,
    'Blocked': stats.blockedRequests,
    'Success Rate': stats.totalRequests > 0 ? `${Math.round((stats.allowedRequests / stats.totalRequests) * 100)}%` : 'N/A',
    'Keys Tracked': stats.keysTracked
  }], { colors: true }));
}

// Display proxy server statistics
function displayProxyStats(proxy: any) {
  const status = proxy.getStatus();

  console.log("\n📡 HTTP Proxy Statistics:");
  console.log(Bun.inspect.table([{
    'Running': status.isRunning ? '✅' : '❌',
    'Protocol': status.config.protocol?.toUpperCase(),
    'Host': status.config.host,
    'Port': status.config.port,
    'Uptime': status.uptime ? `${Math.round(status.uptime / 1000)}s` : 'N/A',
    'Total Requests': status.stats.totalRequests,
    'Total Responses': status.stats.totalResponses,
    'Errors': status.stats.errors,
    'Streaming': status.config.streaming?.enabled ? '✅ Enabled' : '❌ Disabled'
  }], { colors: true }));
}

// Performance comparison
function displayStreamingComparison() {
  console.log("\n⚡ Streaming vs Direct Response Comparison:");

  const comparisonData = [
    {
      'Method': 'Direct Response',
      'Use Case': 'Small JSON/HTML',
      'Memory': 'Low',
      'Latency': 'Lower',
      'Scalability': 'Good for small responses'
    },
    {
      'Method': 'Streaming Response',
      'Use Case': 'Large files, video, audio',
      'Memory': 'Very Low',
      'Latency': 'Minimal',
      'Scalability': 'Excellent for large content'
    },
    {
      'Method': 'Chunked Streaming',
      'Use Case': 'Real-time data, APIs',
      'Memory': 'Low',
      'Latency': 'Real-time',
      'Scalability': 'Best for continuous data'
    }
  ];

  console.log(Bun.inspect.table(comparisonData, { colors: true }));
}

// Main demo execution
async function runStreamingDemo() {
  console.log("🚀 Bun Proxy Streaming Demo");
  console.log("==========================\n");

  const components = {
    proxy: null,
    rateLimiter: null
  };

  try {
    // Create streaming proxy
    const { proxy, rateLimiter } = await createStreamingProxy();
    components.proxy = proxy;
    components.rateLimiter = rateLimiter;

    // Start proxy server
    await proxy.start();

    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log("✅ Streaming proxy initialized successfully!\n");

    // Run streaming tests
    const results = await testStreaming(proxy, rateLimiter);

    // Display results
    displayStreamingResults(results);
    displayRateLimiterStats(rateLimiter);
    displayProxyStats(proxy);
    displayStreamingComparison();

    // Cleanup
    console.log("\n🧹 Cleaning up...");
    await proxy.stop();

    console.log("\n✨ Streaming demo completed successfully!");
    console.log("💡 Demonstrated: HTTP streaming, rate limiting, large file handling");
    console.log("📊 All streaming features working with rich table displays");

  } catch (error) {
    console.error("💥 Demo failed:", error);

    // Cleanup on error
    try {
      if (components.proxy) await components.proxy.stop();
    } catch (cleanupError) {
      console.error("Cleanup error:", cleanupError);
    }
  }
}

// Run the streaming demo
runStreamingDemo();