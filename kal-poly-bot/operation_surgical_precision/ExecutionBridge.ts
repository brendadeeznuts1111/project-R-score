// Component #42: Execution Bridge
// TypeScript-to-Rust execution bridge for live arbitrage

import { nanoseconds } from 'bun';
import { ValidatedArbitragePattern } from './LiveExecutionEngine';

// =============================================================================
// EXECUTION BRIDGE - RUST INTEGRATION
// =============================================================================

/// Execution bridge configuration
export const EXECUTION_BRIDGE_CONFIG = {
  RUST_EXECUTABLE_PATH: './poly-kalshi-arb/target/release/poly-kalshi-arb',
  EXECUTION_TIMEOUT_MS: 5000,
  MAX_CONCURRENT_EXECUTIONS: 50,
  BRIDGE_BUFFER_SIZE: 1024 * 1024, // 1MB
};

/// Bridge execution result
export interface BridgeExecutionResult {
  success: boolean;
  kalshi_fill_price?: number;
  polymarket_fill_price?: number;
  actual_profit: number;
  execution_time_ns: bigint;
  error_message?: string;
}

/// Execution bridge to Rust engines
export class ExecutionBridge {
  private active_executions: Map<string, Promise<BridgeExecutionResult>>;
  private execution_queue: ValidatedArbitragePattern[];
  private rust_process_pool: Map<string, RustProcessHandle>;

  constructor() {
    this.active_executions = new Map();
    this.execution_queue = [];
    this.rust_process_pool = new Map();

    this.initializeProcessPool();
  }

  /// Initialize pool of Rust execution processes
  private initializeProcessPool(): void {
    // Create multiple Rust process instances for concurrent execution
    for (let i = 0; i < EXECUTION_BRIDGE_CONFIG.MAX_CONCURRENT_EXECUTIONS / 10; i++) {
      const process_id = `rust_exec_${i}`;
      const handle = this.spawnRustProcess(process_id);
      this.rust_process_pool.set(process_id, handle);
    }

    console.log(`[EXEC-BRIDGE] Initialized ${this.rust_process_pool.size} Rust execution processes`);
  }

  /// Spawn a Rust execution process
  private spawnRustProcess(processId: string): RustProcessHandle {
    const rust_process = Bun.spawn(EXECUTION_BRIDGE_CONFIG.RUST_EXECUTABLE_PATH, [
      '--execution-mode',
      '--bridge-interface',
      '--process-id', processId
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd(),
      env: {
        ...process.env,
        RUST_BACKTRACE: '1',
        EXECUTION_BRIDGE_MODE: '1'
      }
    });

    const handle = new RustProcessHandle(processId, rust_process);
    handle.startMonitoring();

    rust_process.exited.then((exitCode) => {
      console.warn(`[EXEC-BRIDGE] Rust process ${processId} exited with code ${exitCode}`);
      // Respawn process
      setTimeout(() => {
        const new_handle = this.spawnRustProcess(processId);
        this.rust_process_pool.set(processId, new_handle);
      }, 1000);
    });

    return handle;
  }

