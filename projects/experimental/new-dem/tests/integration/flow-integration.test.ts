import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { flowState } from "../../web/unified-flow";
import { COMPONENTS } from "../../src/core";
import { dnsCacheManager } from "../../src/dns-cache";
import { cookieManager, LatticeSecurity, LatticeMetricsCollector } from "../../web/advanced-dashboard";

// Mock console to avoid test output noise
const originalConsole = global.console;
const mockConsole = {
  ...originalConsole,
  log: () => {},
  warn: () => {},
  error: () => {}
};

describe("Unified Flow System Integration", () => {
  beforeEach(() => {
    global.console = mockConsole;
  });

  afterEach(() => {
    global.console = originalConsole;
  });

  describe("Flow State Management", () => {
    test("creates and tracks flow lifecycle", () => {
      const context = {
        requestId: 'req-123',
        source: 'test'
      };

      // Start flow
      const flowId = flowState.startFlow('registry_query', context);

      expect(typeof flowId).toBe('string');
      expect(flowId.length).toBeGreaterThan(0);

      // Add components to flow
      flowState.addToFlow(flowId, 1, { action: 'component_loaded' });
      flowState.addToFlow(flowId, 2, { action: 'component_processed' });

      // Complete flow
      const result = flowState.completeFlow(flowId);

      expect(result).not.toBeNull();
      expect(result?.flowId).toBe(flowId);
      expect(result?.type).toBe('registry_query');
      expect(result?.duration).toBeGreaterThan(0);
      expect(result?.componentsUsed).toBe(2);
      expect(result?.connectionsMade).toBeGreaterThan(0);
    });

    test("handles multiple concurrent flows", () => {
      const flow1 = flowState.startFlow('dns_resolution', { requestId: 'req-1', source: 'test' });
      const flow2 = flowState.startFlow('cookie_management', { requestId: 'req-2', source: 'test' });

      expect(flow1).not.toBe(flow2);

      flowState.addToFlow(flow1, 1, { data: 'flow1-data' });
      flowState.addToFlow(flow2, 2, { data: 'flow2-data' });

      const result1 = flowState.completeFlow(flow1);
      const result2 = flowState.completeFlow(flow2);

      expect(result1?.componentsUsed).toBe(1);
      expect(result2?.componentsUsed).toBe(1);
    });

    test("returns null for non-existent flow", () => {
      const result = flowState.completeFlow('non-existent-flow');
      expect(result).toBeNull();
    });
  });

  describe("Flow Metrics", () => {
    test("tracks comprehensive flow metrics", () => {
      const initialMetrics = flowState.getFlowMetrics();

      // Create and complete flows
      const flow1 = flowState.startFlow('component_analysis', { requestId: 'req-1', source: 'test' });
      const flow2 = flowState.startFlow('system_health', { requestId: 'req-2', source: 'test' });

      flowState.addToFlow(flow1, 1, {});
      flowState.addToFlow(flow2, 2, {});

      flowState.completeFlow(flow1);
      flowState.completeFlow(flow2);

      const finalMetrics = flowState.getFlowMetrics();

      expect(finalMetrics.totalFlows).toBe(initialMetrics.totalFlows + 2);
      expect(finalMetrics.completedFlows).toBe(initialMetrics.completedFlows + 2);
      expect(finalMetrics.activeFlows).toBe(initialMetrics.activeFlows);
      expect(finalMetrics.flowLatency).toBeGreaterThan(0);
      expect(finalMetrics.interconnectedness).toBe(1.0);
    });
  });

  describe("Flow Connections", () => {
    test("creates connections between related components", () => {
      const flowId = flowState.startFlow('registry_query', { requestId: 'req-1', source: 'test' });

      // Add a component that should create connections
      flowState.addToFlow(flowId, 1, {});

      const result = flowState.completeFlow(flowId);

      // Should have created connections to related components
      expect(result?.connectionsMade).toBeGreaterThan(0);
    });

    test("limits connections for performance", () => {
      const flowId = flowState.startFlow('registry_query', { requestId: 'req-1', source: 'test' });

      // Add component that would create many connections
      flowState.addToFlow(flowId, 1, {});

      const result = flowState.completeFlow(flowId);

      // Should be limited to max 5 connections per component
      expect(result?.connectionsMade).toBeLessThanOrEqual(5);
    });
  });

  describe("Component Integration", () => {
    test("integrates with DNS cache manager", async () => {
      const flowId = flowState.startFlow('dns_resolution', { requestId: 'req-1', source: 'test' });

      // Simulate DNS operation
      flowState.addToFlow(flowId, 1, { operation: 'dns_lookup', hostname: 'example.com' });

      // DNS cache should be available (this tests integration)
      expect(dnsCacheManager).toBeDefined();
      expect(typeof dnsCacheManager.resolveWithCache).toBe('function');

      flowState.completeFlow(flowId);
    });

    test("integrates with cookie manager", () => {
      const flowId = flowState.startFlow('cookie_management', { requestId: 'req-1', source: 'test' });

      // Simulate cookie operation
      flowState.addToFlow(flowId, 1, { operation: 'set_session', sessionId: 'session-123' });

      // Cookie manager should be available
      expect(cookieManager).toBeDefined();
      expect(typeof cookieManager.setSessionCookie).toBe('function');

      flowState.completeFlow(flowId);
    });

    test("integrates with security system", async () => {
      const security = new LatticeSecurity();
      const flowId = flowState.startFlow('system_health', { requestId: 'req-1', source: 'test' });

      // Simulate security audit
      flowState.addToFlow(flowId, 1, { operation: 'security_audit' });

      const mockRequest = {
        method: 'GET',
        url: 'https://api.test.com/health',
        headers: new Headers({ 'User-Agent': 'Test' })
      } as Request;

      const auditResult = await security.auditRequest(mockRequest);
      expect(auditResult).toBeDefined();
      expect(auditResult.safe).toBe(true);

      flowState.completeFlow(flowId);
    });

    test("integrates with metrics collector", async () => {
      const metrics = new LatticeMetricsCollector();
      const flowId = flowState.startFlow('component_analysis', { requestId: 'req-1', source: 'test' });

      // Simulate metrics collection
      flowState.addToFlow(flowId, 1, { operation: 'metrics_collection' });

      const startTime = performance.now();
      await Bun.sleep(1); // Small delay
      const metric = await metrics.trackRequest('/test-endpoint', startTime);

      expect(metric).toBeDefined();
      expect(metric.endpoint).toBe('/test-endpoint');
      expect(metric.duration).toMatch(/ms$/);

      flowState.completeFlow(flowId);
    });
  });

  describe("End-to-End Flow Scenarios", () => {
    test("complete registry query flow", () => {
      // Simulate a complete registry query flow
      const flowId = flowState.startFlow('registry_query', {
        requestId: 'req-registry-123',
        sessionId: 'session-456',
        source: 'web-dashboard'
      });

      // Step 1: DNS resolution
      flowState.addToFlow(flowId, 1, { step: 'dns', hostname: 'registry.api.com' });

      // Step 2: Security audit
      flowState.addToFlow(flowId, 2, { step: 'security', action: 'audit_request' });

      // Step 3: Cookie management
      flowState.addToFlow(flowId, 3, { step: 'cookies', action: 'validate_session' });

      // Step 4: Registry query
      flowState.addToFlow(flowId, 4, { step: 'query', componentId: 1 });

      // Complete the flow
      const result = flowState.completeFlow(flowId);

      expect(result).toBeDefined();
      expect(result?.type).toBe('registry_query');
      expect(result?.componentsUsed).toBe(4);
      expect(result?.duration).toBeGreaterThan(0);
    });

    test("system health monitoring flow", () => {
      const flowId = flowState.startFlow('system_health', {
        requestId: 'req-health-789',
        source: 'monitoring'
      });

      // Health check components
      flowState.addToFlow(flowId, 1, { check: 'dns_cache', status: 'healthy' });
      flowState.addToFlow(flowId, 2, { check: 'security', status: 'enabled' });
      flowState.addToFlow(flowId, 3, { check: 'metrics', status: 'collecting' });

      const result = flowState.completeFlow(flowId);

      expect(result?.type).toBe('system_health');
      expect(result?.componentsUsed).toBe(3);
    });

    test("persona execution flow", () => {
      const flowId = flowState.startFlow('persona_execution', {
        requestId: 'req-persona-999',
        userId: 'user-123',
        source: 'edge-detection'
      });

      // Persona execution steps
      flowState.addToFlow(flowId, 1, { step: 'load_data', dataPoints: 1000 });
      flowState.addToFlow(flowId, 2, { step: 'fractal_analysis', fd: 1.45 });
      flowState.addToFlow(flowId, 3, { step: 'hurst_exponent', h: 0.62 });
      flowState.addToFlow(flowId, 4, { step: 'edge_detection', confidence: 88.6 });

      const result = flowState.completeFlow(flowId);

      expect(result?.type).toBe('persona_execution');
      expect(result?.componentsUsed).toBe(4);
      expect(result?.connectionsMade).toBeGreaterThan(0);
    });
  });

  describe("Flow Error Handling", () => {
    test("handles invalid component IDs gracefully", () => {
      const flowId = flowState.startFlow('registry_query', { requestId: 'req-1', source: 'test' });

      // Add invalid component ID
      flowState.addToFlow(flowId, 9999, { data: 'invalid' });

      const result = flowState.completeFlow(flowId);

      // Should still complete successfully
      expect(result).not.toBeNull();
      expect(result?.componentsUsed).toBe(1);
    });

    test("maintains flow state consistency", () => {
      const initialMetrics = flowState.getFlowMetrics();

      // Create flow but don't complete it
      const flowId = flowState.startFlow('test_flow', { requestId: 'req-1', source: 'test' });

      let currentMetrics = flowState.getFlowMetrics();
      expect(currentMetrics.activeFlows).toBe(initialMetrics.activeFlows + 1);

      // Complete flow
      flowState.completeFlow(flowId);

      currentMetrics = flowState.getFlowMetrics();
      expect(currentMetrics.activeFlows).toBe(initialMetrics.activeFlows);
      expect(currentMetrics.completedFlows).toBe(initialMetrics.completedFlows + 1);
    });
  });
});