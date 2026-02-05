/**
 * Dashboard Panels
 * Modular panel components for terminal monitoring
 *
 * @module monitoring/panels
 */

// ML Telemetry Panel
export {
  MLTelemetryPanel,
  createMLTelemetryPanel,
  renderMLHeatmap,
  type MLTelemetryPanelConfig,
} from './ml-telemetry';

// Infrastructure Status Panel (Component #41)
export {
  InfrastructureStatusPanel,
  createInfrastructurePanel,
  renderInfrastructureHeatmap,
  renderInfrastructureStatusBar,
  type InfrastructurePanelConfig,
} from './infrastructure-status';

// Half-Life Heatmap Panel (Propagation Framework)
export {
  HalfLifeHeatmapPanel,
  createHeatmapPanel,
  renderHalfLifeHeatmap,
  createEmptyHeatmap,
  calculateHeat,
  DEFAULT_HEATMAP_CONFIG,
  type HeatmapPanelConfig,
} from './half-life-heatmap';

// Propagation Alerts Panel (Propagation Framework)
export {
  PropagationAlertsPanel,
  createAlertsPanel,
  renderPropagationAlerts,
  formatPatternAlert,
  getPatternSeverityLevel,
  DEFAULT_ALERTS_CONFIG,
  type AlertsPanelConfig,
} from './propagation-alerts';
