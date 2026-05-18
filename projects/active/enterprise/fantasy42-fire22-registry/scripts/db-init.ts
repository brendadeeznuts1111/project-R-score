#!/usr/bin/env bun
/**
 * Fantasy42-Fire22 Registry Database Initialization Script
 * Initializes the database with schema and basic configuration
 */

import { createDatabaseConnection } from '../lib/database';

async function initializeDatabase(): Promise<void> {
  console.info('🏗️ Initializing Fantasy42-Fire22 Registry Database...');

  try {
    const { db, initialize } = createDatabaseConnection();

    console.info('📋 Setting up database schema...');
    await initialize();

    // Verify initialization
    const packageCount = db.prepare('SELECT COUNT(*) as count FROM packages').get();
    const versionCount = db.prepare('SELECT COUNT(*) as count FROM package_versions').get();

    console.info('✅ Database initialized successfully');
    console.info(`📦 Packages table: ${packageCount.count} records`);
    console.info(`🔖 Versions table: ${versionCount.count} records`);

    db.close();
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

// Run initialization if called directly
if (import.meta.main) {
  initializeDatabase().catch(console.error);
}

export { initializeDatabase };
