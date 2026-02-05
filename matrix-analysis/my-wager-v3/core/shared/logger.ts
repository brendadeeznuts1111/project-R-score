// core/shared/logger.ts
// Omega Phase 3.25 Structured Telemetry Logger

import { write } from "bun";
import { join } from "path";

// Type definitions for globalThis extension
declare global {
  var omegaBroadcast: ((data: any) => void) | undefined;
}

export interface OmegaLogEntry {
  ts: number;
  level: "INFO" | "WARN" | "CRIT" | "DEBUG";
  msg: string;
  meta?: Record<string, any>;
  version?: string;
  matrix_cols?: {
    heap_usage_mb?: number;
    event_loop_lag_ns?: number;
    active_connections?: number;
    jit_optimized_count?: number;
    zstd_compression_ratio?: number;
  };
}

// Ensure logs directory exists
const LOGS_DIR = "./logs";
const LOG_FILE = join(LOGS_DIR, `omega-${new Date().toISOString().split('T')[0]}.log`);

// Matrix columns 76-80 telemetry
export const getMatrixTelemetry = (): OmegaLogEntry['matrix_cols'] => {
  const memUsage = process.memoryUsage();
  return {
    heap_usage_mb: Math.round((memUsage.heapUsed / 1024 / 1024) * 100) / 100,
    event_loop_lag_ns: Bun.nanoseconds() % 1000000, // Microsecond precision
    active_connections: 0, // Will be updated by server
    jit_optimized_count: Math.floor(Math.random() * 1000), // Placeholder for bun:jsc stats
    zstd_compression_ratio: 0.85 // Placeholder for Zstd metrics
  };
};

export const logOmega = async (
  level: OmegaLogEntry['level'],
  msg: string,
  meta: Record<string, any> = {}
): Promise<void> => {
  const entry: OmegaLogEntry = {
    ts: Bun.nanoseconds(),
    level,
    msg,
    meta,
    version: Bun.env.GIT_SHA || 'dev',
    matrix_cols: getMatrixTelemetry()
  };

  // 1. Terminal Output (WrapAnsi for legibility)
  const colorCode = level === 'CRIT' ? '\x1b[41m' :
                    level === 'WARN' ? '\x1b[43m' :
                    level === 'INFO' ? '\x1b[42m' : '\x1b[44m';
  const reset = '\x1b[0m';
  console.log(`${colorCode}[${level}]${reset} ${msg}`);

  // 2. Persistent Matrix Log (Col 75-80)
  try {
    const logLine = JSON.stringify(entry) + '\n';
    await write(LOG_FILE, logLine);
  } catch (error) {
    console.error('Failed to write omega log:', error);
  }

  // 3. Broadcast to dashboard clients (if available)
  if (globalThis.omegaBroadcast) {
    globalThis.omegaBroadcast({
      type: 'omega_log',
      data: entry
    });
  }
};

// Convenience methods
export const logInfo = (msg: string, meta?: Record<string, any>) =>
  logOmega('INFO', msg, meta);

export const logWarn = (msg: string, meta?: Record<string, any>) =>
  logOmega('WARN', msg, meta);

export const logCrit = (msg: string, meta?: Record<string, any>) =>
  logOmega('CRIT', msg, meta);

export const logDebug = (msg: string, meta?: Record<string, any>) =>
  logOmega('DEBUG', msg, meta);

// Initialize logs directory
write(LOG_FILE, '', { createPath: true });
