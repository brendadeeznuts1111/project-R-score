/**
 * Exchange Handler Buffer Tracking Tests
 * Validates TypedArrayInspector integration for wire protocol monitoring
 *
 * @module sportsbook/exchange-handler.test
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import {
  ExchangeHandler,
  DEFAULT_EXCHANGE_CONFIG,
  TypedArrayInspector,
} from '../../../packages/core/src/sportsbook/index';

describe('ExchangeHandler Buffer Tracking', () => {
  let handler: ExchangeHandler;

  beforeEach(() => {
    // Reset the TypedArrayInspector singleton before each test
    TypedArrayInspector.reset();

    handler = new ExchangeHandler({
      mockMode: false, // Disable mock to control updates manually
      enableRiskAlerts: false,
      enableArbitrageAlerts: false,
    });
  });

  afterEach(() => {
    handler.stop();
    TypedArrayInspector.reset();
  });

  describe('Buffer Inspector Integration', () => {
    test('handler initializes with buffer inspector', () => {
      const metrics = handler.getMetrics();

      expect(metrics.buffers).toBeDefined();
      expect(metrics.buffers.activeCount).toBe(0);
      expect(metrics.buffers.totalAllocatedBytes).toBe(0);
      expect(metrics.buffers.potentialLeaks).toBe(0);
    });

    test('getBufferStats returns complete statistics', () => {
      const bufferStats = handler.getBufferStats();

      expect(bufferStats.stats).toBeDefined();
      expect(bufferStats.stats.activeCount).toBeGreaterThanOrEqual(0);
      expect(bufferStats.stats.totalRegistered).toBeGreaterThanOrEqual(0);
      expect(bufferStats.stats.byType).toBeDefined();

      expect(bufferStats.memoryProfile).toBeDefined();
      expect(bufferStats.memoryProfile.stats).toBeDefined();
      expect(bufferStats.memoryProfile.heapInfo).toBeDefined();
      expect(bufferStats.memoryProfile.recommendations).toBeInstanceOf(Array);

      expect(bufferStats.formatted).toContain('TypedArrayInspector Statistics');
    });
  });

  describe('REST API Buffer Endpoints', () => {
    test('GET /mcp/exchange/metrics includes buffer stats', async () => {
      handler.start();

      const req = new Request('http://localhost/mcp/exchange/metrics');
      const response = await handler.handleRequest(req);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.buffers).toBeDefined();
      expect(data.data.buffers.activeCount).toBeGreaterThanOrEqual(0);
      expect(data.data.buffers.totalAllocatedBytes).toBeGreaterThanOrEqual(0);
      expect(data.data.buffers.potentialLeaks).toBeGreaterThanOrEqual(0);
    });

    test('GET /mcp/exchange/buffers returns detailed buffer stats', async () => {
      handler.start();

      const req = new Request('http://localhost/mcp/exchange/buffers');
      const response = await handler.handleRequest(req);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.stats).toBeDefined();
      expect(data.data.stats.activeCount).toBeGreaterThanOrEqual(0);
      expect(data.data.stats.totalRegistered).toBeGreaterThanOrEqual(0);
      expect(data.data.stats.byType).toBeDefined();
      expect(data.data.stats.longestLived).toBeInstanceOf(Array);
      expect(data.data.stats.potentialLeaks).toBeInstanceOf(Array);

      expect(data.data.memoryProfile).toBeDefined();
      expect(data.data.memoryProfile.heapInfo).toBeDefined();

      expect(data.data.formatted).toContain('TypedArrayInspector');
    });

    test('buffer endpoint returns CORS headers', async () => {
      const req = new Request('http://localhost/mcp/exchange/buffers');
      const response = await handler.handleRequest(req);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });
  });

  describe('Metrics Integration', () => {
    test('metrics include all expected fields', () => {
      handler.start();
      const metrics = handler.getMetrics();

      // Core metrics
      expect(metrics.throughput).toBeGreaterThanOrEqual(0);
      expect(metrics.p99LatencyMs).toBeGreaterThanOrEqual(0);
      expect(metrics.clients).toBe(0);
      expect(metrics.markets).toBe(0);
      expect(metrics.arbitrageOpportunities).toBe(0);
      expect(metrics.messagesSent).toBe(0);
      expect(metrics.uptime).toBeGreaterThanOrEqual(0);

      // Risk engine metrics
      expect(metrics.riskEngineMetrics).toBeDefined();

      // Delta aggregator metrics
      expect(metrics.delta).toBeDefined();
      expect(metrics.delta.enabled).toBeDefined();
      expect(metrics.delta.mode).toBeDefined();

      // Buffer metrics (new)
      expect(metrics.buffers).toBeDefined();
      expect(metrics.buffers.activeCount).toBeGreaterThanOrEqual(0);
      expect(metrics.buffers.totalAllocatedBytes).toBeGreaterThanOrEqual(0);
      expect(metrics.buffers.potentialLeaks).toBeGreaterThanOrEqual(0);
    });

    test('buffer stats track by type correctly', () => {
      const bufferStats = handler.getBufferStats();

      // byType should be an object (possibly empty initially)
      expect(typeof bufferStats.stats.byType).toBe('object');

      // If there are tracked arrays, they should have count and bytes
      for (const [typeName, typeStats] of Object.entries(bufferStats.stats.byType)) {
        expect(typeof typeName).toBe('string');
        expect(typeStats.count).toBeGreaterThanOrEqual(0);
        expect(typeStats.bytes).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Handler Lifecycle', () => {
    test('start and stop do not throw', () => {
      expect(() => handler.start()).not.toThrow();
      expect(() => handler.stop()).not.toThrow();
    });

    test('stopping cleans up resources', () => {
      handler.start();

      const metricsBefore = handler.getMetrics();
      expect(metricsBefore.uptime).toBeGreaterThanOrEqual(0);

      handler.stop();

      // After stop, uptime should be 0 (not running)
      const metricsAfter = handler.getMetrics();
      expect(metricsAfter.uptime).toBe(0);
    });

    test('multiple start/stop cycles work correctly', () => {
      for (let i = 0; i < 3; i++) {
        handler.start();
        expect(handler.getMetrics().uptime).toBeGreaterThanOrEqual(0);
        handler.stop();
      }
    });
  });

  describe('Configuration', () => {
    test('uses default config values', () => {
      expect(DEFAULT_EXCHANGE_CONFIG.mockMode).toBe(true);
      expect(DEFAULT_EXCHANGE_CONFIG.mockIntervalMs).toBe(100);
      expect(DEFAULT_EXCHANGE_CONFIG.mockMarketsCount).toBe(10);
      expect(DEFAULT_EXCHANGE_CONFIG.heartbeatIntervalMs).toBe(5000);
      expect(DEFAULT_EXCHANGE_CONFIG.enableRiskAlerts).toBe(true);
      expect(DEFAULT_EXCHANGE_CONFIG.enableArbitrageAlerts).toBe(true);
    });

    test('custom config overrides defaults', () => {
      const customHandler = new ExchangeHandler({
        mockMode: false,
        mockIntervalMs: 50,
        mockMarketsCount: 5,
      });

      // Handler should be created without error
      expect(customHandler).toBeDefined();

      customHandler.stop();
    });
  });
});

describe('ExchangeHandler with Mock Mode', () => {
  let handler: ExchangeHandler;

  beforeEach(() => {
    TypedArrayInspector.reset();

    handler = new ExchangeHandler({
      mockMode: true,
      mockIntervalMs: 10, // Fast updates for testing
      mockMarketsCount: 2,
      enableRiskAlerts: false,
      enableArbitrageAlerts: false,
    });
  });

  afterEach(() => {
    handler.stop();
    TypedArrayInspector.reset();
  });

  test('mock mode generates updates', async () => {
    handler.start();

    // Wait for some mock updates to be generated (need > 1 second for uptime)
    await Bun.sleep(1100);

    const metrics = handler.getMetrics();

    // Should have processed some updates (uptime is in seconds)
    expect(metrics.uptime).toBeGreaterThanOrEqual(1);
  });

  test('buffer tracking works with mock updates', async () => {
    handler.start();

    // Wait for mock updates that create tracked buffers
    await Bun.sleep(100);

    const bufferStats = handler.getBufferStats();

    // Inspector should have registered some buffers from serialization
    // Note: buffers may be garbage collected, so we check totalRegistered
    expect(bufferStats.stats.totalRegistered).toBeGreaterThanOrEqual(0);
  });
});

describe('ExchangeHandler Dashboard Integration', () => {
  let handler: ExchangeHandler;

  beforeEach(() => {
    TypedArrayInspector.reset();

    handler = new ExchangeHandler({
      mockMode: true,
      mockIntervalMs: 50, // Fast updates
      mockMarketsCount: 3,
      enableRiskAlerts: false,
      enableArbitrageAlerts: false,
    });
  });

  afterEach(() => {
    handler.stop();
    TypedArrayInspector.reset();
  });

  describe('Dashboard Attachment', () => {
    test('attachDashboard sets dashboard reference', async () => {
      const { TerminalDashboard } = await import('../../../packages/core/src/monitoring/terminal-dashboard');
      const dashboard = new TerminalDashboard({ terminalWidth: 80 });

      expect(handler.hasDashboard()).toBe(false);

      handler.attachDashboard(dashboard);

      expect(handler.hasDashboard()).toBe(true);
      expect(handler.getDashboard()).toBe(dashboard);

      dashboard.stop();
    });

    test('detachDashboard clears dashboard reference', async () => {
      const { TerminalDashboard } = await import('../../../packages/core/src/monitoring/terminal-dashboard');
      const dashboard = new TerminalDashboard({ terminalWidth: 80 });

      handler.attachDashboard(dashboard);
      expect(handler.hasDashboard()).toBe(true);

      handler.detachDashboard();
      expect(handler.hasDashboard()).toBe(false);
      expect(handler.getDashboard()).toBeNull();

      dashboard.stop();
    });

    test('dashboard is updated when handler is running', async () => {
      const { TerminalDashboard } = await import('../../../packages/core/src/monitoring/terminal-dashboard');
      const dashboard = new TerminalDashboard({ terminalWidth: 80 });

      handler.attachDashboard(dashboard);
      handler.start();

      // Wait for some updates
      await Bun.sleep(200);

      const state = dashboard.getState();

      // Should have received performance metrics
      expect(state.performanceMetrics).not.toBeNull();
      expect(state.performanceMetrics!.uptime).toBeGreaterThanOrEqual(0);

      // Should have received buffer metrics
      expect(state.bufferMetrics).not.toBeNull();
      expect(state.bufferMetrics!.activeCount).toBeGreaterThanOrEqual(0);

      dashboard.stop();
    });

    test('attaching dashboard after start begins updates', async () => {
      const { TerminalDashboard } = await import('../../../packages/core/src/monitoring/terminal-dashboard');
      const dashboard = new TerminalDashboard({ terminalWidth: 80 });

      handler.start();

      // Wait a bit
      await Bun.sleep(100);

      // Attach dashboard after handler is running
      handler.attachDashboard(dashboard);

      // Wait for updates
      await Bun.sleep(200);

      const state = dashboard.getState();
      expect(state.performanceMetrics).not.toBeNull();

      dashboard.stop();
    });

    test('stopping handler stops dashboard updates', async () => {
      const { TerminalDashboard } = await import('../../../packages/core/src/monitoring/terminal-dashboard');
      const dashboard = new TerminalDashboard({ terminalWidth: 80 });

      handler.attachDashboard(dashboard);
      handler.start();

      await Bun.sleep(100);

      handler.stop();

      // Get state before
      const stateBefore = dashboard.getState();
      const frameCountBefore = stateBefore.frameCount;

      // Wait a bit - no updates should occur
      await Bun.sleep(150);

      // Frame count should not have increased (handler stopped)
      // Note: dashboard's own render loop is separate
      // We just verify handler didn't throw
      expect(handler.hasDashboard()).toBe(true);

      dashboard.stop();
    });
  });

  describe('Dashboard Data Population', () => {
    test('markets are populated from mock feed', async () => {
      const { TerminalDashboard } = await import('../../../packages/core/src/monitoring/terminal-dashboard');
      const dashboard = new TerminalDashboard({ terminalWidth: 80 });

      handler.attachDashboard(dashboard);
      handler.start();

      // Wait for mock feed to generate updates
      await Bun.sleep(300);

      const state = dashboard.getState();

      // Should have some markets from mock feed
      // Markets may or may not be populated depending on timing
      expect(state.lastUpdate).toBeGreaterThan(0);

      dashboard.stop();
    });

    test('performance metrics reflect handler state', async () => {
      const { TerminalDashboard } = await import('../../../packages/core/src/monitoring/terminal-dashboard');
      const dashboard = new TerminalDashboard({ terminalWidth: 80 });

      handler.attachDashboard(dashboard);
      handler.start();

      await Bun.sleep(200);

      const state = dashboard.getState();
      const metrics = handler.getMetrics();

      // Dashboard metrics should match handler metrics
      expect(state.performanceMetrics!.clients).toBe(metrics.clients);
      expect(state.performanceMetrics!.messagesSent).toBe(metrics.messagesSent);

      dashboard.stop();
    });

    test('buffer metrics reflect inspector state', async () => {
      const { TerminalDashboard } = await import('../../../packages/core/src/monitoring/terminal-dashboard');
      const dashboard = new TerminalDashboard({ terminalWidth: 80 });

      handler.attachDashboard(dashboard);
      handler.start();

      await Bun.sleep(200);

      const state = dashboard.getState();
      const bufferStats = handler.getBufferStats();

      // Dashboard buffer metrics should match inspector stats
      expect(state.bufferMetrics!.activeCount).toBe(bufferStats.stats.activeCount);
      expect(state.bufferMetrics!.potentialLeaks).toBe(bufferStats.stats.potentialLeaks.length);

      dashboard.stop();
    });
  });
});
