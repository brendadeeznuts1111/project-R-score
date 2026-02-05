/**
 * @fileoverview Dashboard Integration Tests
 * @description End-to-end integration testing for trader-analyzer dashboard
 * @module trader-analyzer/test/integration/dashboard.integration.test
 * @version 0.2.0
 */

import { test, expect, describe, beforeAll, afterAll, beforeEach } from 'bun:test';

/**
 * Test Configuration
 */
const TEST_CONFIG = {
  BASE_URL: 'http://localhost:8080',
  PORT: 8080,
  TEST_EVENT_IDS: [
    'nba-lakers-warriors-2024-01-15',
    'nfl-chiefs-ravens-2024-01-28',
    'mlb-yankees-dodgers-2024-10-20',
  ],
  TIMEOUT: 10000, // 10 seconds
};

/**
 * Global setup - Start dashboard server
 */
let serverProcess: ChildProcess | null = null;

beforeAll(async () => {
  try {
    // Start the dashboard server in background
    serverProcess = Bun.spawn([
      'bun', 'run', 'scripts/dashboard-server.ts'
    ], {
      env: {
        ...process.env,
        PORT: TEST_CONFIG.PORT.toString(),
        NODE_ENV: 'test',
        DISABLE_LOGGING: 'true',
      },
      stdout: 'pipe',
      stderr: 'pipe',
    });

    // Wait for server to be ready (listen for "running at" message)
    const serverReady = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Server startup timeout'));
      }, 15000);

      const checkReady = () => {
        // Simple health check
        fetch(`${TEST_CONFIG.BASE_URL}/api/v17/mcp/health`)
          .then((res) => {
            if (res.ok) {
              clearTimeout(timeout);
              resolve(null);
            } else {
              setTimeout(checkReady, 500);
            }
          })
          .catch(() => {
            setTimeout(checkReady, 500);
          });
      };

      checkReady();
    });

    await serverReady;
    console.log(`✅ Dashboard server ready at ${TEST_CONFIG.BASE_URL}`);
  } catch (error) {
    console.error('❌ Failed to start dashboard server:', error);
    throw error;
  }
});

/**
 * Cleanup after all tests
 */
afterAll(async () => {
  if (serverProcess) {
    serverProcess.kill();
    console.log('🛑 Dashboard server stopped');
  }
});

/**
 * Dashboard Integration Test Suite
 */
