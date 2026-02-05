/**
 * Kalman Filter Suite - Bun Implementation Index
 *
 * High-performance micro-structural pattern detection with sub-5ms latency
 * Complete integration of all patterns and edge deployment capabilities
 */

// Core Kalman filter implementation
export {
  AdaptiveKalmanFilter,
  type FilterState,
  type Regime,
} from "./adaptive_kalman.bun.ts";

// Pattern-specific implementations
export {
  VelocityConvexityKF,
  type LateGameOpportunity,
} from "./pattern_75.bun.ts";
export {
  MicrostructuralTickProcessor,
  type BetSignal,
  type MarketTick,
} from "./tick_processor.bun.ts";

// Server and deployment
export { default as EdgeWorker, queue, scheduled } from "./edge_worker.bun.ts";
export { default as WebSocketServer } from "./websocket_server.bun.ts";

// Testing and utilities
export { TickGenerator } from "./generate_ticks.bun.ts";

// Re-export for easy usage
import { AdaptiveKalmanFilter } from "./adaptive_kalman.bun.ts";
import { default as EdgeWorker } from "./edge_worker.bun.ts";
import { TickGenerator } from "./generate_ticks.bun.ts";
import { VelocityConvexityKF } from "./pattern_75.bun.ts";
import { MicrostructuralTickProcessor } from "./tick_processor.bun.ts";
import WebSocketServer from "./websocket_server.bun.ts";

export default {
  AdaptiveKalmanFilter,
  VelocityConvexityKF,
  MicrostructuralTickProcessor,
  TickGenerator,
  WebSocketServer,
  EdgeWorker,
};
