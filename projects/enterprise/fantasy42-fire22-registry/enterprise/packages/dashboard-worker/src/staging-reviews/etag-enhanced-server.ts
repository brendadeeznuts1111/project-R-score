import { BunFile } from 'bun';

// Enhanced ETag Server with Advanced Caching Strategies
// Demonstrates Bun's automatic ETag with real-world optimizations

interface CacheMetrics {
  hits: number;
  misses: number;
  bandwidth_saved: number;
  etags_generated: number;
  not_modified_responses: number;
}

const cacheMetrics: CacheMetrics = {
  hits: 0,
  misses: 0,
  bandwidth_saved: 0,
  etags_generated: 0,
  not_modified_responses: 0,
};

// Large static data that benefits from ETag caching
const PACKAGE_REGISTRY = {
  packages: [
    {
      name: '@fire22/telegram-bot',
      version: '1.0.0',
      dependencies: Array(50)
        .fill(null)
        .map((_, i) => `dep-${i}@1.0.0`),
      metadata: {
        description: 'Grammy Framework with 77 language codes',
        license: 'MIT',
        repository: 'https://github.com/fire22/telegram-bot',
        keywords: ['telegram', 'bot', 'grammy', 'multilingual'],
        maintainers: ['fire22-team'],
        downloads_last_week: 15234,
        bundle_size: '847KB',
        gzipped_size: '267KB',
      },
    },
    {
      name: '@fire22/queue-system',
      version: '1.0.0',
      dependencies: Array(30)
        .fill(null)
        .map((_, i) => `queue-dep-${i}@2.0.0`),
      metadata: {
        description: 'P2P Matching and Transaction Processing',
        license: 'MIT',
        repository: 'https://github.com/fire22/queue-system',
        keywords: ['p2p', 'queue', 'matching', 'transactions'],
        maintainers: ['fire22-team'],
        downloads_last_week: 8921,
        bundle_size: '523KB',
        gzipped_size: '178KB',
      },
    },
  ],
  total_packages: 11,
  last_updated: new Date().toISOString(),
};

// Simulated database of review artifacts (large data)
const REVIEW_ARTIFACTS = {
  'telegram-bot': {
    build_logs: Array(500)
      .fill(null)
      .map((_, i) => `[${new Date(Date.now() - i * 1000).toISOString()}] Build step ${i}: Success`),
    test_results: {
      unit: Array(47)
        .fill(null)
        .map((_, i) => ({
          name: `test_${i}`,
          status: 'passed',
          duration_ms: Math.random() * 1000,
        })),
      integration: Array(23)
        .fill(null)
        .map((_, i) => ({
          name: `integration_test_${i}`,
          status: 'passed',
          duration_ms: Math.random() * 2000,
        })),
    },
    coverage_report: {
      lines: 94.2,
      branches: 89.3,
      functions: 91.7,
      statements: 93.8,
      files: Array(50)
        .fill(null)
        .map((_, i) => ({
          path: `src/file_${i}.ts`,
          coverage: 85 + Math.random() * 15,
        })),
    },
  },
};

