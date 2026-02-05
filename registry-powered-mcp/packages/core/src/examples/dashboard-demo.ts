#!/usr/bin/env bun
/**
 * Live Dashboard Demo
 * Real-time sportsbook monitoring with TerminalDashboard
 *
 * Run: bun packages/core/src/examples/dashboard-demo.ts
 */

import { ExchangeHandler } from '../sportsbook/exchange-handler';
import { TerminalDashboard } from '../monitoring/terminal-dashboard';

// Create exchange handler with mock data
const handler = new ExchangeHandler({
  mockMode: true,
  mockIntervalMs: 100,      // 10 updates/second
  mockMarketsCount: 5,      // 5 markets
  enableRiskAlerts: true,
  enableArbitrageAlerts: true,
});

// Create terminal dashboard
const dashboard = new TerminalDashboard({
  refreshIntervalMs: 100,   // 10 FPS
  maxRows: 15,
  enableHyperlinks: true,
  showBufferMetrics: true,
  showPerformanceMetrics: true,
});

// Attach dashboard to handler
handler.attachDashboard(dashboard);

// Start both
console.log('\x1b[2J\x1b[H'); // Clear screen
dashboard.start();
handler.start();

// Handle graceful shutdown
process.on('SIGINT', () => {
  dashboard.stop();
  handler.stop();
  console.log('\n\n📊 Dashboard demo stopped.');
  console.log('Final metrics:', JSON.stringify(handler.getMetrics(), null, 2));
  process.exit(0);
});

console.log('🎰 Live Dashboard Demo started. Press Ctrl+C to exit.\n');
