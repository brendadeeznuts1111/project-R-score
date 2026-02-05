#!/usr/bin/env bun
/**
 * @fileoverview Dashboard Integration Tests
 * @description Comprehensive integration testing for trader-analyzer dashboard
 * @module trader-analyzer/scripts/integration-test-dashboard
 * @version 0.2.0
 */

import { test, expect, describe, beforeAll, afterAll } from 'bun:test';
import { $ } from 'bun';

// Industrial Bun Toolkit imports
import { createTestCorrelationEngine } from '@industrial-bun-toolkit/core/testing';
import { setupTestConnectionPool } from '@industrial-bun-toolkit/core/testing/connection-pool';
import { generateTestGraphData } from '@industrial-bun-toolkit/core/testing/graph-data';

const PORT = 8081;
const BASE_URL = `http://localhost:${PORT}`;
const DASHBOARD_URL = `${BASE_URL}/multi-layer-graph.html`;

// Test event IDs for comprehensive coverage
const TEST_EVENT_IDS = [
  'nba-lakers-warriors-2024-01-15',
  'nfl-chiefs-ravens-2024-01-28',
  'mlb-yankees-dodgers-2024-10-20',
  'soccer-manu-city-arsenal-2024-02-10',
  'crypto-btc-usd-2024-12-09',
];

/**
 * Global test setup
 */
beforeAll(async () => {
  // Start dashboard server in background
  const serverProcess = Bun.spawn([
    'bun', 'run', 'scripts/dashboard-server.ts'
  ], {
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      ...process.env,
      PORT: PORT.toString(),
      NODE_ENV: 'test',
    },
  });

  // Wait for server to start
  await new Promise((resolve) => {
    const onData = () => {
      serverProcess.stdout.off('data', onData);
      serverProcess.stderr.off('data', onData);
      resolve(null);
    };
    
    serverProcess.stdout.on('data', onData);
    serverProcess.stderr.on('data', onData);
    
    // 10 second timeout
    setTimeout(() => {
      serverProcess.stdout.off('data', onData);
      serverProcess.stderr.off('data', onData);
      resolve(null);
    }, 10000);
  });

  // Initialize test dependencies
  await createTestCorrelationEngine();
  await setupTestConnectionPool({
    bookmakers: ['draftkings', 'fanduel', 'bet365'],
    maxSockets: 5,
  });

  console.log(`✅ Dashboard server started at ${BASE_URL}`);
  console.log(`🌐 Dashboard accessible at ${DASHBOARD_URL}`);
});

/**
 * Global test teardown
 */
afterAll(async () => {
  // Cleanup test resources
  await Bun.spawn(['bun', 'run', 'scripts/cleanup-test-resources.ts']);
  console.log('🧹 Test resources cleaned up');
});

/**
 * Core Dashboard Integration Tests
 */
