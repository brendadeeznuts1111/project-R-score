#!/usr/bin/env bun
// MCP Server Test Suite
// [TENSION-MCP-TEST-001] [TENSION-SERVER-TEST-002]

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { TensionMCPClient } from '../../examples/mcp-client-demo';

describe('MCP Server', () => {
  let client: TensionMCPClient;
  let serverProcess: any;

  beforeAll(async () => {
    // Start MCP server in background
    serverProcess = Bun.spawn([process.execPath, 'mcp-server.ts'], {
      stdio: ['ignore', 'ignore', 'ignore'],
      env: { MCP_PORT: '3003' } // Use different port for tests
    });

    // Wait for server to start
    await Bun.sleep(2000);

    // Update client to use test port
    client = new TensionMCPClient('localhost', 3003);
  });

  afterAll(async () => {
    // Clean up server process
    if (serverProcess) {
      serverProcess.kill();
    }
  });

  describe('Server Connection', () => {
    it('should connect to MCP server', async () => {
      const info = await client.getServerInfo();

      expect(info).toBeDefined();
      expect(info.name).toBe('tension-field-mcp');
      expect(info.version).toBe('1.0.0');
      expect(info.tools).toBeInstanceOf(Array);
      expect(info.tools.length).toBeGreaterThan(0);
    });

    it('should list available tools', async () => {
      const tools = await client.getAvailableTools();

      expect(tools).toBeDefined();
      expect(Object.keys(tools)).toContain('analyze_tension');
      expect(Object.keys(tools)).toContain('propagate_tension');
      expect(Object.keys(tools)).toContain('assess_risk');
      expect(Object.keys(tools)).toContain('query_history');
      expect(Object.keys(tools)).toContain('get_system_status');
      expect(Object.keys(tools)).toContain('get_errors');
    });
  });

  describe('Tool Execution', () => {
    it('should get system status', async () => {
      const response = await client.callTool('get_system_status');

      expect(response.success).toBe(true);
      expect(response.result).toBeDefined();
      expect(response.result.timestamp).toBeDefined();
      expect(response.result.uptime).toBeTypeOf('number');
      expect(response.result.memory).toBeDefined();
      expect(response.result.propagator).toBeDefined();
      expect(response.result.database).toBeDefined();
    });

    it('should get detailed system status', async () => {
      const response = await client.callTool('get_system_status', {
        includeDetails: true
      });

      expect(response.success).toBe(true);
      expect(response.result.errors).toBeDefined();
      expect(response.result.recentActivity).toBeDefined();
    });

    it('should handle invalid tool name', async () => {
      const response = await client.callTool('invalid_tool');

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });

    it('should analyze tension without nodeId', async () => {
      const response = await client.callTool('analyze_tension', {
        depth: 2,
        includePredictions: false
      });

      expect(response.success).toBe(true);
      expect(response.result).toBeDefined();
    });

    it('should query history', async () => {
      const response = await client.callTool('query_history', {
        timeRange: {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString()
        },
        metrics: ['tension'],
        limit: 10
      });

      expect(response.success).toBe(true);
      expect(response.result).toBeDefined();
      expect(response.result.data).toBeInstanceOf(Array);
      expect(response.result.count).toBeTypeOf('number');
    });

    it('should get errors', async () => {
      const response = await client.callTool('get_errors', {
        timeRange: 24,
        limit: 10
      });

      expect(response.success).toBe(true);
      expect(response.result).toBeDefined();
      expect(response.result.errors).toBeInstanceOf(Array);
      expect(response.result.count).toBeTypeOf('number');
    });

    it('should filter errors by severity', async () => {
      const response = await client.callTool('get_errors', {
        severity: 'high',
        timeRange: 24,
        limit: 5
      });

      expect(response.success).toBe(true);
      if (response.result.errors.length > 0) {
        response.result.errors.forEach((error: any) => {
          expect(error.severity).toBe('high');
        });
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const response = await fetch('http://localhost:3003/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json'
      });

      expect(response.status).toBe(400);
    });

    it('should handle missing tool parameter', async () => {
      const response = await fetch('http://localhost:3003/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ arguments: {} })
      });

      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should handle invalid arguments', async () => {
      const response = await client.callTool('propagate_tension', {
        sourceNodes: null // Invalid: should be string or array
      });

      expect(response.success).toBe(false);
    });
  });

  describe('Performance', () => {
    it('should respond quickly to status requests', async () => {
      const start = performance.now();
      await client.callTool('get_system_status');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100); // Should respond in < 100ms
    });

    it('should handle concurrent requests', async () => {
      const promises = Array(10).fill(null).map(() =>
        client.callTool('get_system_status')
      );

      const start = performance.now();
      const results = await Promise.all(promises);
      const duration = performance.now() - start;

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
      expect(duration).toBeLessThan(500); // All 10 requests in < 500ms
    });
  });
});

describe('MCP Client', () => {
  it('should create client with custom host and port', () => {
    const client = new TensionMCPClient('custom-host', 9999);
    expect(client).toBeDefined();
  });

  it('should handle connection errors gracefully', async () => {
    const client = new TensionMCPClient('invalid-host', 9999);

    try {
      await client.getServerInfo();
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});

// Integration Tests
describe('MCP Integration', () => {
  let client: TensionMCPClient;
  let serverProcess: any;

  beforeAll(async () => {
    // Start fresh server for integration tests
    serverProcess = Bun.spawn([process.execPath, 'mcp-server.ts'], {
      stdio: ['ignore', 'ignore', 'ignore'],
      env: { MCP_PORT: '3004' }
    });

    await Bun.sleep(2000);
    client = new TensionMCPClient('localhost', 3004);
  });

  afterAll(async () => {
    if (serverProcess) {
      serverProcess.kill();
    }
  });

  it('should handle complete workflow', async () => {
    // 1. Check system status
    const status = await client.callTool('get_system_status');
    expect(status.success).toBe(true);

    // 2. Get recent errors
    const errors = await client.callTool('get_errors', { limit: 5 });
    expect(errors.success).toBe(true);

    // 3. Query history
    const history = await client.callTool('query_history', {
      timeRange: {
        start: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString()
      }
    });
    expect(history.success).toBe(true);

    // 4. Analyze tension
    const analysis = await client.callTool('analyze_tension');
    expect(analysis.success).toBe(true);
  });
});

console.log('✅ MCP Server Tests Complete');
