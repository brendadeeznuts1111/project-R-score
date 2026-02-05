#!/usr/bin/env bun

import { ShortcutRegistry } from './core/registry.ts';
import { createServer } from './api/server.ts';
import { initializeDatabase } from './database/init.ts';
import { watchForChanges, setupAutoBackup } from './utils/watch.ts';
import { detectPlatform } from './utils/platform.ts';

// Global registry instance (will be initialized after database)
export let shortcutRegistry: ShortcutRegistry;

// Configuration from environment
const config = {
  port: process.env.PORT ? parseInt(process.env.PORT) : 3342,
  hostname: process.env.HOST || 'localhost',
  dataDir: process.env.DATA_DIR || './data',
  enableWebSocket: process.env.ENABLE_WS !== 'false',
  enableAutoBackup: process.env.ENABLE_BACKUP !== 'false',
  backupInterval: process.env.BACKUP_INTERVAL ? parseInt(process.env.BACKUP_INTERVAL) : 3600000,
  logLevel: process.env.LOG_LEVEL || 'info'
};

// Setup logging
const logger = {
  info: (msg: string, ...args: any[]) => console.log(`[INFO] ${msg}`, ...args),
  warn: (msg: string, ...args: any[]) => console.warn(`[WARN] ${msg}`, ...args),
  error: (msg: string, ...args: any[]) => console.error(`[ERROR] ${msg}`, ...args),
  debug: (msg: string, ...args: any[]) => {
    if (config.logLevel === 'debug') console.debug(`[DEBUG] ${msg}`, ...args);
  }
};

async function main() {
  logger.info('Starting Lightning Shortcut System...');
  logger.info(`Platform: ${detectPlatform().os}`);
  logger.info(`Data directory: ${config.dataDir}`);
  logger.info(`Log level: ${config.logLevel}`);

  try {
    // Initialize database
    await initializeDatabase(config.dataDir);
    logger.info('Database initialized');

    // Create registry after database is ready
    shortcutRegistry = new ShortcutRegistry();
    
    // Load initial data
    await shortcutRegistry.loadFromDatabase();
    logger.info(`Loaded ${shortcutRegistry.getShortcutCount()} shortcuts`);

    // Setup auto-backup if enabled
    if (config.enableAutoBackup) {
      setupAutoBackup(shortcutRegistry, config.dataDir, config.backupInterval);
      logger.info(`Auto-backup enabled (every ${config.backupInterval}ms)`);
    }

    // Watch for config file changes
    watchForChanges(config.dataDir, () => {
      logger.info('Config changed, reloading...');
      shortcutRegistry.loadFromDatabase();
    });

    // Create and start HTTP server
    const server = createServer(shortcutRegistry, config);
    
    logger.info(`Server running at http://${config.hostname}:${config.port}`);
    logger.info('Press Ctrl+C to stop');

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Shutting down...');
      await server.stop();
      await shortcutRegistry.saveToDatabase();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Terminating...');
      await server.stop();
      await shortcutRegistry.saveToDatabase();
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Run the application
if (import.meta.main) {
  main();
}

// Export for testing and programmatic use
export { config, logger };
export default main;