describe('Trader Analyzer Dashboard Integration', () => {
  
  test('01 - Server Health Check', async () => {
    const response = await fetch(`${BASE_URL}/api/v17/mcp/health`);
    expect(response.status).toBe(200);
    
    const health = await response.json();
    expect(health).toHaveProperty('status', 'healthy');
    expect(health).toHaveProperty('correlations');
    expect(health.correlations).toHaveProperty('activeEngines');
    expect(health.connectionPool).toHaveProperty('totalSockets');
    
    console.log(`✅ Health check: ${health.status} (${health.correlations.activeEngines} engines)`);
  });

  test('02 - Connection Pool Statistics', async () => {
    const response = await fetch(`${BASE_URL}/api/v17/connection-pool/stats`);
    expect(response.status).toBe(200);
    
    const stats = await response.json();
    expect(stats).toHaveProperty('totalSockets');
    expect(stats).toHaveProperty('freeSockets');
    expect(stats).toHaveProperty('utilization');
    expect(stats).toHaveProperty('bookmakers');
    
    // Validate bookmaker structure
    for (const [bookmaker, data] of Object.entries(stats.bookmakers)) {
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('free');
      expect(data).toHaveProperty('rejectionRate');
      expect(typeof data.rejectionRate).toBe('number');
    }
    
    console.log(`✅ Connection pool: ${stats.totalSockets} sockets, ${stats.utilization}% utilization`);
  });

  test('03 - Multi-Layer Graph Generation - NBA Event', async () => {
    const eventId = TEST_EVENT_IDS[0]; // nba-lakers-warriors-2024-01-15
    const response = await fetch(`${BASE_URL}/api/mcp/tools/research-build-multi-layer-graph`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        eventId, 
        layers: 'all',
        confidenceThreshold: 0.5 
      }),
    });
    
    expect(response.status).toBe(200);
    
    const result = await response.json();
    expect(result).toHaveProperty('success', true);
    expect(result).toHaveProperty('data');
    expect(result.data).toHaveProperty('nodes');
    expect(result.data).toHaveProperty('edges');
    expect(result.data.nodes).toBeArray();
    expect(result.data.edges).toBeArray();
    
    // Validate metadata
    expect(result.metadata).toHaveProperty('layersProcessed', 4);
    expect(result.metadata.nodes).toBeGreaterThan(0);
    expect(result.metadata.edges).toBeGreaterThan(0);
    
    console.log(`✅ NBA Graph: ${result.metadata.nodes} nodes, ${result.metadata.edges} edges`);
  });

  test('04 - GraphML Export Functionality', async () => {
    const eventId = TEST_EVENT_IDS[0];
    const response = await fetch(`${BASE_URL}/api/mcp/tools/research-generate-visualization`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        eventId, 
        format: 'graphml',
        layout: 'hierarchical' 
      }),
    });
    
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/xml');
    
    const graphml = await response.text();
    expect(graphml).toInclude('<?xml version="1.0" encoding="UTF-8"?>');
    expect(graphml).toInclude('<graphml');
    expect(graphml).toInclude('<node');
    expect(graphml).toInclude('<edge');
    
    console.log(`✅ GraphML export: ${graphml.length} bytes generated`);
  });

  test('05 - CSRF Token Integration', async () => {
    const response = await fetch(`${BASE_URL}/api/`);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('x-csrf-token');
    expect(data['x-csrf-token']).toBeString();
    
    // Verify CSRF header in response
    const csrfHeader = response.headers.get('X-CSRF-Token');
    expect(csrfHeader).toBeString();
    expect(csrfHeader).not.toBeNull();
    
    console.log(`✅ CSRF integration: token ${data['x-csrf-token'].slice(0, 8)}...`);
  });

  test('06 - Dashboard Static Assets Serving', async () => {
    const assets = [
      '/multi-layer-graph.html',
      '/dashboard/multi-layer-graph.js',
      '/dashboard/multi-layer-graph.manifest.json',
      '/dashboard/multi-layer-graph.types.ts',
    ];
    
    for (const asset of assets) {
      const response = await fetch(`${BASE_URL}${asset}`);
      expect(response.status).toBe(200);
      
      const contentType = response.headers.get('content-type');
      if (asset.endsWith('.html')) {
        expect(contentType).toInclude('text/html');
      } else if (asset.endsWith('.js')) {
        expect(contentType).toInclude('application/javascript');
      } else if (asset.endsWith('.json')) {
        expect(contentType).toInclude('application/json');
      } else if (asset.endsWith('.ts')) {
        expect(contentType).toInclude('application/typescript');
      }
      
      // Check cache headers
      const cacheControl = response.headers.get('cache-control');
      expect(cacheControl).toInclude('max-age=3600');
      
      console.log(`✅ Asset served: ${asset} (${contentType})`);
    }
  });

  test('07 - Cross-Sport Graph Generation', async () => {
    const eventId = TEST_EVENT_IDS[4]; // crypto-btc-usd-2024-12-09
    const response = await fetch(`${BASE_URL}/api/mcp/tools/research-build-multi-layer-graph`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        eventId, 
        layers: [2, 4], // Cross-market and cross-sport only
        confidenceThreshold: 0.7 
      }),
    });
    
    expect(response.status).toBe(200);
    
    const result = await response.json();
    expect(result.data.layers).toEqual(expect.arrayContaining([2, 4]));
    expect(result.metadata.layersProcessed).toBe(2);
    expect(result.data.edges.length).toBeGreaterThan(0);
    
    // Validate cross-sport edges exist
    const crossSportEdges = result.data.edges.filter(edge => edge.layer === 4);
    expect(crossSportEdges.length).toBeGreaterThan(0);
    
    console.log(`✅ Cross-sport graph: ${crossSportEdges.length} layer 4 edges`);
  });

  test('08 - Error Handling - Invalid Event ID', async () => {
    const invalidEventId = 'invalid-event-xyz';
    const response = await fetch(`${BASE_URL}/api/mcp/tools/research-build-multi-layer-graph`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        eventId: invalidEventId,
        layers: 'all' 
      }),
    });
    
    expect(response.status).toBe(200); // Should still return 200 with empty data
    
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.data.nodes).toEqual([]);
    expect(result.data.edges).toEqual([]);
    expect(result.metadata.nodes).toBe(0);
    expect(result.metadata.edges).toBe(0);
    
    console.log(`✅ Error handling: empty graph for invalid event ${invalidEventId}`);
  });

  test('09 - Confidence Filtering Integration', async () => {
    const eventId = TEST_EVENT_IDS[0];
    const response = await fetch(`${BASE_URL}/api/mcp/tools/research-build-multi-layer-graph`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        eventId, 
        layers: 'all',
        confidenceThreshold: 0.9 // Very high threshold
      }),
    });
    
    expect(response.status).toBe(200);
    
    const result = await response.json();
    const highConfidenceEdges = result.data.edges.filter(edge => edge.confidence >= 0.9);
    
    // All edges should meet or exceed the threshold
    expect(highConfidenceEdges.length).toBe(result.data.edges.length);
    
    console.log(`✅ Confidence filter: ${result.data.edges.length} edges ≥ 0.9`);
  });

  test('10 - CORS Headers for Dashboard', async () => {
    const origins = ['http://localhost:3000', 'http://localhost:8080', 'https://dashboard.trader-analyzer.com'];
    
    for (const origin of origins) {
      const response = await fetch(`${BASE_URL}/api/v17/mcp/health`, {
        headers: { 'Origin': origin },
      });
      
      expect(response.status).toBe(200);
      expect(response.headers.get('access-control-allow-origin')).toBe('*');
      expect(response.headers.get('access-control-allow-methods')).toInclude('GET, POST, PUT, DELETE');
      expect(response.headers.get('access-control-allow-headers')).toInclude('Content-Type, X-CSRF-Token');
    }
    
    console.log(`✅ CORS headers validated for ${origins.length} origins`);
  });

  test('11 - Dashboard Navigation Integration', async () => {
    const navLinks = [
      '/api/changelog',
      '/api/changelog?limit=50', 
      '/api/rss.xml',
    ];
    
    for (const link of navLinks) {
      const response = await fetch(`${BASE_URL}${link}`);
      expect(response.status).toBe(200);
      
      const contentType = response.headers.get('content-type');
      if (link.includes('changelog')) {
        expect(contentType).toInclude('application/json');
      } else if (link.includes('rss.xml')) {
        expect(contentType).toInclude('application/xml');
      }
    }
    
    console.log(`✅ Navigation endpoints: ${navLinks.length} links validated`);
  });

  test('12 - Real-Time Streaming Simulation', async () => {
    const eventId = TEST_EVENT_IDS[0];
    
    // Simulate 3 streaming updates
    let previousEdgeCount = 0;
    for (let i = 0; i < 3; i++) {
      const response = await fetch(`${BASE_URL}/api/mcp/tools/research-build-multi-layer-graph`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          eventId, 
          layers: 'all',
          confidenceThreshold: 0.6,
          timestamp: Date.now(), // Force fresh data
        }),
      });
      
      expect(response.status).toBe(200);
      const result = await response.json();
      
      const currentEdgeCount = result.data.edges.length;
      expect(currentEdgeCount).toBeGreaterThanOrEqual(previousEdgeCount);
      
      previousEdgeCount = currentEdgeCount;
      console.log(`📡 Streaming update ${i + 1}: ${currentEdgeCount} edges`);
      
      // Wait 1 second between updates (simulating real-time)
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('✅ Real-time streaming simulation completed');
  });

  test('13 - Export Functionality - JSON', async () => {
    const eventId = TEST_EVENT_IDS[0];
    const response = await fetch(`${BASE_URL}/api/mcp/tools/research-generate-visualization`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        eventId, 
        format: 'json',
        includeMetadata: true 
      }),
    });
    
    expect(response.status).toBe(200);
    
    const result = await response.json();
    expect(result).toHaveProperty('nodes');
    expect(result).toHaveProperty('edges');
    expect(result).toHaveProperty('summary');
    expect(result.summary).toHaveProperty('eventId', eventId);
    
    // Validate JSON export structure
    expect(result.nodes).toBeArray();
    expect(result.edges).toBeArray();
    expect(result.summary).toHaveProperty('generatedAt');
    
    console.log(`✅ JSON export: ${result.nodes.length} nodes, ${result.edges.length} edges`);
  });

  test('14 - Performance Metrics Integration', async () => {
    const startTime = performance.now();
    
    // Sequential requests to simulate load
    const requests = TEST_EVENT_IDS.map(eventId => 
      fetch(`${BASE_URL}/api/mcp/tools/research-build-multi-layer-graph`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, layers: 'all' }),
      }).then(r => r.json())
    );
    
    const results = await Promise.all(requests);
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / requests.length;
    
    // All requests should succeed
    results.forEach((result, index) => {
      expect(result.success).toBe(true);
      expect(result.data.nodes.length).toBeGreaterThan(0);
    });
    
    console.log(`✅ Performance: ${requests.length} graphs in ${totalTime.toFixed(2)}ms (${avgTime.toFixed(2)}ms avg)`);
  });

  test('15 - Error Recovery & Fallbacks', async () => {
    // Test with invalid API endpoint (should gracefully handle)
    const invalidResponse = await fetch(`${BASE_URL}/api/invalid-endpoint`);
    expect(invalidResponse.status).toBe(404);
    
    // Test with malformed JSON request
    const malformedResponse = await fetch(`${BASE_URL}/api/mcp/tools/research-build-multi-layer-graph`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json', // Malformed
    });
    
    expect(malformedResponse.status).toBe(400);
    
    // Test with missing required field
    const missingFieldResponse = await fetch(`${BASE_URL}/api/mcp/tools/research-build-multi-layer-graph`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ layers: 'all' }), // Missing eventId
    });
    
    expect(missingFieldResponse.status).toBe(400);
    const errorResult = await missingFieldResponse.json();
    expect(errorResult).toHaveProperty('error', 'Event ID required');
    
    console.log('✅ Error recovery: all fallback scenarios handled');
  });

  test('16 - Dashboard Type Safety Integration', async () => {
    // Verify TypeScript type definitions are accessible
    const typesResponse = await fetch(`${BASE_URL}/dashboard/multi-layer-graph.types.ts`);
    expect(typesResponse.status).toBe(200);
    expect(typesResponse.headers.get('content-type')).toInclude('application/typescript');
    
    const typesContent = await typesResponse.text();
    expect(typesContent).toInclude('interface GraphNode');
    expect(typesContent).toInclude('interface GraphEdge');
    expect(typesContent).toInclude('type CorrelationLayer');
    
    // Verify properties file
    const propsResponse = await fetch(`${BASE_URL}/dashboard/multi-layer-graph.properties.json`);
    expect(propsResponse.status).toBe(200);
    expect(propsResponse.headers.get('content-type')).toInclude('application/json');
    
    const props = await propsResponse.json();
    expect(props).toHaveProperty('nodeTypes');
    expect(props).toHaveProperty('edgeTypes');
    expect(props).toHaveProperty('layerColors');
    
    // Verify manifest
    const manifestResponse = await fetch(`${BASE_URL}/dashboard/multi-layer-graph.manifest.json`);
    expect(manifestResponse.status).toBe(200);
    
    const manifest = await manifestResponse.json();
    expect(manifest).toHaveProperty('name', 'Multi-Layer Graph Dashboard');
    expect(manifest).toHaveProperty('version', '1.0.0');
    expect(manifest).toHaveProperty('integrations');
    
    console.log('✅ Type safety: all TypeScript definitions accessible');
  });

  test('17 - Comprehensive Event Coverage', async () => {
    // Test all event types (sports + crypto)
    const results = await Promise.allSettled(
      TEST_EVENT_IDS.map(async (eventId) => {
        const response = await fetch(`${BASE_URL}/api/mcp/tools/research-build-multi-layer-graph`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId, layers: 'all' }),
        });
        
        expect(response.status).toBe(200);
        const result = await response.json();
        expect(result.success).toBe(true);
        expect(result.data.nodes.length).toBeGreaterThan(0);
        
        return { eventId, nodes: result.data.nodes.length, edges: result.data.edges.length };
      })
    );
    
    // All should succeed
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        console.log(`✅ ${TEST_EVENT_IDS[index]}: ${result.value.nodes} nodes, ${result.value.edges} edges`);
      } else {
        console.error(`❌ ${TEST_EVENT_IDS[index]}: ${result.reason}`);
        throw result.reason;
      }
    });
    
    console.log(`✅ All ${TEST_EVENT_IDS.length} event types supported`);
  });

  test('18 - Load Testing Simulation', async () => {
    // Simulate concurrent dashboard requests (10 users)
    const concurrentRequests = 10;
    const requestPromises = [];
    
    for (let i = 0; i < concurrentRequests; i++) {
      requestPromises.push(
        fetch(`${BASE_URL}/api/mcp/tools/research-build-multi-layer-graph`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            eventId: TEST_EVENT_IDS[i % TEST_EVENT_IDS.length], 
            layers: 'all' 
          }),
        }).then(async (response) => {
          expect(response.status).toBe(200);
          const result = await response.json();
          expect(result.success).toBe(true);
          return { user: i + 1, nodes: result.data.nodes.length };
        })
      );
    }
    
    const results = await Promise.all(requestPromises);
    const totalNodes = results.reduce((sum, r) => sum + r.nodes, 0);
    const avgNodes = totalNodes / concurrentRequests;
    
    console.log(`✅ Load test: ${concurrentRequests} concurrent users, avg ${avgNodes.toFixed(0)} nodes/user`);
  });

  test('19 - Dashboard Security Headers', async () => {
    const endpoints = [
      '/api/v17/mcp/health',
      '/api/v17/connection-pool/stats',
      '/api/mcp/tools/research-build-multi-layer-graph',
      '/multi-layer-graph.html',
    ];
    
    for (const endpoint of endpoints) {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: endpoint.includes('/api/') ? 'POST' : 'GET',
        headers: { 
          'Origin': 'http://localhost:3000',
          'Content-Type': 'application/json',
        },
        body: endpoint.includes('research-build') ? 
          JSON.stringify({ eventId: TEST_EVENT_IDS[0], layers: 'all' }) : undefined,
      });
      
      // Verify security headers
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
      expect(response.headers.get('x-frame-options')).toBe('DENY');
      expect(response.headers.get('x-xss-protection')).toBe('1; mode=block');
      expect(response.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
      expect(response.headers.get('cache-control')).toInclude('no-cache');
      
      // CORS for API endpoints
      if (endpoint.startsWith('/api/')) {
        expect(response.headers.get('access-control-allow-origin')).toBe('*');
        expect(response.headers.get('access-control-allow-methods')).toInclude('GET, POST');
      }
    }
    
    console.log(`✅ Security headers validated for ${endpoints.length} endpoints`);
  });

  test('20 - Full Integration Workflow', async () => {
    // Complete end-to-end workflow simulation
    
    // Step 1: Health check
    const healthRes = await fetch(`${BASE_URL}/api/v17/mcp/health`);
    const health = await healthRes.json();
    expect(health.status).toBe('healthy');
    
    // Step 2: Get connection pool stats
    const poolRes = await fetch(`${BASE_URL}/api/v17/connection-pool/stats`);
    const pool = await poolRes.json();
    expect(pool.totalSockets).toBeGreaterThan(0);
    
    // Step 3: Load graph for NBA event
    const nbaEventId = TEST_EVENT_IDS[0];
    const nbaRes = await fetch(`${BASE_URL}/api/mcp/tools/research-build-multi-layer-graph`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: nbaEventId, layers: 'all' }),
    });
    const nbaData = await nbaRes.json();
    expect(nbaData.data.nodes.length).toBeGreaterThan(0);
    
    // Step 4: Export GraphML
    const graphmlRes = await fetch(`${BASE_URL}/api/mcp/tools/research-generate-visualization`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: nbaEventId, format: 'graphml' }),
    });
    expect(graphmlRes.headers.get('content-type')).toBe('application/xml');
    
    // Step 5: Verify dashboard loads
    const dashboardRes = await fetch(`${BASE_URL}/multi-layer-graph.html`);
    expect(dashboardRes.status).toBe(200);
    const html = await dashboardRes.text();
    expect(html).toInclude('<title>Multi-Layer Correlation Graph');
    expect(html).toInclude('vis-network.min.js');
    
    console.log('✅ Full workflow: health → pool → graph → export → dashboard');
  });
});

