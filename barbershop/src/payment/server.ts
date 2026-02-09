#!/usr/bin/env bun
/**
 * Production-Ready Payment Routing Server
 * Modular architecture with comprehensive error handling
 */

import { serve } from 'bun';
import { config, validateConfig } from './config';
import logger from './logger';
import redisManager from './redis-manager';
import routeRequest from './api-handler';

// Validate configuration before starting
try {
  validateConfig();
  logger.info('Configuration validated successfully');
} catch (err) {
  logger.error('Configuration validation failed', err as Error);
  process.exit(1);
}

// Connect to Redis
async function initializeServices(): Promise<void> {
  try {
    await redisManager.connect();
    redisManager.startHealthCheck();
    logger.info('Redis connected successfully');
  } catch (err) {
    logger.error('Failed to connect to Redis', err as Error);
    // Continue anyway - the API will return 503 for Redis-dependent operations
  }
}

// Graceful shutdown
function setupGracefulShutdown(server: ReturnType<typeof serve>): void {
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, starting graceful shutdown...`);
    
    // Stop accepting new connections
    server.stop(true);
    
    // Close Redis connection
    redisManager.stopHealthCheck();
    await redisManager.disconnect();
    
    logger.info('Shutdown complete');
    process.exit(0);
  };
  
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  
  // Handle uncaught errors
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', err);
    shutdown('uncaughtException');
  });
  
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', reason as Error);
  });
}

// Start server
async function start(): Promise<void> {
  await initializeServices();
  
  const server = serve({
    port: config.port,
    hostname: config.host,
    async fetch(req) {
      return routeRequest(req);
    },
  });
  
  setupGracefulShutdown(server);
  
  logger.info('Payment routing server started', {
    port: config.port,
    host: config.host,
    env: config.nodeEnv,
  });
  
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║  💰 Payment Routing Server                                     ║
╠════════════════════════════════════════════════════════════════╣
║  Port:   ${config.port.toString().padEnd(53)}║
║  Host:   ${config.host.padEnd(53)}║
║  Env:    ${config.nodeEnv.padEnd(53)}║
║  Redis:  ${(redisManager.isHealthy() ? 'connected' : 'disconnected').padEnd(53)}║
╚════════════════════════════════════════════════════════════════╝
  `);
}

// Run if main module
if (import.meta.main) {
  start().catch((err) => {
    logger.error('Failed to start server', err);
    process.exit(1);
  });
}

export { start };
export default start;
