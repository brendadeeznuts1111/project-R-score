/**
 * Monitoring Module
 * Real-time monitoring and dashboard utilities
 *
 * @module monitoring
 */

export {
  TerminalDashboard,
  createDashboard,
  type DashboardConfig,
  type MarketDisplayData,
  type SelectionDisplayData,
  type BufferMetrics,
  type PerformanceMetrics,
} from './terminal-dashboard';

// Dashboard Panels
export {
  MLTelemetryPanel,
  createMLTelemetryPanel,
  renderMLHeatmap,
  type MLTelemetryPanelConfig,
} from './panels';
