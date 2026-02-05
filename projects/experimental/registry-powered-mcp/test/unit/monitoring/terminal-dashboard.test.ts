/**
 * Terminal Dashboard Tests
 * Validates real-time sportsbook monitoring display
 *
 * @module monitoring/terminal-dashboard.test
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import {
  TerminalDashboard,
  createDashboard,
  type MarketDisplayData,
  type BufferMetrics,
  type PerformanceMetrics,
} from '../../../packages/core/src/monitoring/terminal-dashboard';
import { HyperlinkManager } from '../../../packages/core/src/terminal/hyperlink-manager';

describe('TerminalDashboard', () => {
  let dashboard: TerminalDashboard;

  beforeEach(() => {
    HyperlinkManager.reset();
    dashboard = new TerminalDashboard({
      refreshIntervalMs: 1000, // Slow refresh for tests
      maxRows: 10,
      terminalWidth: 120,
    });
  });

  afterEach(() => {
    dashboard.stop();
    HyperlinkManager.reset();
  });

  describe('Initialization', () => {
    test('creates dashboard with default config', () => {
      const d = new TerminalDashboard();
      expect(d).toBeDefined();
      expect(d.isActive()).toBe(false);
      d.stop();
    });

    test('creates dashboard with custom config', () => {
      const d = new TerminalDashboard({
        refreshIntervalMs: 200,
        maxRows: 15,
        enableHyperlinks: false,
        showBufferMetrics: false,
        showPerformanceMetrics: false,
        terminalWidth: 80,
      });
      expect(d).toBeDefined();
      d.stop();
    });

    test('createDashboard convenience function works', () => {
      const d = createDashboard({ maxRows: 5 });
      expect(d).toBeDefined();
      d.stop();
    });
  });

  describe('Dashboard State', () => {
    test('initial state is empty', () => {
      const state = dashboard.getState();
      expect(state.markets).toEqual([]);
      expect(state.bufferMetrics).toBeNull();
      expect(state.performanceMetrics).toBeNull();
      expect(state.frameCount).toBe(0);
    });

    test('updateMarkets updates state', () => {
      const markets: MarketDisplayData[] = [
        {
          marketId: 'market-1',
          name: 'Test Market',
          status: 'ACTIVE',
          selections: [
            { selectionId: 'sel-1', name: 'Selection 1', odds: 2.5 },
          ],
        },
      ];

      dashboard.updateMarkets(markets);

      const state = dashboard.getState();
      expect(state.markets).toHaveLength(1);
      expect(state.markets[0].marketId).toBe('market-1');
      expect(state.lastUpdate).toBeGreaterThan(0);
    });

    test('updateBufferMetrics updates state', () => {
      const metrics: BufferMetrics = {
        activeCount: 10,
        totalAllocatedBytes: 1024,
        potentialLeaks: 0,
        byType: { Uint8Array: { count: 5, bytes: 512 } },
      };

      dashboard.updateBufferMetrics(metrics);

      const state = dashboard.getState();
      expect(state.bufferMetrics).not.toBeNull();
      expect(state.bufferMetrics!.activeCount).toBe(10);
    });

    test('updatePerformanceMetrics updates state', () => {
      const metrics: PerformanceMetrics = {
        throughput: 1000,
        p99LatencyMs: 5.5,
        messagesSent: 50000,
        uptime: 3600,
        clients: 25,
      };

      dashboard.updatePerformanceMetrics(metrics);

      const state = dashboard.getState();
      expect(state.performanceMetrics).not.toBeNull();
      expect(state.performanceMetrics!.throughput).toBe(1000);
    });
  });

  describe('Dashboard Lifecycle', () => {
    test('start activates dashboard', () => {
      expect(dashboard.isActive()).toBe(false);
      dashboard.start();
      expect(dashboard.isActive()).toBe(true);
    });

    test('stop deactivates dashboard', () => {
      dashboard.start();
      expect(dashboard.isActive()).toBe(true);
      dashboard.stop();
      expect(dashboard.isActive()).toBe(false);
    });

    test('multiple start calls are idempotent', () => {
      dashboard.start();
      dashboard.start();
      dashboard.start();
      expect(dashboard.isActive()).toBe(true);
    });

    test('multiple stop calls are safe', () => {
      dashboard.start();
      dashboard.stop();
      dashboard.stop();
      dashboard.stop();
      expect(dashboard.isActive()).toBe(false);
    });
  });

  describe('Market Data Handling', () => {
    test('handles multiple markets', () => {
      const markets: MarketDisplayData[] = [
        {
          marketId: 'm1',
          name: 'Market 1',
          status: 'ACTIVE',
          selections: [
            { selectionId: 's1', name: 'Sel 1', odds: 1.5 },
            { selectionId: 's2', name: 'Sel 2', odds: 2.5 },
          ],
        },
        {
          marketId: 'm2',
          name: 'Market 2',
          status: 'SUSPENDED',
          selections: [
            { selectionId: 's3', name: 'Sel 3', odds: 3.0 },
          ],
        },
      ];

      dashboard.updateMarkets(markets);

      const state = dashboard.getState();
      expect(state.markets).toHaveLength(2);
      expect(state.markets[0].selections).toHaveLength(2);
    });

    test('handles market with URL', () => {
      const markets: MarketDisplayData[] = [
        {
          marketId: 'm1',
          name: 'Market 1',
          status: 'ACTIVE',
          url: 'https://example.com/market/1',
          selections: [],
        },
      ];

      dashboard.updateMarkets(markets);

      const state = dashboard.getState();
      expect(state.markets[0].url).toBe('https://example.com/market/1');
    });

    test('handles selection with previous odds', () => {
      const markets: MarketDisplayData[] = [
        {
          marketId: 'm1',
          name: 'Market 1',
          status: 'ACTIVE',
          selections: [
            {
              selectionId: 's1',
              name: 'Selection',
              odds: 2.5,
              previousOdds: 2.3,
              volume: 10000,
            },
          ],
        },
      ];

      dashboard.updateMarkets(markets);

      const state = dashboard.getState();
      expect(state.markets[0].selections[0].previousOdds).toBe(2.3);
      expect(state.markets[0].selections[0].volume).toBe(10000);
    });

    test('handles all market statuses', () => {
      const statuses: Array<'ACTIVE' | 'SUSPENDED' | 'CLOSED'> = [
        'ACTIVE',
        'SUSPENDED',
        'CLOSED',
      ];

      for (const status of statuses) {
        const markets: MarketDisplayData[] = [
          {
            marketId: 'm1',
            name: 'Market',
            status,
            selections: [],
          },
        ];

        dashboard.updateMarkets(markets);
        expect(dashboard.getState().markets[0].status).toBe(status);
      }
    });
  });

  describe('Metrics Handling', () => {
    test('handles buffer metrics with type breakdown', () => {
      const metrics: BufferMetrics = {
        activeCount: 15,
        totalAllocatedBytes: 4096,
        potentialLeaks: 2,
        byType: {
          Uint8Array: { count: 10, bytes: 1024 },
          Uint32Array: { count: 5, bytes: 3072 },
        },
      };

      dashboard.updateBufferMetrics(metrics);

      const state = dashboard.getState();
      expect(state.bufferMetrics!.byType).toBeDefined();
      expect(state.bufferMetrics!.byType!['Uint8Array'].count).toBe(10);
    });

    test('handles buffer metrics without type breakdown', () => {
      const metrics: BufferMetrics = {
        activeCount: 5,
        totalAllocatedBytes: 512,
        potentialLeaks: 0,
      };

      dashboard.updateBufferMetrics(metrics);

      const state = dashboard.getState();
      expect(state.bufferMetrics!.byType).toBeUndefined();
    });

    test('handles large performance values', () => {
      const metrics: PerformanceMetrics = {
        throughput: 100000,
        p99LatencyMs: 0.05,
        messagesSent: 10000000,
        uptime: 86400 * 7, // 1 week
        clients: 1000,
      };

      dashboard.updatePerformanceMetrics(metrics);

      const state = dashboard.getState();
      expect(state.performanceMetrics!.messagesSent).toBe(10000000);
    });
  });

  describe('Rendering (Non-Visual)', () => {
    test('frame count increments when running', async () => {
      // Use a very fast refresh for testing
      const d = new TerminalDashboard({
        refreshIntervalMs: 10,
        terminalWidth: 80,
      });

      d.start();
      await Bun.sleep(50);
      d.stop();

      // Frame count should have incremented
      const state = d.getState();
      expect(state.frameCount).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    test('handles empty markets array', () => {
      dashboard.updateMarkets([]);
      expect(dashboard.getState().markets).toEqual([]);
    });

    test('handles market with no selections', () => {
      dashboard.updateMarkets([
        {
          marketId: 'm1',
          name: 'Empty Market',
          status: 'CLOSED',
          selections: [],
        },
      ]);

      expect(dashboard.getState().markets[0].selections).toHaveLength(0);
    });

    test('handles very long market names', () => {
      const longName = 'A'.repeat(100);
      dashboard.updateMarkets([
        {
          marketId: 'm1',
          name: longName,
          status: 'ACTIVE',
          selections: [],
        },
      ]);

      expect(dashboard.getState().markets[0].name.length).toBe(100);
    });

    test('handles special characters in names', () => {
      dashboard.updateMarkets([
        {
          marketId: 'm1',
          name: 'Market <>&"\'',
          status: 'ACTIVE',
          selections: [
            { selectionId: 's1', name: 'Sel ™®©', odds: 1.5 },
          ],
        },
      ]);

      const state = dashboard.getState();
      expect(state.markets[0].name).toContain('&');
    });

    test('handles zero values in metrics', () => {
      dashboard.updateBufferMetrics({
        activeCount: 0,
        totalAllocatedBytes: 0,
        potentialLeaks: 0,
      });

      dashboard.updatePerformanceMetrics({
        throughput: 0,
        p99LatencyMs: 0,
        messagesSent: 0,
        uptime: 0,
        clients: 0,
      });

      const state = dashboard.getState();
      expect(state.bufferMetrics!.activeCount).toBe(0);
      expect(state.performanceMetrics!.throughput).toBe(0);
    });

    test('handles negative odds change', () => {
      dashboard.updateMarkets([
        {
          marketId: 'm1',
          name: 'Market',
          status: 'ACTIVE',
          selections: [
            { selectionId: 's1', name: 'Sel', odds: 2.0, previousOdds: 2.5 },
          ],
        },
      ]);

      const state = dashboard.getState();
      expect(state.markets[0].selections[0].odds).toBe(2.0);
      expect(state.markets[0].selections[0].previousOdds).toBe(2.5);
    });
  });

  describe('Configuration Options', () => {
    test('respects maxRows config', () => {
      const d = new TerminalDashboard({ maxRows: 3, terminalWidth: 80 });

      // Even with many selections, maxRows limits display
      const markets: MarketDisplayData[] = [
        {
          marketId: 'm1',
          name: 'Market',
          status: 'ACTIVE',
          selections: Array.from({ length: 10 }, (_, i) => ({
            selectionId: `s${i}`,
            name: `Sel ${i}`,
            odds: 1.5 + i * 0.1,
          })),
        },
      ];

      d.updateMarkets(markets);
      // The config is set, actual limiting happens during render
      expect(d.getState().markets[0].selections).toHaveLength(10);

      d.stop();
    });

    test('hyperlinks can be disabled', () => {
      const d = new TerminalDashboard({
        enableHyperlinks: false,
        terminalWidth: 80,
      });

      d.updateMarkets([
        {
          marketId: 'm1',
          name: 'Market',
          status: 'ACTIVE',
          url: 'https://example.com',
          selections: [],
        },
      ]);

      // Hyperlinks disabled, URL still stored
      expect(d.getState().markets[0].url).toBe('https://example.com');

      d.stop();
    });

    test('metrics displays can be disabled', () => {
      const d = new TerminalDashboard({
        showBufferMetrics: false,
        showPerformanceMetrics: false,
        terminalWidth: 80,
      });

      // Even with metrics updated, they won't be displayed
      d.updateBufferMetrics({ activeCount: 5, totalAllocatedBytes: 100, potentialLeaks: 0 });
      d.updatePerformanceMetrics({ throughput: 100, p99LatencyMs: 1, messagesSent: 10, uptime: 60, clients: 1 });

      // Metrics are still stored
      expect(d.getState().bufferMetrics).not.toBeNull();
      expect(d.getState().performanceMetrics).not.toBeNull();

      d.stop();
    });
  });
});
