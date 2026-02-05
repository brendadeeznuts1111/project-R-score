/**
 * Infrastructure Status Panel Tests
 */

import { describe, test, expect } from 'bun:test';
import {
  InfrastructureStatusPanel,
  createInfrastructurePanel,
  renderInfrastructureHeatmap,
  renderInfrastructureStatusBar,
} from '../../../../packages/core/src/monitoring/panels/infrastructure-status';
import {
  type InfrastructureStatus,
  ComponentStatus,
  LogicTier,
} from '../../../../packages/core/src/infrastructure';

// Mock infrastructure status
function createMockStatus(overrides: Partial<InfrastructureStatus> = {}): InfrastructureStatus {
  return {
    version: '1.3.6_STABLE',
    runtime: {
      bun: '1.3.4',
      platform: 'darwin',
      arch: 'arm64',
    },
    health: {
      status: ComponentStatus.OPERATIONAL,
      totalComponents: 20,
      byStatus: {
        [ComponentStatus.OPERATIONAL]: 20,
        [ComponentStatus.DEGRADED]: 0,
        [ComponentStatus.MAINTENANCE]: 0,
        [ComponentStatus.FAILED]: 0,
        [ComponentStatus.UNKNOWN]: 0,
      },
      byTier: {
        [LogicTier.LEVEL_0_KERNEL]: 4,
        [LogicTier.LEVEL_1_STATE]: 8,
        [LogicTier.LEVEL_2_AUDIT]: 2,
        [LogicTier.LEVEL_3_CONTROL]: 3,
        [LogicTier.LEVEL_4_VAULT]: 2,
        [LogicTier.LEVEL_5_TEST]: 1,
      },
      degradedComponents: [],
      failedComponents: [],
      healthPercentage: 100,
      slaCompliant: true,
      timestamp: Date.now(),
    },
    components: [
      {
        id: 'Lattice-Route-Compiler',
        name: 'Lattice Route Compiler',
        tier: LogicTier.LEVEL_0_KERNEL,
        status: ComponentStatus.OPERATIONAL,
        resourceTax: { category: 'CPU', value: '<1%' },
        parityLock: '7f3e...8a2b',
        protocol: 'URLPattern',
        lastCheck: Date.now(),
        latencyMs: 0.003,
      },
      {
        id: 'X-Spin-Guard',
        name: 'X-Spin-Guard',
        tier: LogicTier.LEVEL_0_KERNEL,
        status: ComponentStatus.OPERATIONAL,
        resourceTax: { category: 'CPU', value: '0.01%' },
        parityLock: '9c0d...1f4e',
        protocol: 'Connection Limiting',
        lastCheck: Date.now(),
        latencyMs: 0.001,
      },
    ],
    metrics: {
      uptimeSeconds: 3600,
      totalRequests: 10000,
      p99LatencyMs: 10.5,
      heapUsedBytes: 50000000,
      heapLimitBytes: 100000000,
      heapPressure: 50,
      activeConnections: 5,
      requestsPerSecond: 2.5,
      errorRate: 0.001,
      timestamp: Date.now(),
    },
    features: ['KERNEL_OPT', 'ENHANCED_ROUTING', 'SECURE_COOKIES'],
    timestamp: Date.now(),
    ...overrides,
  };
}

