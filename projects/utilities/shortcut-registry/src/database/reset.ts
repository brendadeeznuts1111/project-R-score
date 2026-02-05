/**
 * Database reset utility for development
 */

import { Database } from 'bun:sqlite';
import { closeDatabase } from './init';
import { logger } from '../utils/logger';
import { existsSync, unlinkSync } from 'fs';

const DB_PATH = process.env.DATABASE_PATH || 'shortcuts.db';

/**
 * Reset the database by dropping all tables and recreating schema
 */
export async function resetDatabase(): Promise<void> {
  logger.info('Resetting database', { path: DB_PATH });

  try {
    // Close existing connection if any
    closeDatabase();

    // Delete database file if it exists
    if (existsSync(DB_PATH)) {
      unlinkSync(DB_PATH);
      logger.info('Deleted existing database file');
    }

    // Recreate database with fresh schema
    const { getDatabase } = await import('./init');
    const db = getDatabase();
    
    logger.info('Database reset completed successfully');
  } catch (error) {
    logger.error('Database reset failed', error as Error);
    throw error;
  }
}

// Run reset if this file is executed directly
if (import.meta.main) {
  const args = process.argv.slice(2);
  const confirm = args.includes('--confirm');

  if (!confirm) {
    console.error('⚠️  WARNING: This will delete all data in the database!');
    console.error('Run with --confirm flag to proceed');
    process.exit(1);
  }

  try {
    await resetDatabase();
    console.log('\n✓ Database reset completed');
  } catch (error) {
    console.error('\n✗ Database reset failed:', error);
    process.exit(1);
  }
}
