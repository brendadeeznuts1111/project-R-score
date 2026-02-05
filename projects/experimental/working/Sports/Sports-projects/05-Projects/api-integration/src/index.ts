// API Integration - Entry Point

export { SportradarClient } from "./sportradar-client";
export type { ConnectionState } from "./sportradar-client";
export { OddsClient } from "./odds-client";
export { ClientPool, getPool, resetPool } from "./client-pool";
export {
  createServer,
  handleGameEvent,
  handleOddsUpdate,
  enableDB,
  isDBEnabled,
  broadcast,
} from "./server";
export { loadConfig, validateConfig, DEFAULT_CONFIG } from "./config";
export * as db from "./db";
export type {
  ApiConfig,
  GameEvent,
  OddsData,
  ConnectionStatus,
  EventHandler,
} from "./types";
