#!/usr/bin/env bun
/**
 * Fantasy42-Fire22 Registry Database Initialization Script
 * Initializes the database with schema and basic configuration
 */

import { createDatabaseConnection } from '../lib/database';

async function initializeDatabase(): Promise<void> {
  console.log('🏗️ Initializing Fantasy42-Fire22 Registry Database...');

  try {
    const { db, initialize } = createDatabaseConnection();

    console.log('📋 Setting up database schema...');
    await initialize();

    // Verify initialization
    const packageCount = db.prepare('SELECT COUNT(*) as count FROM packages').get();
    const versionCount = db.prepare('SELECT COUNT(*) as count FROM package_versions').get();

    console.log('✅ Database initialized successfully');
    console.log(`📦 Packages table: ${packageCount.count} records`);
    console.log(`🔖 Versions table: ${versionCount.count} records`);

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