  /// Execute arbitrage signal via Rust bridge
  async executeArbitrageSignal(signal: ValidatedArbitragePattern): Promise<BridgeExecutionResult> {
    const execution_id = `exec_${signal.pattern_id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Check execution limits
    if (this.active_executions.size >= EXECUTION_BRIDGE_CONFIG.MAX_CONCURRENT_EXECUTIONS) {
      // Queue execution if at capacity
      this.execution_queue.push(signal);
      return {
        success: false,
        actual_profit: 0,
        execution_time_ns: 0n,
        error_message: 'Execution queue full - signal queued'
      };
    }

    const execution_promise = this.performExecution(signal, execution_id);
    this.active_executions.set(execution_id, execution_promise);

    try {
      const result = await execution_promise;

      // Process queued executions if capacity freed up
      if (this.execution_queue.length > 0 && this.active_executions.size < EXECUTION_BRIDGE_CONFIG.MAX_CONCURRENT_EXECUTIONS) {
        const queued_signal = this.execution_queue.shift();
        if (queued_signal) {
          setImmediate(() => this.executeArbitrageSignal(queued_signal));
        }
      }

      return result;
    } finally {
      this.active_executions.delete(execution_id);
    }
  }

  /// Perform actual execution via Rust process
  private async performExecution(signal: ValidatedArbitragePattern, executionId: string): Promise<BridgeExecutionResult> {
    const start_time = nanoseconds();

    try {
      // Find available Rust process
      const rust_process = await this.getAvailableRustProcess();
      if (!rust_process) {
        throw new Error('No available Rust execution processes');
      }

      // Convert pattern to Rust-compatible format
      const rust_request = this.convertToRustRequest(signal, executionId);

      // Send execution request to Rust process
      const response = await this.sendToRustProcess(rust_process, rust_request);

      // Convert response back to TypeScript format
      const result = this.convertFromRustResponse(response);

      result.execution_time_ns = nanoseconds() - start_time;

      return result;

    } catch (error) {
      const error_message = error instanceof Error ? error.message : 'Unknown execution error';

      console.error(`[EXEC-BRIDGE] Execution failed for pattern ${signal.pattern_id}:`, error_message);

      return {
        success: false,
        actual_profit: 0,
        execution_time_ns: nanoseconds() - start_time,
        error_message
      };
    }
  }

  /// Get available Rust process from pool
  private async getAvailableRustProcess(): Promise<RustProcessHandle | null> {
    // Simple round-robin selection - could be enhanced with load balancing
    for (const [process_id, process] of this.rust_process_pool) {
      if (process.isAvailable()) {
        return process;
      }
    }

    return null;
  }

  /// Send request to Rust process and get response
  private async sendToRustProcess(process: RustProcessHandle, request: RustExecutionRequest): Promise<RustExecutionResponse> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Execution timeout after ${EXECUTION_BRIDGE_CONFIG.EXECUTION_TIMEOUT_MS}ms`));
      }, EXECUTION_BRIDGE_CONFIG.EXECUTION_TIMEOUT_MS);

      process.sendRequest(request, (response) => {
        clearTimeout(timeout);
        resolve(response);
      }, (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  /// Convert TypeScript pattern to Rust execution request
  private convertToRustRequest(signal: ValidatedArbitragePattern, executionId: string): RustExecutionRequest {
    // Convert arb type
    let arb_type: RustArbType;
    switch (signal.arb_type) {
      case 'latency':
        arb_type = 'latency_arbitrage';
        break;
      case 'statistical':
        arb_type = 'statistical_arbitrage';
        break;
      case 'structural':
        arb_type = 'structural_arbitrage';
        break;
      default:
        throw new Error(`Unknown arb type: ${signal.arb_type}`);
    }

    return {
      execution_id: executionId,
      pattern_id: signal.pattern_id,
      timestamp_ns: signal.timestamp_ns,
      arb_type,

      // Kalshi market data
      kalshi_market: {
        ticker: signal.kalshi_market.ticker,
        side: signal.kalshi_market.side,
        price_cents: signal.kalshi_market.price,
        size_cents: signal.kalshi_market.size
      },

      // Polymarket data
      polymarket_market: {
        token_id: signal.polymarket_market.token_id,
        side: signal.polymarket_market.side,
        price_cents: signal.polymarket_market.price,
        size_cents: signal.polymarket_market.size
      },

      // Risk parameters
      expected_edge_cents: signal.expected_edge,
      sharp_score: signal.sharp_score,
      confidence_score: signal.confidence_score,

      // Execution constraints
      max_execution_time_ns: BigInt(5_000_000_000), // 5 seconds
      risk_limits: {
        max_position_size: EXECUTION_BRIDGE_CONFIG.MAX_CONCURRENT_EXECUTIONS,
        sharp_score_threshold: 0.65
      }
    };
  }

  /// Convert Rust response to TypeScript result
  private convertFromRustResponse(response: RustExecutionResponse): BridgeExecutionResult {
    return {
      success: response.success,
      kalshi_fill_price: response.kalshi_fill_price_cents,
      polymarket_fill_price: response.polymarket_fill_price_cents,
      actual_profit: response.actual_profit_cents,
      execution_time_ns: response.execution_time_ns,
      error_message: response.error_message
    };
  }

  /// Get bridge statistics
  getBridgeStats() {
    return {
      active_executions: this.active_executions.size,
      queued_executions: this.execution_queue.length,
      rust_processes: this.rust_process_pool.size,
      available_processes: Array.from(this.rust_process_pool.values()).filter(p => p.isAvailable()).length
    };
  }

  /// Shutdown bridge and cleanup processes
  async shutdown(): Promise<void> {
    console.log('[EXEC-BRIDGE] Shutting down execution bridge...');

    // Wait for active executions to complete
    await Promise.allSettled(Array.from(this.active_executions.values()));

    // Terminate Rust processes
    for (const [process_id, handle] of this.rust_process_pool) {
      handle.terminate();
    }

    this.rust_process_pool.clear();
    console.log('[EXEC-BRIDGE] Execution bridge shutdown complete');
  }
}

// =============================================================================
// RUST PROCESS HANDLE
// =============================================================================

/// Handle for individual Rust execution process
class RustProcessHandle {
  private process_id: string;
  private rust_process: ReturnType<typeof Bun.spawn>;
  private is_busy: boolean = false;
  private pending_requests: Map<string, { resolve: Function; reject: Function }> = new Map();

  constructor(processId: string, rustProcess: ReturnType<typeof Bun.spawn>) {
    this.process_id = processId;
    this.rust_process = rustProcess;
  }

  /// Check if process is available for new requests
  isAvailable(): boolean {
    return !this.is_busy && this.rust_process && !this.rust_process.killed;
  }

  /// Send execution request to Rust process
  sendRequest(request: RustExecutionRequest, onResponse: (response: RustExecutionResponse) => void, onError: (error: Error) => void): void {
    if (this.is_busy) {
      onError(new Error('Process is busy'));
      return;
    }

    this.is_busy = true;
    this.pending_requests.set(request.execution_id, { resolve: onResponse, reject: onError });

    // Send request to Rust process via stdin
    const request_json = JSON.stringify(request) + '\n';
    this.rust_process.stdin.write(request_json);
  }

  /// Start monitoring process for responses
  startMonitoring(): void {
    // Monitor stdout for responses using Bun's ReadableStream
    const stdout_reader = this.rust_process.stdout.getReader();
    const stderr_reader = this.rust_process.stderr.getReader();

    // Handle stdout responses
    (async () => {
      try {
        while (true) {
          const { done, value } = await stdout_reader.read();
          if (done) break;

          try {
            const response: RustExecutionResponse = JSON.parse(new TextDecoder().decode(value).trim());
            const pending = this.pending_requests.get(response.execution_id);

            if (pending) {
              pending.resolve(response);
              this.pending_requests.delete(response.execution_id);
              this.is_busy = false;
            }
          } catch (error) {
            console.error(`[RUST-PROCESS] Failed to parse response from ${this.process_id}:`, error);
          }
        }
      } catch (error) {
        console.error(`[RUST-PROCESS] Error reading stdout from ${this.process_id}:`, error);
      }
    })();

    // Handle stderr errors
    (async () => {
      try {
        while (true) {
          const { done, value } = await stderr_reader.read();
          if (done) break;

          console.error(`[RUST-PROCESS] Error from ${this.process_id}:`, new TextDecoder().decode(value));
        }
      } catch (error) {
        console.error(`[RUST-PROCESS] Error reading stderr from ${this.process_id}:`, error);
      }
    })();
  }

  /// Terminate the Rust process
  terminate(): void {
    if (this.rust_process && !this.rust_process.killed) {
      this.rust_process.kill('SIGTERM');

      // Force kill after timeout
      setTimeout(() => {
        if (!this.rust_process.killed) {
          this.rust_process.kill('SIGKILL');
        }
      }, 5000);
    }
  }
}

// =============================================================================
// RUST INTERFACE TYPES
// =============================================================================

/// Rust-compatible execution request
interface RustExecutionRequest {
  execution_id: string;
  pattern_id: number;
  timestamp_ns: bigint;
  arb_type: RustArbType;

  kalshi_market: {
    ticker: string;
    side: 'yes' | 'no';
    price_cents: number;
    size_cents: number;
  };

  polymarket_market: {
    token_id: string;
    side: 'yes' | 'no';
    price_cents: number;
    size_cents: number;
  };

  expected_edge_cents: number;
  sharp_score: number;
  confidence_score: number;

  max_execution_time_ns: bigint;
  risk_limits: {
    max_position_size: number;
    sharp_score_threshold: number;
  };
}

/// Rust-compatible execution response
interface RustExecutionResponse {
  execution_id: string;
  success: boolean;
  kalshi_fill_price_cents?: number;
  polymarket_fill_price_cents?: number;
  actual_profit_cents: number;
  execution_time_ns: bigint;
  error_message?: string;
}

type RustArbType = 'latency_arbitrage' | 'statistical_arbitrage' | 'structural_arbitrage';

// =============================================================================
// EXPORTS
// =============================================================================

export type { BridgeExecutionResult, RustExecutionRequest, RustExecutionResponse };