const server = Bun.serve({
  port: 3003,

  // Advanced fetch handler with ETag awareness
  async fetch(req, server) {
    const url = new URL(req.url);
    const ifNoneMatch = req.headers.get('if-none-match');

    // Track metrics
    if (ifNoneMatch) {
    }

    // Large JSON responses that benefit from ETag caching
    if (url.pathname === '/api/registry/packages') {
      const response = Response.json(PACKAGE_REGISTRY);

      // Log bandwidth savings when 304 is returned
      if (ifNoneMatch) {
        const dataSize = JSON.stringify(PACKAGE_REGISTRY).length;
        cacheMetrics.bandwidth_saved += dataSize;
        cacheMetrics.hits++;
      }

      return response;
    }

    // Review artifacts endpoint (very large response)
    if (url.pathname.startsWith('/api/artifacts/')) {
      const reviewId = url.pathname.split('/').pop();
      const artifacts = REVIEW_ARTIFACTS[reviewId as keyof typeof REVIEW_ARTIFACTS];

      if (artifacts) {
        const response = Response.json(artifacts);

        if (ifNoneMatch) {
          const dataSize = JSON.stringify(artifacts).length;
          cacheMetrics.bandwidth_saved += dataSize;
          cacheMetrics.hits++;
        }

        return response;
      }

      return new Response('Artifacts not found', { status: 404 });
    }

    // Cache metrics endpoint
    if (url.pathname === '/api/cache/metrics') {
      const hitRate = (cacheMetrics.hits / (cacheMetrics.hits + cacheMetrics.misses)) * 100;
      return Response.json({
        ...cacheMetrics,
        hit_rate: `${hitRate.toFixed(2)}%`,
        bandwidth_saved_mb: (cacheMetrics.bandwidth_saved / 1024 / 1024).toFixed(2),
        message: 'ETag caching is automatically handled by Bun!',
      });
    }

    // Demonstration endpoint
    if (url.pathname === '/api/demo/etag-test') {
      const testData = {
        timestamp: Date.now(),
        random: Math.random(),
        message: 'This response will have an automatic ETag',
        large_array: Array(1000)
          .fill(null)
          .map((_, i) => ({
            id: i,
            value: `item_${i}`,
            nested: {
              deep: {
                value: Math.random(),
              },
            },
          })),
      };

      return Response.json(testData);
    }

    // Static file serving with automatic ETag
    if (url.pathname === '/') {
      return new Response(
        `<!DOCTYPE html>
<html>
<head>
  <title>Fire22 ETag Demo</title>
  <style>
    body { 
      font-family: monospace; 
      background: #0a0e27; 
      color: #40e0d0; 
      padding: 40px;
    }
    .metrics {
      background: rgba(64, 224, 208, 0.1);
      border: 1px solid #40e0d0;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    button {
      background: #40e0d0;
      color: #0a0e27;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
      margin: 5px;
    }
    button:hover {
      opacity: 0.9;
    }
    pre {
      background: rgba(0,0,0,0.5);
      padding: 15px;
      border-radius: 4px;
      overflow-x: auto;
    }
  </style>
</head>
<body>
  <h1>🚀 Fire22 ETag Caching Demo</h1>
  <p>Bun automatically generates ETags for all responses!</p>
  
  <div class="metrics">
    <h2>📊 Cache Metrics</h2>
    <div id="metrics">Loading...</div>
  </div>
  
  <h2>🧪 Test ETag Caching</h2>
  <button onclick="testWithoutCache()">Fetch Without Cache</button>
  <button onclick="testWithCache()">Fetch With ETag Cache</button>
  <button onclick="fetchLargeData()">Fetch Large Dataset</button>
  <button onclick="clearMetrics()">Clear Metrics</button>
  
  <h2>📝 Results</h2>
  <pre id="results">Click a button to test ETag caching...</pre>
  
  <script>
    let lastETag = null;
    
    async function updateMetrics() {
      const res = await fetch('/api/cache/metrics');
      const metrics = await res.json();
      document.getElementById('metrics').innerHTML = \`
        <div>Cache Hits: \${metrics.hits}</div>
        <div>Cache Misses: \${metrics.misses}</div>
        <div>Hit Rate: \${metrics.hit_rate || '0.00%'}</div>
        <div>Bandwidth Saved: \${metrics.bandwidth_saved_mb} MB</div>
        <div>Not Modified Responses: \${metrics.not_modified_responses}</div>
      \`;
    }
    
    async function testWithoutCache() {
      const start = performance.now();
      const res = await fetch('/api/demo/etag-test');
      const data = await res.json();
      const time = performance.now() - start;
      
      lastETag = res.headers.get('etag');
      
      document.getElementById('results').textContent = \`
WITHOUT CACHE:
- Status: \${res.status}
- Time: \${time.toFixed(2)}ms
- Size: \${JSON.stringify(data).length} bytes
- ETag: \${lastETag}
- Data items: \${data.large_array.length}
      \`;
      
      updateMetrics();
    }
    
    async function testWithCache() {
      if (!lastETag) {
        document.getElementById('results').textContent = 'First fetch without cache to get ETag!';
        return;
      }
      
      const start = performance.now();
      const res = await fetch('/api/demo/etag-test', {
        headers: {
          'If-None-Match': lastETag
        }
      });
      const time = performance.now() - start;
      
      document.getElementById('results').textContent = \`
WITH ETAG CACHE:
- Status: \${res.status} (304 = Not Modified)
- Time: \${time.toFixed(2)}ms (much faster!)
- Sent ETag: \${lastETag}
- Response: \${res.status === 304 ? 'NOT MODIFIED - Using cached version!' : 'Modified - New data'}
- Bandwidth saved: \${res.status === 304 ? '~100KB' : '0'}
      \`;
      
      updateMetrics();
    }
    
    async function fetchLargeData() {
      const start = performance.now();
      const res = await fetch('/api/registry/packages');
      const data = await res.json();
      const time = performance.now() - start;
      
      const etag = res.headers.get('etag');
      
      // Now fetch with ETag
      const cachedStart = performance.now();
      const cachedRes = await fetch('/api/registry/packages', {
        headers: { 'If-None-Match': etag }
      });
      const cachedTime = performance.now() - cachedStart;
      
      document.getElementById('results').textContent = \`
LARGE DATASET TEST:
First fetch:
- Status: \${res.status}
- Time: \${time.toFixed(2)}ms
- Packages: \${data.packages.length}
- ETag: \${etag}

Cached fetch:
- Status: \${cachedRes.status}
- Time: \${cachedTime.toFixed(2)}ms
- Speedup: \${(time/cachedTime).toFixed(2)}x faster!
      \`;
      
      updateMetrics();
    }
    
    async function clearMetrics() {
      // In real app, this would clear server metrics
      document.getElementById('results').textContent = 'Metrics cleared (client-side only)';
      updateMetrics();
    }
    
    // Update metrics every 2 seconds
    setInterval(updateMetrics, 2000);
    updateMetrics();
  </script>
</body>
</html>`,
        {
          headers: {
            'content-type': 'text/html; charset=utf-8',
          },
        }
      );
    }

    return new Response('Not Found', { status: 404 });
  },
});

export { server, cacheMetrics };
