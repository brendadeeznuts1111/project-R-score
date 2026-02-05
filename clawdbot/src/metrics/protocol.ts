/**
 * Metrics WebSocket Protocol - Discriminated union message types.
 * Type-safe messaging between server and clients.
 */

import type { MetricsData, SkillExecutionRecord } from "./types.js";

// ─────────────────────────────────────────────────────────────────────────────
// Alert Types
// ─────────────────────────────────────────────────────────────────────────────

export type AlertSeverity = "info" | "warning" | "critical";

export type AlertType =
  | "latency_spike"
  | "error_rate"
  | "memory_high"
  | "cache_miss"
  | "storage_full"
  | "skill_failure";

export type Alert = {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
  skillId?: string;
  dismissed?: boolean;
};

// ─────────────────────────────────────────────────────────────────────────────
// Threshold Configuration
// ─────────────────────────────────────────────────────────────────────────────

export type Thresholds = {
  latencySpikePercent: number; // default: 50 - Alert if latency exceeds baseline by this %
  errorRateCritical: number; // default: 5 - Critical alert threshold
  errorRateWarning: number; // default: 1 - Warning alert threshold
  cacheHitMin: number; // default: 90 - Minimum cache hit ratio
  storageMaxPercent: number; // default: 85 - Maximum storage usage
  memoryMaxMB: number; // default: 512 - Maximum memory usage in MB
  executionTimeMs: number; // default: 5000 - Skill execution time warning
};

export const DEFAULT_THRESHOLDS: Thresholds = {
  latencySpikePercent: 50,
  errorRateCritical: 5,
  errorRateWarning: 1,
  cacheHitMin: 90,
  storageMaxPercent: 85,
  memoryMaxMB: 512,
  executionTimeMs: 5000,
};

// ─────────────────────────────────────────────────────────────────────────────
// Server → Client Messages (Discriminated Union)
// ─────────────────────────────────────────────────────────────────────────────

export type ServerMessage =
  | { type: "snapshot"; data: MetricsData; timestamp: number }
  | { type: "update"; data: MetricsData; alerts?: Alert[]; timestamp: number }
  | { type: "execution"; record: SkillExecutionRecord; timestamp: number }
  | { type: "alert"; alert: Alert; timestamp: number }
  | { type: "thresholds"; thresholds: Thresholds; timestamp: number }
  | { type: "error"; error: string; code?: string; timestamp: number }
  | { type: "pong"; timestamp: number };

// ─────────────────────────────────────────────────────────────────────────────
// Client → Server Messages (Discriminated Union)
// ─────────────────────────────────────────────────────────────────────────────

export type ClientMessage =
  | { type: "subscribe"; skills?: string[] }
  | { type: "unsubscribe" }
  | { type: "get_snapshot" }
  | { type: "set_thresholds"; thresholds: Partial<Thresholds> }
  | { type: "dismiss_alert"; alertId: string }
  | { type: "ping" };

// ─────────────────────────────────────────────────────────────────────────────
// Message Handlers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Type-safe server message handler with exhaustive checking.
 */
export function handleServerMessage(
  msg: ServerMessage,
  handlers: {
    onSnapshot: (data: MetricsData) => void;
    onUpdate: (data: MetricsData, alerts?: Alert[]) => void;
    onExecution: (record: SkillExecutionRecord) => void;
    onAlert: (alert: Alert) => void;
    onThresholds: (thresholds: Thresholds) => void;
    onError: (error: string, code?: string) => void;
    onPong: () => void;
  },
): void {
  switch (msg.type) {
    case "snapshot":
      handlers.onSnapshot(msg.data);
      break;
    case "update":
      handlers.onUpdate(msg.data, msg.alerts);
      break;
    case "execution":
      handlers.onExecution(msg.record);
      break;
    case "alert":
      handlers.onAlert(msg.alert);
      break;
    case "thresholds":
      handlers.onThresholds(msg.thresholds);
      break;
    case "error":
      handlers.onError(msg.error, msg.code);
      break;
    case "pong":
      handlers.onPong();
      break;
    default:
      // Exhaustive check - TypeScript will error if a case is missing
      const _exhaustive: never = msg;
      console.warn("[metrics] Unknown message type:", _exhaustive);
  }
}

/**
 * Type-safe client message handler with exhaustive checking.
 */
export function handleClientMessage(
  msg: ClientMessage,
  handlers: {
    onSubscribe: (skills?: string[]) => void;
    onUnsubscribe: () => void;
    onGetSnapshot: () => void;
    onSetThresholds: (thresholds: Partial<Thresholds>) => void;
    onDismissAlert: (alertId: string) => void;
    onPing: () => void;
  },
): void {
  switch (msg.type) {
    case "subscribe":
      handlers.onSubscribe(msg.skills);
      break;
    case "unsubscribe":
      handlers.onUnsubscribe();
      break;
    case "get_snapshot":
      handlers.onGetSnapshot();
      break;
    case "set_thresholds":
      handlers.onSetThresholds(msg.thresholds);
      break;
    case "dismiss_alert":
      handlers.onDismissAlert(msg.alertId);
      break;
    case "ping":
      handlers.onPing();
      break;
    default:
      const _exhaustive: never = msg;
      console.warn("[metrics] Unknown client message type:", _exhaustive);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Message Builders
// ─────────────────────────────────────────────────────────────────────────────

export const serverMessages = {
  snapshot: (data: MetricsData): ServerMessage => ({
    type: "snapshot",
    data,
    timestamp: Date.now(),
  }),

  update: (data: MetricsData, alerts?: Alert[]): ServerMessage => ({
    type: "update",
    data,
    alerts,
    timestamp: Date.now(),
  }),

  execution: (record: SkillExecutionRecord): ServerMessage => ({
    type: "execution",
    record,
    timestamp: Date.now(),
  }),

  alert: (alert: Alert): ServerMessage => ({
    type: "alert",
    alert,
    timestamp: Date.now(),
  }),

  thresholds: (thresholds: Thresholds): ServerMessage => ({
    type: "thresholds",
    thresholds,
    timestamp: Date.now(),
  }),

  error: (error: string, code?: string): ServerMessage => ({
    type: "error",
    error,
    code,
    timestamp: Date.now(),
  }),

  pong: (): ServerMessage => ({
    type: "pong",
    timestamp: Date.now(),
  }),
};

export const clientMessages = {
  subscribe: (skills?: string[]): ClientMessage => ({
    type: "subscribe",
    skills,
  }),

  unsubscribe: (): ClientMessage => ({
    type: "unsubscribe",
  }),

  getSnapshot: (): ClientMessage => ({
    type: "get_snapshot",
  }),

  setThresholds: (thresholds: Partial<Thresholds>): ClientMessage => ({
    type: "set_thresholds",
    thresholds,
  }),

  dismissAlert: (alertId: string): ClientMessage => ({
    type: "dismiss_alert",
    alertId,
  }),

  ping: (): ClientMessage => ({
    type: "ping",
  }),
};
