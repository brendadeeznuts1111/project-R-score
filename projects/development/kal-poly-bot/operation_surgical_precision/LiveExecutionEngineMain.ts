// Component #42: Live Execution Engine Main Integration
// Main entry point and API endpoints for live arbitrage execution

import { LiveExecutionEngine } from './LiveExecutionEngine';
import { PatternIngestionService, PatternIngestionAPI } from './PatternIngestionService';
import { ExecutionBridge } from './ExecutionBridge';
import { RiskManagementSystem } from './RiskManagementSystem';
import { nanoseconds } from 'bun';

// =============================================================================
// LIVE EXECUTION ENGINE INTEGRATION
// =============================================================================

/// Live execution engine configuration
export const LIVE_ENGINE_CONFIG = {
  // Server configuration
  PORT: 8082,
  HOST: '0.0.0.0',

  // Health check configuration
  HEALTH_CHECK_INTERVAL: 30000, // 30 seconds

  // Shutdown configuration
  GRACEFUL_SHUTDOWN_TIMEOUT: 10000, // 10 seconds

  // Metrics configuration
  METRICS_RETENTION_HOURS: 24,
};

/// Main live execution engine integration
export class LiveExecutionEngineIntegration {
  private live_engine: LiveExecutionEngine;
  private ingestion_service: PatternIngestionService;
  private ingestion_api: PatternIngestionAPI;
  private execution_bridge: ExecutionBridge;
  private risk_manager: RiskManagementSystem;

  private server: any;
  private is_shutting_down: boolean = false;
  private start_time: bigint;

  constructor() {
    this.start_time = nanoseconds();

    // Initialize core components
    this.live_engine = new LiveExecutionEngine();
    this.execution_bridge = new ExecutionBridge();
    this.risk_manager = new RiskManagementSystem();

    // Initialize ingestion service and API
    this.ingestion_service = new PatternIngestionService(this.live_engine);
    this.ingestion_api = new PatternIngestionAPI(this.ingestion_service);

    console.log('[LIVE-INTEGRATION] Live Execution Engine initialized');
  }

  /// Start the live execution engine
  async start(): Promise<void> {
    console.log('[LIVE-INTEGRATION] Starting Live Execution Engine...');

    // Start HTTP server
    await this.startHttpServer();

    // Start health monitoring
    this.startHealthMonitoring();

    // Register shutdown handlers
    this.registerShutdownHandlers();

    console.log(`[LIVE-INTEGRATION] Live Execution Engine started on port ${LIVE_ENGINE_CONFIG.PORT}`);
    console.log(`[LIVE-INTEGRATION] Health check: http://${LIVE_ENGINE_CONFIG.HOST}:${LIVE_ENGINE_CONFIG.PORT}/health`);
    console.log(`[LIVE-INTEGRATION] Metrics: http://${LIVE_ENGINE_CONFIG.HOST}:${LIVE_ENGINE_CONFIG.PORT}/metrics`);
  }

  /// Stop the live execution engine
  async stop(): Promise<void> {
    console.log('[LIVE-INTEGRATION] Stopping Live Execution Engine...');

    this.is_shutting_down = true;

    // Stop accepting new requests
    if (this.server) {
      this.server.stop();
    }

    // Shutdown execution bridge
    await this.execution_bridge.shutdown();

    // Close ingestion service connections
    // (Ingestion service handles its own cleanup)

    console.log('[LIVE-INTEGRATION] Live Execution Engine stopped');
  }