describe('InfrastructureStatusPanel', () => {
  test('creates panel with default config', () => {
    const panel = createInfrastructurePanel();
    expect(panel).toBeInstanceOf(InfrastructureStatusPanel);
  });

  test('creates panel with custom config', () => {
    const panel = createInfrastructurePanel({
      width: 100,
      showMetrics: false,
      showFeatures: false,
    });
    expect(panel).toBeInstanceOf(InfrastructureStatusPanel);
  });

  test('render returns array of lines', () => {
    const panel = createInfrastructurePanel();
    const status = createMockStatus();
    const lines = panel.render(status);

    expect(Array.isArray(lines)).toBe(true);
    expect(lines.length).toBeGreaterThan(0);
  });

  test('render includes header with version', () => {
    const panel = createInfrastructurePanel();
    const status = createMockStatus();
    const lines = panel.render(status);

    const header = lines[0];
    expect(header).toContain('INFRASTRUCTURE STATUS');
    expect(header).toContain('1.3.6_STABLE');
  });

  test('render includes health status', () => {
    const panel = createInfrastructurePanel();
    const status = createMockStatus();
    const lines = panel.render(status);

    const content = lines.join('\n');
    expect(content).toContain('Health:');
    expect(content).toContain('OPERATIONAL');
  });

  test('render includes metrics when enabled', () => {
    const panel = createInfrastructurePanel({ showMetrics: true });
    const status = createMockStatus();
    const lines = panel.render(status);

    const content = lines.join('\n');
    expect(content).toContain('Uptime:');
    expect(content).toContain('Requests:');
    expect(content).toContain('Heap:');
  });

  test('render excludes metrics when disabled', () => {
    const panel = createInfrastructurePanel({ showMetrics: false });
    const status = createMockStatus();
    const lines = panel.render(status);

    const content = lines.join('\n');
    expect(content).not.toContain('RPS:');
  });

  test('render includes feature flags', () => {
    const panel = createInfrastructurePanel();
    const status = createMockStatus();
    const lines = panel.render(status);

    const content = lines.join('\n');
    expect(content).toContain('Features:');
    expect(content).toContain('KERNEL_OPT');
  });

  test('renderCompact returns single line', () => {
    const panel = createInfrastructurePanel();
    const status = createMockStatus();
    const compact = panel.renderCompact(status);

    expect(typeof compact).toBe('string');
    expect(compact).toContain('INFRA');
    expect(compact).toContain('Components:');
  });

  test('render shows alerts for degraded components', () => {
    const panel = createInfrastructurePanel();
    const status = createMockStatus({
      health: {
        ...createMockStatus().health,
        status: ComponentStatus.DEGRADED,
        degradedComponents: ['Test-Component'],
      },
    });
    const lines = panel.render(status);

    const content = lines.join('\n');
    expect(content).toContain('DEGRADED COMPONENTS');
    expect(content).toContain('Test-Component');
  });

  test('render shows alerts for failed components', () => {
    const panel = createInfrastructurePanel();
    const status = createMockStatus({
      health: {
        ...createMockStatus().health,
        status: ComponentStatus.FAILED,
        failedComponents: ['Failed-Component'],
      },
    });
    const lines = panel.render(status);

    const content = lines.join('\n');
    expect(content).toContain('FAILED COMPONENTS');
    expect(content).toContain('Failed-Component');
  });
});

describe('renderInfrastructureHeatmap', () => {
  test('returns array of lines', () => {
    const status = createMockStatus();
    const lines = renderInfrastructureHeatmap(status);

    expect(Array.isArray(lines)).toBe(true);
    expect(lines.length).toBeGreaterThan(0);
  });

  test('includes title', () => {
    const status = createMockStatus();
    const lines = renderInfrastructureHeatmap(status);

    expect(lines[0]).toContain('GOLDEN MATRIX HEATMAP');
  });

  test('includes all tier labels', () => {
    const status = createMockStatus();
    const lines = renderInfrastructureHeatmap(status);
    const content = lines.join('\n');

    expect(content).toContain('L0:KERN');
    expect(content).toContain('L1:STATE');
    expect(content).toContain('L2:AUDIT');
    expect(content).toContain('L3:CTRL');
    expect(content).toContain('L4:VAULT');
    expect(content).toContain('L5:TEST');
  });

  test('includes legend when enabled', () => {
    const status = createMockStatus();
    const lines = renderInfrastructureHeatmap(status, { showLegend: true });
    const content = lines.join('\n');

    expect(content).toContain('Status:');
    expect(content).toContain('OK');
  });

  test('excludes legend when disabled', () => {
    const status = createMockStatus();
    const lines = renderInfrastructureHeatmap(status, { showLegend: false });
    const content = lines.join('\n');

    expect(content).not.toContain('Legend:');
  });
});

describe('renderInfrastructureStatusBar', () => {
  test('returns single line string', () => {
    const status = createMockStatus();
    const bar = renderInfrastructureStatusBar(status);

    expect(typeof bar).toBe('string');
    expect(bar.includes('\n')).toBe(false);
  });

  test('includes INFRA label', () => {
    const status = createMockStatus();
    const bar = renderInfrastructureStatusBar(status);

    expect(bar).toContain('[INFRA]');
  });

  test('includes health percentage', () => {
    const status = createMockStatus();
    const bar = renderInfrastructureStatusBar(status);

    expect(bar).toContain('100%');
  });

  test('includes tier counts', () => {
    const status = createMockStatus();
    const bar = renderInfrastructureStatusBar(status);

    // Should contain tier count indicators
    expect(bar).toContain('[');
    expect(bar).toContain(']');
  });
});
