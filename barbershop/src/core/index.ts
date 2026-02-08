/**
 * Core Module - Main application exports
 */

export { renderAdminDashboard, renderClientDashboard } from './ui-v2';
export type { BundleLineItem, TipInput, Barber, Ticket } from './barbershop-dashboard';

// ═══════════════════════════════════════════════════════════════════════════════
// ELITE DASHBOARD & METRICS MODULES
// ═══════════════════════════════════════════════════════════════════════════════

// Elite Metrics - Prometheus-compatible metrics collection
export {
  EliteMetricsRegistry,
  collectSystemMetrics,
  MetricsStreamer,
  metrics,
  type MetricSeries,
  type MetricCollector,
  type MetricsSnapshot,
} from './barber-elite-metrics';

// Elite Dashboard - WebSocket hub with real-time sync
export {
  server as eliteServer,
  telemetry,
  eliteDb,
  wsManager,
} from './barber-elite-dashboard';

// Elite Fusion - Predictive analytics runtime
export {
  EliteFusionRuntime,
  createFusionContext,
  withFusion,
  generateFusionReport,
  type FusionContext,
  type FusionSession,
  type FusionMetrics,
} from './barber-elite-fusion';

// Elite Edge - Edge routing and geo-distribution
export {
  EdgeRouter,
  GeoLoadBalancer,
  EdgeKVCache,
  createEdgeHandler,
  type EdgeContext,
  type ExecutionContext,
} from './barber-elite-edge';

// Elite Streams - WebSocket streaming with backpressure
export {
  EliteStreamingPipeline,
  streamFileWithProgress,
  type StreamMetrics,
  type PipelineConfig,
} from './barber-elite-streams';

// Elite WASM - WebAssembly compute with SIMD
export {
  EliteWasmEngine,
  wasmEngine,
  type WasmModule,
  type WasmConfig,
} from './barber-elite-wasm';