/**
 * Utility Functions
 */
async function createTestCorrelationEngine() {
  // Mock correlation engine for testing
  global.correlationEngine = {
    processEvent: async (eventId: string) => ({
      layers: 4,
      confidence: 0.85,
      anomalies: Math.floor(Math.random() * 5),
      processingTimeMs: Math.random() * 100 + 50,
    }),
  };
}

async function setupTestConnectionPool(config: any) {
  // Mock connection pool
  global.connectionPool = {
    ...config,
    getStats: () => ({
      totalSockets: config.maxSocketsPerBookmaker * config.bookmakers.length,
      freeSockets: Math.floor(config.maxSocketsPerBookmaker * config.bookmakers.length * 0.8),
      utilization: 20,
      bookmakers: config.bookmakers.reduce((acc: any, bookmaker: string) => {
        acc[bookmaker] = {
          total: config.maxSocketsPerBookmaker,
          free: Math.floor(config.maxSocketsPerBookmaker * 0.8),
          rejectionRate: 0.0002,
        };
        return acc;
      }, {}),
    }),
  };
}

async function generateTestGraphData(eventId: string, options: any = {}) {
  const layers = options.layers || [1, 2, 3, 4];
  const baseNodes = 50 + Math.floor(Math.random() * 100);
  const baseEdges = 200 + Math.floor(Math.random() * 300);
  
  const nodes = Array.from({ length: baseNodes }, (_, i) => ({
    id: `n${i + 1}`,
    label: `${eventId.split('-')[0].toUpperCase()}_MARKET_${i + 1}`,
    layer: layers[Math.floor(Math.random() * layers.length)],
    type: ['market', 'bookmaker', 'event', 'anomaly'][Math.floor(Math.random() * 4)],
    size: 16 + Math.floor(Math.random() * 8),
  }));
  
  const edges = Array.from({ length: baseEdges }, (_, i) => ({
    id: `e${i + 1}`,
    source: nodes[Math.floor(Math.random() * baseNodes)].id,
    target: nodes[Math.floor(Math.random() * baseNodes)].id,
    layer: layers[Math.floor(Math.random() * layers.length)],
    confidence: (0.3 + Math.random() * 0.7).toFixed(3),
    type: ['direct', 'cross-market', 'cross-event', 'cross-sport'][Math.floor(Math.random() * 4)],
    width: 2 + Math.floor(Math.random() * 3),
    latency: Math.floor(Math.random() * 50) + 10,
  }));
  
  return {
    nodes,
    edges,
    statistics: {
      totalNodes: baseNodes,
      totalEdges: baseEdges,
      totalAnomalies: Math.floor(Math.random() * 10),
      avgConfidence: (0.3 + Math.random() * 0.7).toFixed(3),
    },
    summary: {
      eventId,
      layers,
      generatedAt: new Date().toISOString(),
      processingTimeMs: Math.floor(Math.random() * 200) + 100,
    },
  };
}

console.log('🧪 Running Dashboard Integration Tests...');
console.log(`🌐 Testing against: ${BASE_URL}`);
console.log(`📊 Event IDs: ${TEST_EVENT_IDS.join(', ')}`);