describe('Trader Analyzer Dashboard Integration', () => {
  
  /**
   * Test 1: Basic Server Connectivity
   */
  test('01 - Server Health Check & Basic Connectivity', async () => {
    const response = await fetch(`${TEST_CONFIG.BASE_URL}/api/v17/mcp/health`, {
      timeout: TEST_CONFIG.TIMEOUT,
    });
    
    expect(response.status).toBe(200);
    
    const health = await response.json();
    expect(health).toHaveProperty('status');
    expect(health.status).toBe('healthy');
    expect(health).toHaveProperty('timestamp');
    expect(health).toHaveProperty('uptime');
    expect(health).toHaveProperty('correlations');
    expect(health.correlations).toHaveProperty('activeEngines');
    expect(health.correlations.activeEngines).toBeGreaterThan(0);
    
    console.log(`✅ Health: ${health.status} (${health.correlations.activeEngines} engines)`);
  });

  /**
   * Test 2: Configuration Endpoint
   */
  test('02 - Configuration Endpoint Access', async () => {
    const response = await fetch(`${TEST_CONFIG.BASE_URL}/config`);
    
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toInclude('application/json');
    
    const config = await response.json();
    expect(config).toHaveProperty('server');
    expect(config.server).toHaveProperty('port', TEST_CONFIG.PORT);
    expect(config).toHaveProperty('dashboard');
    expect(config.dashboard).toHaveProperty('version', '0.2.0');
    expect(config.dashboard).toHaveProperty('features');
    expect(config.dashboard.features.multiLayerGraphs).toBe(true);
    expect(config).toHaveProperty('troubleshooting');
    
    console.log(`✅ Config: v${config.dashboard.version} loaded`);
  });

  /**
   * Test 3: Timeout Testing Functionality
   */
  test('03 - Timeout Testing Endpoints', async () => {
    // Test quick response (500ms)
    const quickResponse = await fetch(`${TEST_CONFIG.BASE_URL}/timeout?duration=500`);
    expect(quickResponse.status).toBe(200);
    
    const quickData = await quickResponse.json();
    expect(quickData.status).toBe('timeout-test-complete');
    expect(quickData.requestedDuration).toBe(500);
    expect(quickData.actualDuration).toBeGreaterThan(400); // Allow some overhead
    expect(quickData.actualDuration).toBeLessThan(800);
    
    // Test error simulation
    const errorResponse = await fetch(`${TEST_CONFIG.BASE_URL}/timeout?error=true&type=network`);
    expect(errorResponse.status).toBe(500); // Network error simulation
    expect(errorResponse.headers.get('x-timeout-type')).toBe('network-error');
    
    // Test main timeout config
    const timeoutConfigResponse = await fetch(`${TEST_CONFIG.BASE_URL}/timeout`);
    expect(timeoutConfigResponse.status).toBe(200);
    
    const timeoutConfig = await timeoutConfigResponse.json();
    expect(timeoutConfig).toHaveProperty('current');
    expect(timeoutConfig.current.apiTimeout).toBeGreaterThan(0);
    expect(timeoutConfig).toHaveProperty('testEndpoints');
    expect(timeoutConfig.testEndpoints).toHaveProperty('Quick (500ms)');
    
    console.log(`✅ Timeout: ${quickData.actualDuration}ms (quick), error simulation OK`);
  });

  /**
   * Test 4: Connection Pool Statistics
   */
  test('04 - Connection Pool Monitoring', async () => {
    const response = await fetch(`${TEST_CONFIG.BASE_URL}/api/v17/connection-pool/stats`);
    
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toInclude('application/json');
    
    const stats = await response.json();
    expect(stats).toHaveProperty('totalSockets');
    expect(stats.totalSockets).toBeGreaterThan(0);
    expect(stats).toHaveProperty('freeSockets');
    expect(stats).toHaveProperty('utilization');
    expect(stats.utilization).toBeGreaterThan(0);
    expect(stats.utilization).toBeLessThan(100);
    
    expect(stats).toHaveProperty('bookmakers');
    expect(Object.keys(stats.bookmakers)).toHaveLength(3); // draftkings, fanduel, bet365
    
    // Validate bookmaker structure
    for (const [bookmaker, data] of Object.entries(stats.bookmakers)) {
      expect(data).toHaveProperty('total');
      expect(data.total).toBeGreaterThan(0);
      expect(data).toHaveProperty('free');
      expect(data.free).toBeGreaterThanOrEqual(0);
      expect(data).toHaveProperty('rejectionRate');
      expect(data.rejectionRate).toBeGreaterThan(0);
      expect(data.rejectionRate).toBeLessThan(0.01);
    }
    
    console.log(`✅ Pool: ${stats.totalSockets} sockets, ${stats.utilization}% utilization`);
  });

  /**
   * Test 5: Multi-Layer Graph Generation
   */
  test('05 - Multi-Layer Graph Generation (NBA)', async () => {
    const eventId = TEST_CONFIG.TEST_EVENT_IDS[0]; // nba-lakers-warriors-2024-01-15
    const requestBody = {
      eventId,
      layers: 'all',
      confidenceThreshold: 0.5,
    };
    
    const response = await fetch(`${TEST_CONFIG.BASE_URL}/api/mcp/tools/research-build-multi-layer-graph`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    expect(response.status).toBe(200);
    
    const result = await response.json();
    expect(result).toHaveProperty('success', true);
    expect(result).toHaveProperty('data');
    expect(result.data).toHaveProperty('nodes');
    expect(Array.isArray(result.data.nodes)).toBe(true);
    expect(result.data.nodes.length).toBeGreaterThan(0);
    
    expect(result.data).toHaveProperty('edges');
    expect(Array.isArray(result.data.edges)).toBe(true);
    expect(result.data.edges.length).toBeGreaterThan(0);
    
    // Validate metadata
    expect(result).toHaveProperty('metadata');
    expect(result.metadata).toHaveProperty('layersProcessed', 4);
    expect(result.metadata.nodes).toBeGreaterThan(0);
    expect(result.metadata.edges).toBeGreaterThan(0);
    expect(result.metadata).toHaveProperty('generatedAt');
    
    // Validate node structure
    const firstNode = result.data.nodes[0];
    expect(firstNode).toHaveProperty('id');
    expect(firstNode.id).toBeString();
    expect(firstNode).toHaveProperty('label');
    expect(firstNode.label).toBeString();
    expect(firstNode).toHaveProperty('layer');
    expect(firstNode.layer).toBeNumber();
    expect(firstNode.layer).toBeGreaterThan(0);
    expect(firstNode.layer).toBeLessThan(5);
    
    // Validate edge structure
    const firstEdge = result.data.edges[0];
    expect(firstEdge).toHaveProperty('source');
    expect(firstEdge.source).toBeString();
    expect(firstEdge).toHaveProperty('target');
    expect(firstEdge.target).toBeString();
    expect(firstEdge).toHaveProperty('layer');
    expect(firstEdge.layer).toBeNumber();
    expect(firstEdge).toHaveProperty('confidence');
    expect(firstEdge.confidence).toBeNumber();
    expect(firstEdge.confidence).toBeGreaterThan(0);
    expect(firstEdge.confidence).toBeLessThanOrEqual(1);
    
    console.log(`✅ NBA Graph: ${result.metadata.nodes} nodes, ${result.metadata.edges} edges`);
  });

  /**
   * Test 6: GraphML Export Functionality
   */
  test('06 - GraphML Export Integration', async () => {
    const eventId = TEST_CONFIG.TEST_EVENT_IDS[0];
    const requestBody = {
      eventId,
      format: 'graphml',
      layout: 'hierarchical',
      includeMetadata: true,
    };
    
    const response = await fetch(`${TEST_CONFIG.BASE_URL}/api/mcp/tools/research-generate-visualization`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toInclude('application/xml');
    
    const graphmlContent = await response.text();
    expect(graphmlContent.length).toBeGreaterThan(100);
    expect(graphmlContent).toInclude('<?xml version="1.0" encoding="UTF-8"?>');
    expect(graphmlContent).toInclude('<graphml');
    expect(graphmlContent).toInclude('<key');
    expect(graphmlContent).toInclude('<graph');
    expect(graphmlContent).toInclude('<node');
    expect(graphmlContent).toInclude('<edge');
    expect(graphmlContent).toInclude('</graphml>');
    
    // Validate GraphML structure
    const nodeCount = (graphmlContent.match(/<node/g) || []).length;
    const edgeCount = (graphmlContent.match(/<edge/g) || []).length;
    
    expect(nodeCount).toBeGreaterThan(0);
    expect(edgeCount).toBeGreaterThan(0);
    
    console.log(`✅ GraphML: ${nodeCount} nodes, ${edgeCount} edges exported`);
  });

  /**
   * Test 7: Cross-Sport Correlation Analysis
   */
  test('07 - Cross-Sport Correlation Graph', async () => {
    const eventId = 'crypto-btc-usd-2024-12-09'; // Crypto event
    const requestBody = {
      eventId,
      layers: [2, 4], // Cross-market (2) and cross-sport (4) only
      confidenceThreshold: 0.7,
    };
    
    const response = await fetch(`${TEST_CONFIG.BASE_URL}/api/mcp/tools/research-build-multi-layer-graph`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    expect(response.status).toBe(200);
    
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.data.layers).toEqual(expect.arrayContaining([2, 4]));
    expect(result.metadata.layersProcessed).toBe(2);
    
    // Validate cross-sport edges exist (layer 4)
    const crossSportEdges = result.data.edges.filter((edge: any) => edge.layer === 4);
    expect(crossSportEdges.length).toBeGreaterThan(0);
    
    // Validate higher confidence threshold
    const highConfidenceEdges = result.data.edges.filter((edge: any) => edge.confidence >= 0.7);
    expect(highConfidenceEdges.length).toBeGreaterThan(0);
    expect(highConfidenceEdges.length).toBeLessThanOrEqual(result.data.edges.length);
    
    console.log(`✅ Cross-sport: ${crossSportEdges.length} layer 4 edges (threshold 0.7)`);
  });

  /**
   * Test 8: Error Handling & Validation
   */
  test('08 - Error Handling & Input Validation', async () => {
    // Test 1: Missing eventId
    const missingEventResponse = await fetch(`${TEST_CONFIG.BASE_URL}/api/mcp/tools/research-build-multi-layer-graph`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        layers: 'all', // Missing eventId
      }),
    });
    
    expect(missingEventResponse.status).toBe(400);
    const missingError = await missingEventResponse.json();
    expect(missingError).toHaveProperty('error');
    expect(missingError.error).toInclude('Event ID');
    
    // Test 2: Invalid JSON
    const invalidJsonResponse = await fetch(`${TEST_CONFIG.BASE_URL}/api/mcp/tools/research-build-multi-layer-graph`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: 'invalid json {',
    });
    
    expect(invalidJsonResponse.status).toBe(400);
    
    // Test 3: Non-existent endpoint
    const notFoundResponse = await fetch(`${TEST_CONFIG.BASE_URL}/api/invalid-endpoint`);
    expect(notFoundResponse.status).toBe(404);
    
    // Test 4: Method not allowed
    const wrongMethodResponse = await fetch(`${TEST_CONFIG.BASE_URL}/api/mcp/tools/research-build-multi-layer-graph`, {
      method: 'GET', // Wrong method
    });
    
    expect(wrongMethodResponse.status).toBe(405);
    
    console.log('✅ All error cases handled: 400, 404, 405');
  });

  /**
   * Test 9: Static Asset Serving
   */
  test('09 - Static Dashboard Assets', async () => {
    const assets = [
      { path: '/', expectedType: 'text/html' },
      { path: '/multi-layer-graph.html', expectedType: 'text/html' },
      { path: '/config', expectedType: 'application/json' },
      { path: '/timeout', expectedType: 'application/json' },
      { path: '/dashboard/multi-layer-graph.manifest.json', expectedType: 'application/json' },
    ];
    
    for (const asset of assets) {
      const response = await fetch(`${TEST_CONFIG.BASE_URL}${asset.path}`);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toInclude(asset.expectedType);
      
      // Check security headers
      expect(response.headers.get('x-frame-options')).toBe('DENY');
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
      
      // Check CORS for API endpoints
      if (asset.path.startsWith('/api/') || asset.path === '/config' || asset.path === '/timeout') {
        expect(response.headers.get('access-control-allow-origin')).toBe('*');
      }
      
      console.log(`✅ Asset: ${asset.path} (${asset.expectedType})`);
    }
  });

  /**
   * Test 10: Performance & Load Testing
   */
  test('10 - Performance Under Load', async () => {
    const concurrentRequests = 5;
    const eventId = TEST_CONFIG.TEST_EVENT_IDS[0];
    
    // Create concurrent graph generation requests
    const promises = Array.from({ length: concurrentRequests }, async (_, index) => {
      const startTime = performance.now();
      
      const response = await fetch(`${TEST_CONFIG.BASE_URL}/api/mcp/tools/research-build-multi-layer-graph`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId,
          layers: 'all',
          clientId: `test-client-${index}`, // Unique identifier
        }),
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(5000); // Should complete in < 5 seconds
      
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.data.nodes.length).toBeGreaterThan(0);
      
      return { index, duration, nodes: result.data.nodes.length };
    });
    
    const results = await Promise.all(promises);
    
    // All requests should succeed
    expect(results.length).toBe(concurrentRequests);
    
    // Calculate average response time
    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / concurrentRequests;
    const maxDuration = Math.max(...results.map(r => r.duration));
    
    console.log(`✅ Load test: ${concurrentRequests} concurrent requests`);
    console.log(`⏱️  Avg: ${avgDuration.toFixed(2)}ms, Max: ${maxDuration.toFixed(2)}ms`);
    console.log(`📊 Nodes per request: avg ${Math.round(results.reduce((sum, r) => sum + r.nodes, 0) / concurrentRequests)}`);
  });

  /**
   * Test 11: Real-Time Streaming Simulation
   */
  test('11 - Real-Time Streaming Functionality', async () => {
    const eventId = TEST_CONFIG.TEST_EVENT_IDS[0];
    let previousEdgeCount = 0;
    let updateCount = 0;
    
    // Simulate 3 streaming updates (5-second intervals)
    const streamingUpdates = Array.from({ length: 3 }, async (_, index) => {
      const startTime = performance.now();
      
      const response = await fetch(`${TEST_CONFIG.BASE_URL}/api/mcp/tools/research-build-multi-layer-graph`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId,
          layers: 'all',
          confidenceThreshold: 0.6,
          timestamp: Date.now() + (index * 5000), // Simulate time progression
          streamId: `update-${index}`,
        }),
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(response.status).toBe(200);
      const result = await response.json();
      
      const currentEdgeCount = result.data.edges.length;
      
      // Edge count should be stable or growing (simulating live data)
      expect(currentEdgeCount).toBeGreaterThanOrEqual(previousEdgeCount);
      previousEdgeCount = currentEdgeCount;
      updateCount++;
      
      // Response should be fast (< 3 seconds for streaming)
      expect(duration).toBeLessThan(3000);
      
      console.log(`📡 Update ${index + 1}: ${currentEdgeCount} edges (+${currentEdgeCount - previousEdgeCount} from previous)`);
      
      // Wait 1 second between updates to simulate real-time without overwhelming
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return { index, duration, edges: currentEdgeCount };
    });
    
    const streamingResults = await Promise.all(streamingUpdates);
    
    expect(streamingResults.length).toBe(3);
    expect(updateCount).toBe(3);
    
    const finalEdgeCount = streamingResults[streamingResults.length - 1].edges;
    console.log(`✅ Streaming: ${finalEdgeCount} edges across ${streamingResults.length} updates`);
  });
});

