/**
 * Database seed data for ShortcutRegistry
 */

import { Database } from 'bun:sqlite';
import { getDatabase } from './init';
import { logger } from '../utils/logger';
import type { ShortcutConfig } from '../types';
import { defaultShortcuts } from '../macros/shortcuts-data';

/**
 * Seed shortcuts into database
 */
function seedShortcuts(db: Database, clearExisting: boolean = false): void {
  if (clearExisting) {
    logger.info('Clearing existing shortcuts');
    db.exec('DELETE FROM shortcuts');
  }

  logger.info(`Seeding ${defaultShortcuts.length} shortcuts`);

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO shortcuts 
    (id, action, description, category, default_primary, default_secondary, 
     default_macos, default_linux, enabled, scope, requires_confirmation, condition, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);

  for (const shortcut of defaultShortcuts) {
    stmt.run(
      shortcut.id,
      shortcut.action,
      shortcut.description,
      shortcut.category,
      shortcut.default.primary,
      shortcut.default.secondary || null,
      shortcut.default.macOS || null,
      shortcut.default.linux || null,
      shortcut.enabled ? 1 : 0,
      shortcut.scope,
      shortcut.requiresConfirmation ? 1 : 0,
      shortcut.condition ? JSON.stringify(shortcut.condition.toString()) : null
    );
  }

  logger.info('Shortcuts seeded successfully');
}

/**
 * Seed default profile if it doesn't exist
 */
function seedDefaultProfile(db: Database): void {
  const existing = db.query('SELECT id FROM profiles WHERE id = ?').get('professional') as any;

  if (!existing) {
    logger.info('Seeding default profile');
    db.exec(`
      INSERT INTO profiles (id, name, description, category, enabled, locked)
      VALUES ('professional', 'Professional', 'Default professional profile', 'general', 1, 0)
    `);
    logger.info('Default profile seeded');
  } else {
    logger.info('Default profile already exists');
  }
}

/**
 * Seed user preferences if they don't exist
 */
function seedUserPreferences(db: Database, userId: string = 'default'): void {
  const existing = db.query('SELECT user_id FROM user_preferences WHERE user_id = ?').get(userId) as any;

  if (!existing) {
    logger.info(`Seeding user preferences for user: ${userId}`);
    const prefsStmt = db.prepare(`
      INSERT INTO user_preferences 
      (user_id, active_profile_id, keyboard_layout, enable_sounds, enable_hints, enable_training, auto_resolve_conflicts)
      VALUES (?, 'professional', 'us', 1, 1, 1, 0)
    `);
    prefsStmt.run(userId);
    logger.info('User preferences seeded');
  } else {
    logger.info('User preferences already exist');
  }
}

/**
 * Generate test data for development/testing
 */
function generateTestData(db: Database): void {
  logger.info('Generating test data');

  // Create a test profile
  const testProfileId = 'test_profile';
  const existingProfile = db.query('SELECT id FROM profiles WHERE id = ?').get(testProfileId) as any;

  if (!existingProfile) {
    const profileStmt = db.prepare(`
      INSERT INTO profiles (id, name, description, category, enabled, locked)
      VALUES (?, 'Test Profile', 'Test profile for development', 'custom', 1, 0)
    `);
    profileStmt.run(testProfileId);
    logger.info('Test profile created');
  }

  // Add some test usage data
  const usageStmt = db.prepare(`
    INSERT INTO shortcut_usage (shortcut_id, profile_id, user_id, scope, success)
    VALUES (?, ?, ?, ?, ?)
  `);

  const testShortcuts = defaultShortcuts.slice(0, 5);
  for (const shortcut of testShortcuts) {
    // Generate some random usage data
    for (let i = 0; i < 10; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const timestamp = new Date();
      timestamp.setDate(timestamp.getDate() - daysAgo);
      
      usageStmt.run(
        shortcut.id,
        'professional',
        'test_user',
        'global',
        Math.random() > 0.1 ? 1 : 0 // 90% success rate
      );
    }
  }

  logger.info('Test data generated');
}

/**
 * Main seed function
 */
export function seed(options: {
  clearShortcuts?: boolean;
  includeTestData?: boolean;
  userId?: string;
} = {}): void {
  const { clearShortcuts = false, includeTestData = false, userId = 'default' } = options;
  const db = getDatabase();

  logger.info('Starting database seeding');

  try {
    db.exec('BEGIN TRANSACTION');

    seedShortcuts(db, clearShortcuts);
    seedDefaultProfile(db);
    seedUserPreferences(db, userId);

    if (includeTestData) {
      generateTestData(db);
    }

    db.exec('COMMIT');
    logger.info('Database seeding completed successfully');
  } catch (error) {
    db.exec('ROLLBACK');
    logger.error('Database seeding failed', error as Error);
    throw error;
  }
}

// Run seeding if this file is executed directly
if (import.meta.main) {
  const args = process.argv.slice(2);
  const clearShortcuts = args.includes('--clear');
  const includeTestData = args.includes('--test-data');
  const userId = args.find(arg => arg.startsWith('--user='))?.split('=')[1] || 'default';

  try {
    seed({
      clearShortcuts,
      includeTestData,
      userId
    });
    console.log('\n✓ Seeding completed successfully');
  } catch (error) {
    console.error('\n✗ Seeding failed:', error);
    process.exit(1);
  }
}
