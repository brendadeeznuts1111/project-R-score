/**
 * Infrastructure Status Tests
 * Validates Component #41 functionality
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import {
  InfrastructureStatusCollector,
  createInfrastructureHandlers,
  getStatusCollector,
  resetStatusCollector,
  ComponentStatus,
  LogicTier,
  TIER_LABELS,
  STATUS_COLORS,
  isOperational,
  isDegraded,
  isFailed,
} from '../../../packages/core/src/infrastructure/index';

describe('Infrastructure Status Module', () => {
  describe('InfrastructureStatusCollector', () => {
    let collector: InfrastructureStatusCollector;

    beforeEach(() => {
      resetStatusCollector();
      collector = new InfrastructureStatusCollector();
    });

    test('initializes with Golden Matrix components', () => {
      const components = collector.getComponents();

      expect(components.length).toBeGreaterThan(0);
      // v2.4.2 has 24 components (20 core + 4 new)
      expect(components.length).toBeGreaterThanOrEqual(20);
    });

    test('all components start as OPERATIONAL', () => {
      const components = collector.getComponents();

      for (const component of components) {
        expect(component.status).toBe(ComponentStatus.OPERATIONAL);
      }
    });

    test('components have valid tier assignments', () => {
      const components = collector.getComponents();

      for (const component of components) {
        expect(component.tier).toBeGreaterThanOrEqual(LogicTier.LEVEL_0_KERNEL);
        expect(component.tier).toBeLessThanOrEqual(LogicTier.LEVEL_5_TEST);
      }
    });

    test('components have parity locks', () => {
      const components = collector.getComponents();

      for (const component of components) {
        expect(component.parityLock).toBeTruthy();
        expect(component.parityLock).toMatch(/^[a-z0-9]+\.{3}[a-z0-9]+$/);
      }
    });

    test('getComponent returns correct component', () => {
      const component = collector.getComponent('Lattice-Route-Compiler');

      expect(component).toBeDefined();
      expect(component?.id).toBe('Lattice-Route-Compiler');
      expect(component?.tier).toBe(LogicTier.LEVEL_0_KERNEL);
    });

    test('getComponent returns undefined for non-existent component', () => {
      const component = collector.getComponent('non-existent-component');

      expect(component).toBeUndefined();
    });

    test('getHealth returns aggregated health', () => {
      const health = collector.getHealth();
      const componentCount = collector.getComponents().length;

      expect(health.status).toBe(ComponentStatus.OPERATIONAL);
      expect(health.totalComponents).toBe(componentCount);
      expect(health.healthPercentage).toBe(100);
      expect(health.degradedComponents).toHaveLength(0);
      expect(health.failedComponents).toHaveLength(0);
    });

    test('getHealth reflects component status changes', () => {
      collector.updateComponentStatus('Lattice-Route-Compiler', ComponentStatus.DEGRADED);

      const health = collector.getHealth();

      expect(health.status).toBe(ComponentStatus.DEGRADED);
      expect(health.degradedComponents).toContain('Lattice-Route-Compiler');
      expect(health.healthPercentage).toBeLessThan(100);
    });

    test('getMetrics returns valid metrics', () => {
      const metrics = collector.getMetrics();

      expect(metrics.uptimeSeconds).toBeGreaterThanOrEqual(0);
      expect(metrics.totalRequests).toBeGreaterThanOrEqual(0);
      expect(metrics.p99LatencyMs).toBeGreaterThanOrEqual(0);
      expect(metrics.heapUsedBytes).toBeGreaterThan(0);
      expect(metrics.heapLimitBytes).toBeGreaterThan(0);
      expect(metrics.heapPressure).toBeGreaterThanOrEqual(0);
      expect(metrics.heapPressure).toBeLessThanOrEqual(100);
    });

    test('getStatus returns full status', () => {
      const status = collector.getStatus();

      expect(status.version).toBeTruthy();
      expect(status.runtime.bun).toBeTruthy();
      expect(status.runtime.platform).toBeTruthy();
      expect(status.health).toBeDefined();
      expect(status.components.length).toBeGreaterThanOrEqual(20);
      expect(status.metrics).toBeDefined();
      expect(status.features).toBeDefined();
      expect(status.timestamp).toBeGreaterThan(0);
    });

    test('checkComponent returns health result', async () => {
      const result = await collector.checkComponent('Lattice-Route-Compiler');

      expect(result.id).toBe('Lattice-Route-Compiler');
      expect(result.status).toBe(ComponentStatus.OPERATIONAL);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
      expect(result.parityValid).toBe(true);
    });

    test('checkComponent handles non-existent component', async () => {
      const result = await collector.checkComponent('non-existent');

      expect(result.id).toBe('non-existent');
      expect(result.status).toBe(ComponentStatus.UNKNOWN);
      expect(result.parityValid).toBe(false);
      expect(result.message).toBe('Component not found');
    });

    test('recordLatency updates P99', () => {
      for (let i = 0; i < 100; i++) {
        collector.recordLatency(i);
      }

      const metrics = collector.getMetrics();
      expect(metrics.p99LatencyMs).toBeGreaterThan(0);
    });

    test('setActiveConnections updates metrics', () => {
      collector.setActiveConnections(42);

      const metrics = collector.getMetrics();
      expect(metrics.activeConnections).toBe(42);
    });

    test('runHealthChecks checks all components', async () => {
      const results = await collector.runHealthChecks();

      expect(results.length).toBeGreaterThanOrEqual(20);
      for (const result of results) {
        expect(result.status).toBeDefined();
        expect(result.latencyMs).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('createInfrastructureHandlers', () => {
    let collector: InfrastructureStatusCollector;
    let handlers: ReturnType<typeof createInfrastructureHandlers>;

    beforeEach(() => {
      collector = new InfrastructureStatusCollector();
      handlers = createInfrastructureHandlers(collector);
    });

    test('returns null for non-infrastructure paths', async () => {
      const req = new Request('http://localhost/mcp/health');
      const response = await handlers.handleRequest(req);

      expect(response).toBeNull();
    });

    test('handles /mcp/infrastructure/status', async () => {
      const req = new Request('http://localhost/mcp/infrastructure/status');
      const response = await handlers.handleRequest(req);

      expect(response).not.toBeNull();
      expect(response!.status).toBe(200);

      const body = await response!.json();
      expect(body.version).toBeTruthy();
      expect(body.components).toBeDefined();
    });

    test('handles /mcp/infrastructure/health', async () => {
      const req = new Request('http://localhost/mcp/infrastructure/health');
      const response = await handlers.handleRequest(req);

      expect(response).not.toBeNull();
      expect(response!.status).toBe(200);

      const body = await response!.json();
      expect(body.status).toBeDefined();
      expect(body.totalComponents).toBeGreaterThanOrEqual(20);
    });

    test('handles /mcp/infrastructure/metrics', async () => {
      const req = new Request('http://localhost/mcp/infrastructure/metrics');
      const response = await handlers.handleRequest(req);

      expect(response).not.toBeNull();
      expect(response!.status).toBe(200);

      const body = await response!.json();
      expect(body.uptimeSeconds).toBeDefined();
      expect(body.heapUsedBytes).toBeGreaterThan(0);
    });

    test('handles /mcp/infrastructure/components', async () => {
      const req = new Request('http://localhost/mcp/infrastructure/components');
      const response = await handlers.handleRequest(req);

      expect(response).not.toBeNull();
      expect(response!.status).toBe(200);

      const body = await response!.json();
      expect(body.success).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(20);
    });

    test('handles /mcp/infrastructure/component/:id', async () => {
      const req = new Request('http://localhost/mcp/infrastructure/component/Lattice-Route-Compiler');
      const response = await handlers.handleRequest(req);

      expect(response).not.toBeNull();
      expect(response!.status).toBe(200);

      const body = await response!.json();
      expect(body.success).toBe(true);
      expect(body.data.id).toBe('Lattice-Route-Compiler');
    });

    test('returns 404 for non-existent component', async () => {
      const req = new Request('http://localhost/mcp/infrastructure/component/non-existent');
      const response = await handlers.handleRequest(req);

      expect(response).not.toBeNull();
      expect(response!.status).toBe(404);
    });

    test('handles CORS preflight', async () => {
      const req = new Request('http://localhost/mcp/infrastructure/status', {
        method: 'OPTIONS',
      });
      const response = await handlers.handleRequest(req);

      expect(response).not.toBeNull();
      expect(response!.status).toBe(204);
      expect(response!.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });

    test('root path /mcp/infrastructure returns status', async () => {
      const req = new Request('http://localhost/mcp/infrastructure');
      const response = await handlers.handleRequest(req);

      expect(response).not.toBeNull();
      expect(response!.status).toBe(200);
    });
  });

  describe('Type Guards and Helpers', () => {
    test('isOperational correctly identifies operational components', () => {
      const operational = { status: ComponentStatus.OPERATIONAL } as any;
      const degraded = { status: ComponentStatus.DEGRADED } as any;

      expect(isOperational(operational)).toBe(true);
      expect(isOperational(degraded)).toBe(false);
    });

    test('isDegraded correctly identifies degraded components', () => {
      const degraded = { status: ComponentStatus.DEGRADED } as any;
      const maintenance = { status: ComponentStatus.MAINTENANCE } as any;
      const operational = { status: ComponentStatus.OPERATIONAL } as any;

      expect(isDegraded(degraded)).toBe(true);
      expect(isDegraded(maintenance)).toBe(true);
      expect(isDegraded(operational)).toBe(false);
    });

    test('isFailed correctly identifies failed components', () => {
      const failed = { status: ComponentStatus.FAILED } as any;
      const unknown = { status: ComponentStatus.UNKNOWN } as any;
      const operational = { status: ComponentStatus.OPERATIONAL } as any;

      expect(isFailed(failed)).toBe(true);
      expect(isFailed(unknown)).toBe(true);
      expect(isFailed(operational)).toBe(false);
    });
  });

  describe('Constants', () => {
    test('TIER_LABELS has all tiers', () => {
      expect(TIER_LABELS[LogicTier.LEVEL_0_KERNEL]).toBe('Level 0: Kernel');
      expect(TIER_LABELS[LogicTier.LEVEL_1_STATE]).toBe('Level 1: State');
      expect(TIER_LABELS[LogicTier.LEVEL_2_AUDIT]).toBe('Level 2: Audit');
      expect(TIER_LABELS[LogicTier.LEVEL_3_CONTROL]).toBe('Level 3: Control');
      expect(TIER_LABELS[LogicTier.LEVEL_4_VAULT]).toBe('Level 4: Vault');
      expect(TIER_LABELS[LogicTier.LEVEL_5_TEST]).toBe('Level 5: Test');
    });

    test('STATUS_COLORS has all statuses', () => {
      expect(STATUS_COLORS[ComponentStatus.OPERATIONAL]).toBe('#10b981');
      expect(STATUS_COLORS[ComponentStatus.DEGRADED]).toBe('#f59e0b');
      expect(STATUS_COLORS[ComponentStatus.MAINTENANCE]).toBe('#6366f1');
      expect(STATUS_COLORS[ComponentStatus.FAILED]).toBe('#ef4444');
      expect(STATUS_COLORS[ComponentStatus.UNKNOWN]).toBe('#6b7280');
    });
  });

  describe('Shared Collector', () => {
    beforeEach(() => {
      resetStatusCollector();
    });

    test('getStatusCollector returns singleton', () => {
      const collector1 = getStatusCollector();
      const collector2 = getStatusCollector();

      expect(collector1).toBe(collector2);
    });

    test('resetStatusCollector clears singleton', () => {
      const collector1 = getStatusCollector();
      resetStatusCollector();
      const collector2 = getStatusCollector();

      expect(collector1).not.toBe(collector2);
    });
  });
});