/**
 * Utility Functions for Integration Tests
 */

/**
 * Wait for condition to be true (polling)
 */
function waitForCondition(conditionFn: () => Promise<boolean>, maxAttempts = 20, interval = 500) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const checkCondition = async () => {
      try {
        const result = await conditionFn();
        if (result) {
          resolve(null);
        } else if (++attempts >= maxAttempts) {
          reject(new Error(`Condition not met after ${maxAttempts} attempts`));
        } else {
          setTimeout(checkCondition, interval);
        }
      } catch (error) {
        reject(error);
      }
    };
    
    checkCondition();
  });
}

/**
 * Create test event ID with timestamp
 */
function createTestEventId(baseEvent: string): string {
  const [sport, team1, team2, year, month, day] = baseEvent.split('-');
  return `${sport}-${team1}-${team2}-${year}-${month}-${day}-${Date.now() % 10000}`;
}

/**
 * Mock API response with controlled timing
 */
async function mockApiResponse(url: string, delayMs = 100, errorRate = 0): Promise<Response> {
  if (Math.random() < errorRate) {
    throw new Error(`Mock error for: ${url}`);
  }
  
  await new Promise(resolve => setTimeout(resolve, delayMs));
  
  if (url.includes('health')) {
    return new Response(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.random() * 1000,
      correlations: {
        activeEngines: 3,
        processedEdges: 1247,
        anomalyCount: 12,
      },
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  if (url.includes('connection-pool')) {
    return new Response(JSON.stringify({
      totalSockets: 35,
      freeSockets: 28,
      utilization: 20,
      bookmakers: {
        draftkings: { total: 12, free: 8, rejectionRate: 0.0002 },
        fanduel: { total: 15, fetch: 10, rejectionRate: 0.0001 },
        bet365: { total: 8, free: 5, rejectionRate: 0.0003 },
      },
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  return new Response('Not implemented', { status: 501 });
}

// Export for external use
export { TEST_CONFIG };