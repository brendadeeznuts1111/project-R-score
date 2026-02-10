#!/usr/bin/env bun
/**
 * Process Management Configuration
 * 
 * Benchmark-backed defaults for OS signal handling and process management.
 * Reference: Bun OS Signals Documentation
 */

// ============================================================================
// Benchmark-Backed Defaults
// ============================================================================

export const SIGNAL_BENCHMARKS = {
  handlerRegistrationOpsPerSec: 1_180_000,
  listenerCountOpsPerSec: 11_457_000,
  dispatchLatencyMs: 0.0001,
  baselineShutdownMs: 5,
} as const;

export const COMMAND_BENCHMARKS = {
  simpleOpsPerSec: 32_000,
  withEnvOpsPerSec: 31_800,
  withCwdOpsPerSec: 26_855,
  fullWrapperOpsPerSec: 21_913,
  avgLatencyMs: 0.046,
  p95LatencyMs: 0.1,
} as const;

export const MEMORY_BENCHMARKS = {
  baseMB: 45,
  perCommandBytes: 1024,
  signalStateBytes: 128,
  telemetryEntryBytes: 64,
  maxRecommendedMB: 512,
} as const;

// ============================================================================
// Configuration Interfaces & Defaults
// ============================================================================

export interface SignalConfig {
  enabled: boolean;
  gracefulShutdownTimeoutMs: number;
  forceExitAfterTimeout: boolean;
}

export const DEFAULT_SIGNAL_CONFIG: SignalConfig = {
  enabled: true,
  gracefulShutdownTimeoutMs: 5000, // Benchmark-backed: 5s allows for cleanup
  forceExitAfterTimeout: true,
};

export interface ChildProcessConfig {
  defaultTimeoutMs: number;
  maxBufferSize: number;
  validateBinary: boolean;
  maxConcurrent: number;
}

export const DEFAULT_CHILD_PROCESS_CONFIG: ChildProcessConfig = {
  defaultTimeoutMs: 30000,
  maxBufferSize: 10 * 1024 * 1024, // 10MB
  validateBinary: true,
  maxConcurrent: 100,
};

// ============================================================================
// Validation Functions
// ============================================================================

export function validatePerformanceMetrics(
  actual: { opsPerSec: number; latencyMs: number }
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];
  
  if (actual.opsPerSec < COMMAND_BENCHMARKS.fullWrapperOpsPerSec * 0.9) {
    violations.push(`Throughput below 90% of benchmark`);
  }
  
  if (actual.latencyMs > COMMAND_BENCHMARKS.avgLatencyMs * 1.5) {
    violations.push(`Latency exceeds 150% of benchmark`);
  }
  
  return { valid: violations.length === 0, violations };
}

// ============================================================================
// Signal Reference
// ============================================================================

/**
 * Signal Reference
 * 
 * SIGTERM (15) - Graceful shutdown, cleanup handlers run
 * SIGKILL (9)  - Force kill, immediate termination, no cleanup
 * SIGINT (2)   - Ctrl+C, graceful shutdown
 * SIGHUP (1)   - Terminal closed
 * 
 * Exit Codes: 128 + signal_number
 * - SIGINT:  130 (128 + 2)
 * - SIGTERM: 143 (128 + 15)
 * - SIGKILL: 137 (128 + 9)
 */

// ============================================================================
// Main Config Export
// ============================================================================

export const PROCESS_MANAGEMENT_CONFIG = {
  signals: DEFAULT_SIGNAL_CONFIG,
  childProcess: DEFAULT_CHILD_PROCESS_CONFIG,
  benchmarks: {
    signals: SIGNAL_BENCHMARKS,
    commands: COMMAND_BENCHMARKS,
    memory: MEMORY_BENCHMARKS,
  },
} as const;

export default PROCESS_MANAGEMENT_CONFIG;

// CLI Output
if (import.meta.main) {
  console.log('⚙️  Process Management Configuration\n');
  console.log('=====================================\n');
  console.log('Signal Handling:');
  console.log(`  Timeout: ${DEFAULT_SIGNAL_CONFIG.gracefulShutdownTimeoutMs}ms`);
  console.log(`  Force exit: ${DEFAULT_SIGNAL_CONFIG.forceExitAfterTimeout}`);
  console.log('');
  console.log('Benchmarks:');
  console.log(`  Signal dispatch: ${SIGNAL_BENCHMARKS.dispatchLatencyMs}ms`);
  console.log(`  Command latency: ${COMMAND_BENCHMARKS.avgLatencyMs}ms`);
  console.log(`  Memory base: ${MEMORY_BENCHMARKS.baseMB}MB`);
}
