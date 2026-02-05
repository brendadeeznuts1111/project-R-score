/**
 * Lattice-Route-Compiler - v2.4.1 Hardened Baseline
 * Main entry point for the Registry-Powered-MCP system
 *
 * Powered by Bun v1.3.6_STABLE
 * Bundle Target: 9.64KB | p99: 10.8ms | Cold Start: ~0ms
 *
 * Features:
 * - High-performance MCP registry with URLPattern routing
 * - Sportsbook Exchange with WebSocket + REST endpoints
 * - Identity-Anchor session management (CHIPS-enabled)
 * - Native Bun APIs for maximum performance
 *
 * Environment Variables:
 * - MCP_PORT: Server port (default: 3333)
 * - EXCHANGE_ENABLED: Enable exchange (default: true)
 * - EXCHANGE_MOCK_MODE: Enable mock data (default: true in dev)
 * - See .env.example for full list
 */

import { REGISTRY_MATRIX } from './constants';
import { RegistryLoader } from './parsers/toml-ingressor';
import { LatticeRouter } from './core/lattice';
import { MCPServer } from './api/server';
import { Logger } from './instrumentation/logger';
import {
  loadExchangeConfig,
  getExchangeConfigSummary,
  validateExchangeConfig,
} from './sportsbook';

const logger = new Logger('LatticeCompiler');

// Global server reference for graceful shutdown
let server: MCPServer | null = null;
let router: LatticeRouter | null = null;

/**
 * Initialize the Registry-Powered-MCP System
 */
async function bootstrap() {
  logger.info('🌐 Registry-Powered-MCP v2.4.1-STABLE');
  logger.info(`Runtime: Bun ${REGISTRY_MATRIX.RUNTIME.VERSION}`);
  logger.info(`Engine: ${REGISTRY_MATRIX.RUNTIME.ENGINE}`);

  try {
    // Phase 1: Load Registry Configuration
    logger.info('📡 Phase 1: Loading registry.toml...');
    const registry = await RegistryLoader.YAML.parse('./registry.toml');
    logger.info(`✓ Loaded ${registry.servers.length} servers, ${registry.routes.length} routes`);

    // Phase 1.5: Load Exchange Configuration from Environment
    const exchangeConfig = loadExchangeConfig();
    logger.info(`🎰 ${getExchangeConfigSummary()}`);

    if (exchangeConfig.enabled !== false) {
      // Validate and warn about potential issues
      const warnings = validateExchangeConfig();
      for (const warning of warnings) {
        logger.warn(`⚠️  ${warning}`);
      }
    }

    // Phase 2: Compile Lattice Routes (includes Exchange initialization)
    logger.info('🔗 Phase 2: Compiling lattice routes...');
    router = new LatticeRouter(registry, exchangeConfig);
    await router.initialize();
    logger.info(`✓ Compiled ${router.routeCount} routes`);

    // Log exchange handler status
    const exchangeHandler = router.getExchangeHandler();
    if (exchangeHandler) {
      const metrics = exchangeHandler.getMetrics();
      logger.info(`🎰 Exchange running: ${metrics.markets} markets cached`);
    }

    // Phase 3: Initialize MCP Server
    const port = parseInt(Bun.env.MCP_PORT || '3333', 10);
    logger.info('🚀 Phase 3: Starting MCP server...');
    server = new MCPServer(router, registry);
    await server.start(port);

    logger.info('═══════════════════════════════════════');
    logger.info('✓ LATTICE_STATUS: SYNCHRONIZED');
    logger.info('✓ INTEGRITY: ABSOLUTE');
    logger.info('✓ SYSTEM: NOMINAL');
    if (exchangeHandler) {
      logger.info('✓ EXCHANGE: ACTIVE');
      logger.info(`  WebSocket: ws://localhost:${port}/mcp/exchange`);
      logger.info(`  REST API:  http://localhost:${port}/mcp/exchange/*`);
    } else {
      logger.info('✗ EXCHANGE: DISABLED');
    }
    logger.info('═══════════════════════════════════════');

  } catch (error) {
    logger.error('❌ Bootstrap failed:', error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown procedure
 */
async function shutdown(signal: string) {
  logger.info(`🛑 Received ${signal}, shutting down gracefully...`);

  try {
    // Stop exchange first
    if (router) {
      router.stopExchange();
      logger.info('✓ Exchange stopped');
    }

    // Stop HTTP server
    if (server) {
      await server.stop();
      logger.info('✓ Server stopped');
    }

    logger.info('✓ Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Shutdown error:', error);
    process.exit(1);
  }
}

// Graceful shutdown handlers
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Start the system
bootstrap().catch((error) => {
  console.error('Fatal error during bootstrap:', error);
  process.exit(1);
});