  /// Start HTTP server with API endpoints
  private async startHttpServer(): Promise<void> {
    const routes = {
      // Ingestion endpoints
      'POST /api/v1/ingest/session': this.ingestion_api.handleCreateSession.bind(this.ingestion_api),
      'POST /api/v1/ingest/batch': this.ingestion_api.handleIngestBatch.bind(this.ingestion_api),
      'DELETE /api/v1/ingest/session': this.ingestion_api.handleCloseSession.bind(this.ingestion_api),

      // Status and monitoring endpoints
      'GET /health': this.handleHealthCheck.bind(this),
      'GET /metrics': this.handleMetrics.bind(this),
      'GET /status': this.handleStatus.bind(this),
      'GET /risk': this.handleRiskStatus.bind(this),

      // Control endpoints
      'POST /control/shutdown': this.handleShutdown.bind(this),
      'POST /control/reset': this.handleReset.bind(this),
    };

    this.server = Bun.serve({
      port: LIVE_ENGINE_CONFIG.PORT,
      hostname: LIVE_ENGINE_CONFIG.HOST,
      async fetch(request) {
        const url = new URL(request.url);
        const method = request.method;
        const route_key = `${method} ${url.pathname}`;

        const handler = routes[route_key];
        if (handler) {
          try {
            return await handler(request);
          } catch (error) {
            console.error(`[HTTP] Error handling ${route_key}:`, error);
            return new Response(JSON.stringify({
              error: 'Internal server error',
              message: error instanceof Error ? error.message : 'Unknown error'
            }), {
              status: 500,
              headers: { 'Content-Type': 'application/json' }
            });
          }
        }

        return new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    });
  }

  /// Health check endpoint
  private async handleHealthCheck(): Promise<Response> {
    const stats = this.live_engine.getExecutionStats();
    const ingestion_stats = this.ingestion_service.getIngestionStats();
    const bridge_stats = this.execution_bridge.getBridgeStats();

    const health_status = {
      status: 'healthy',
      timestamp: nanoseconds(),
      uptime_seconds: Number(nanoseconds() - this.start_time) / 1_000_000_000,
      version: '1.0.0',
      components: {
        live_engine: {
          executions: stats.total_executions,
          success_rate: stats.success_rate,
          active_accounts: stats.active_accounts
        },
        ingestion_service: {
          patterns_received: ingestion_stats.total_patterns_received,
          active_streams: ingestion_stats.active_streams
        },
        execution_bridge: {
          active_executions: bridge_stats.active_executions,
          rust_processes: bridge_stats.rust_processes
        }
      }
    };

    return new Response(JSON.stringify(health_status, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /// Metrics endpoint
  private async handleMetrics(): Promise<Response> {
    const stats = this.live_engine.getExecutionStats();

    const metrics = {
      // Execution metrics
      live_execution_patterns_received: stats.total_executions,
      live_execution_success_rate: stats.success_rate,
      live_execution_average_latency_us: stats.average_latency_us,
      live_execution_active_accounts: stats.active_accounts,

      // Risk metrics
      risk_active_accounts: stats.risk_stats.active_accounts,
      risk_circuit_breakers_active: stats.risk_stats.circuit_breakers_active,
      risk_sharp_score_low: stats.risk_stats.sharp_score_distribution.low,
      risk_sharp_score_medium: stats.risk_stats.sharp_score_distribution.medium,
      risk_sharp_score_high: stats.risk_stats.sharp_score_distribution.high,
      risk_sharp_score_critical: stats.risk_stats.sharp_score_distribution.critical,

      // System metrics
      system_uptime_seconds: stats.uptime_seconds,
      system_memory_usage_mb: process.memoryUsage().rss / 1024 / 1024,
    };

    return new Response(JSON.stringify(metrics, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /// Status endpoint
  private async handleStatus(): Promise<Response> {
    const stats = this.live_engine.getExecutionStats();
    const ingestion_stats = this.ingestion_service.getIngestionStats();
    const bridge_stats = this.execution_bridge.getBridgeStats();

    const status = {
      timestamp: nanoseconds(),
      uptime_seconds: Number(nanoseconds() - this.start_time) / 1_000_000_000,
      status: this.is_shutting_down ? 'shutting_down' : 'operational',

      execution_engine: {
        total_executions: stats.total_executions,
        success_rate: stats.success_rate,
        average_latency_us: stats.average_latency_us,
        active_accounts: stats.active_accounts,
        patterns_queued: stats.patterns_queued
      },

      ingestion_service: {
        total_patterns_received: ingestion_stats.total_patterns_received,
        total_batches_processed: ingestion_stats.total_batches_processed,
        active_streams: ingestion_stats.active_streams,
        patterns_per_second: ingestion_stats.patterns_per_second,
        average_batch_size: ingestion_stats.average_batch_size
      },

      execution_bridge: {
        active_executions: bridge_stats.active_executions,
        queued_executions: bridge_stats.queued_executions,
        rust_processes: bridge_stats.rust_processes,
        available_processes: bridge_stats.available_processes
      },

      risk_management: stats.risk_stats
    };

    return new Response(JSON.stringify(status, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /// Risk status endpoint
  private async handleRiskStatus(): Promise<Response> {
    const risk_stats = this.risk_manager.getRiskStats();

    return new Response(JSON.stringify(risk_stats, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /// Shutdown endpoint
  private async handleShutdown(): Promise<Response> {
    console.log('[HTTP] Shutdown requested via API');

    // Start graceful shutdown
    setTimeout(async () => {
      await this.stop();
      process.exit(0);
    }, 1000);

    return new Response(JSON.stringify({ status: 'shutdown_initiated' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /// Reset endpoint (for testing)
  private async handleReset(): Promise<Response> {
    // This would reset internal state for testing
    // In production, this might not be exposed or have additional auth

    console.log('[HTTP] Reset requested - clearing execution results');

    // Note: In production, this would need proper authorization
    // For now, just return success

    return new Response(JSON.stringify({ status: 'reset_not_implemented' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /// Start health monitoring
  private startHealthMonitoring(): void {
    setInterval(async () => {
      try {
        // Perform health checks
        const stats = this.live_engine.getExecutionStats();

        // Log warnings for concerning metrics
        if (stats.success_rate < 0.8) {
          console.warn(`[HEALTH] Low success rate: ${(stats.success_rate * 100).toFixed(1)}%`);
        }

        if (stats.average_latency_us > 1000) { // 1ms
          console.warn(`[HEALTH] High latency: ${stats.average_latency_us.toFixed(0)}µs`);
        }

        const risk_stats = this.risk_manager.getRiskStats();
        if (risk_stats.circuit_breakers_active > 0) {
          console.warn(`[HEALTH] Circuit breakers active: ${risk_stats.circuit_breakers_active}`);
        }

      } catch (error) {
        console.error('[HEALTH] Health check failed:', error);
      }
    }, LIVE_ENGINE_CONFIG.HEALTH_CHECK_INTERVAL);
  }

  /// Register shutdown handlers
  private registerShutdownHandlers(): void {
    // Handle process termination signals
    process.on('SIGTERM', async () => {
      console.log('[SHUTDOWN] Received SIGTERM');
      await this.stop();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('[SHUTDOWN] Received SIGINT');
      await this.stop();
      process.exit(0);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('[SHUTDOWN] Uncaught exception:', error);
      this.stop().finally(() => {
        process.exit(1);
      });
    });

    process.on('unhandledRejection', (reason) => {
      console.error('[SHUTDOWN] Unhandled rejection:', reason);
      this.stop().finally(() => {
        process.exit(1);
      });
    });
  }
}

// =============================================================================
// CLI INTERFACE
// =============================================================================

/// CLI commands for the live execution engine
export class LiveExecutionCLI {
  private integration: LiveExecutionEngineIntegration;

  constructor() {
    this.integration = new LiveExecutionEngineIntegration();
  }

  /// Run the CLI
  async run(args: string[]): Promise<void> {
    const command = args[0];

    switch (command) {
      case 'start':
        await this.startCommand();
        break;

      case 'status':
        await this.statusCommand();
        break;

      case 'health':
        await this.healthCommand();
        break;

      case 'test':
        await this.testCommand();
        break;

      default:
        this.showHelp();
        break;
    }
  }

  /// Start command
  private async startCommand(): Promise<void> {
    console.log('🚀 Starting Live Execution Engine...');
    await this.integration.start();

    // Keep the process running
    process.on('SIGINT', () => {
      console.log('\n👋 Shutting down gracefully...');
      this.integration.stop().then(() => {
        process.exit(0);
      });
    });

    // Keep alive
    setInterval(() => {}, 1000);
  }

  /// Status command
  private async statusCommand(): Promise<void> {
    try {
      const response = await fetch(`http://${LIVE_ENGINE_CONFIG.HOST}:${LIVE_ENGINE_CONFIG.PORT}/status`);
      const status = await response.json();
      console.log('📊 Live Execution Engine Status:');
      console.log(JSON.stringify(status, null, 2));
    } catch (error) {
      console.error('❌ Failed to get status:', error.message);
      process.exit(1);
    }
  }

  /// Health command
  private async healthCommand(): Promise<void> {
    try {
      const response = await fetch(`http://${LIVE_ENGINE_CONFIG.HOST}:${LIVE_ENGINE_CONFIG.PORT}/health`);
      const health = await response.json();

      if (health.status === 'healthy') {
        console.log('✅ Live Execution Engine is healthy');
        console.log(`   Uptime: ${health.uptime_seconds.toFixed(0)}s`);
        console.log(`   Executions: ${health.components.live_engine.executions}`);
        console.log(`   Active streams: ${health.components.ingestion_service.active_streams}`);
      } else {
        console.log('❌ Live Execution Engine is unhealthy');
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Failed to check health:', error.message);
      process.exit(1);
    }
  }

  /// Test command
  private async testCommand(): Promise<void> {
    console.log('🧪 Running basic connectivity test...');

    try {
      // Test health endpoint
      const healthResponse = await fetch(`http://${LIVE_ENGINE_CONFIG.HOST}:${LIVE_ENGINE_CONFIG.PORT}/health`);
      if (!healthResponse.ok) {
        throw new Error(`Health check failed: ${healthResponse.status}`);
      }

      // Test metrics endpoint
      const metricsResponse = await fetch(`http://${LIVE_ENGINE_CONFIG.HOST}:${LIVE_ENGINE_CONFIG.PORT}/metrics`);
      if (!metricsResponse.ok) {
        throw new Error(`Metrics check failed: ${metricsResponse.status}`);
      }

      console.log('✅ All connectivity tests passed');
    } catch (error) {
      console.error('❌ Connectivity test failed:', error.message);
      process.exit(1);
    }
  }

  /// Show help
  private showHelp(): void {
    console.log(`
🤖 Live Execution Engine CLI

Usage: live-execution-engine <command>

Commands:
  start    Start the live execution engine
  status   Show current engine status
  health   Check engine health
  test     Run connectivity tests

Examples:
  live-execution-engine start
  live-execution-engine status
  live-execution-engine health

API Endpoints:
  GET  /health     - Health check
  GET  /status     - Detailed status
  GET  /metrics    - Prometheus-style metrics
  POST /api/v1/ingest/session  - Create ingestion session
  POST /api/v1/ingest/batch    - Ingest pattern batch
  DELETE /api/v1/ingest/session - Close ingestion session
`);
  }
}

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

/// Main entry point
if (import.meta.main) {
  const cli = new LiveExecutionCLI();
  cli.run(process.argv.slice(2)).catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

// =============================================================================
// EXPORTS
// =============================================================================

export { LiveExecutionEngineIntegration, LiveExecutionCLI };
export default LiveExecutionEngineIntegration;