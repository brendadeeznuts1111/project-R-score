/**
 * Core Module - Main application exports
 */

// Metrics - Prometheus-compatible metrics collection
export {
  MetricsRegistry,
  collectSystemMetrics,
  MetricsStreamer,
  metrics,
  type MetricSeries,
  type MetricCollector,
  type MetricsSnapshot,
} from './metrics';

// Streaming Pipeline
export {
  StreamingPipeline,
  streamFileWithProgress,
  type StreamMetrics,
  type PipelineConfig,
} from './streams';

// WASM Engine
export {
  WasmEngine,
  wasmEngine,
  type WasmModule,
  type WasmConfig,
} from './wasm-engine';

// Edge Router
export {
  EdgeRouter,
  GeoLoadBalancer,
  EdgeKVCache,
  createEdgeHandler,
} from './edge-router';

// Realtime Dashboard
export {
  server as realtimeServer,
  telemetry,
  eliteDb as db,
  wsManager,
} from './realtime-dashboard';

// Fusion Runtime
export {
  FusionContextResolver,
  FusionContextExecutor,
  FusionDatabase,
  FusionCache,
  FusionUtils,
  SchemaValidator,
  SampleAccountAges,
  SampleBarberActions,
  type FusionContext,
  type ContextualExecutionResult,
  type ValidationResult,
} from './barber-fusion-runtime';

// Backward compatibility aliases
export { MetricsRegistry as EliteMetricsRegistry } from './metrics';
export { StreamingPipeline as EliteStreamingPipeline } from './streams';
export { WasmEngine as EliteWasmEngine } from './wasm-engine';

// Payment Routing System
export {
  PaymentRouting,
  createPaymentSplit,
  getPaymentSplit,
  getPaymentSplitByTicket,
  updatePaymentSplitStatus,
  getPendingSplits,
  calculateSplit,
  createPaymentRoute,
  getPaymentRoute,
  getRoutesByBarber,
  getActiveRoutes,
  updatePaymentRoute,
  deletePaymentRoute,
  findBestRoute,
  resetDailyRouteTotals,
  createFallbackPlan,
  getFallbackPlan,
  getFallbackPlansByRoute,
  executeFallback,
  createRoutingConfig,
  getRoutingConfig,
  getActiveRoutingConfig,
  setActiveRoutingConfig,
  getRoutingStats,
  recordRoutingStats,
  evaluateRouteCondition,
  type PaymentSplitType,
  type PaymentRouteStatus,
  type FallbackTrigger,
  type PaymentMethod,
  type PaymentSplitRecipient,
  type PaymentSplit,
  type PaymentRoute,
  type PaymentRouteCondition,
  type FallbackPlan,
  type FallbackExecution,
  type RoutingConfig,
  type RouteEvaluationContext,
  type SplitCalculationInput,
  type SplitCalculationResult,
  type PaymentRoutingStats,
} from './payment-routing';

// Payment Routing UI
export {
  PaymentRoutingUI,
  renderPaymentRoutingPanel,
  renderRouteForm,
  renderFallbackForm,
  renderSplitForm,
  renderConfigForm,
  type SplitRecipientUI,
  type PendingPaymentUI,
} from './payment-routing-ui';
