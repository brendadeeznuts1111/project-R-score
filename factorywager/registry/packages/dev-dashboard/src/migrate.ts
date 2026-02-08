#!/usr/bin/env bun
/**
 * Database Migration Runner
 * 
 * Applies SQL migration files to the dashboard database.
 */

import { Database } from 'bun:sqlite';
import { join } from 'path';
import { readdir } from 'fs/promises';

const MIGRATIONS_DIR = join(import.meta.dir, '..', 'migrations');
const DB_PATH = join(import.meta.dir, '..', 'data', 'dashboard.db');

async function runMigrations() {
  console.log('🔄 Running Database Migrations');
  console.log('='.repeat(50));
  
  // Ensure data directory exists
  const dataDir = join(import.meta.dir, '..', 'data');
  try {
    await Bun.write(join(dataDir, '.gitkeep'), '');
  } catch {
    // Directory might already exist
  }
  
  // Open database
  const db = new Database(DB_PATH);
  
  // Enable foreign keys
  db.exec('PRAGMA foreign_keys = ON');
  
  // Create migrations tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      executed_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);
  
  // Get list of migration files
  let migrationFiles: string[] = [];
  try {
    const files = await readdir(MIGRATIONS_DIR);
    migrationFiles = files
      .filter(f => f.endsWith('.sql'))
      .sort(); // Sort to ensure order
  } catch (error) {
    console.error(`❌ Failed to read migrations directory: ${error}`);
    process.exit(1);
  }
  
  if (migrationFiles.length === 0) {
    console.log('⚠️  No migration files found');
    return;
  }
  
  console.log(`📁 Found ${migrationFiles.length} migration file(s)\n`);
  
  // Check which migrations have already been run
  const executedMigrations = db.prepare('SELECT name FROM migrations').all() as Array<{ name: string }>;
  const executedNames = new Set(executedMigrations.map(m => m.name));
  
  let appliedCount = 0;
  
  // Run each migration
  for (const migrationFile of migrationFiles) {
    const migrationName = migrationFile;
    
    if (executedNames.has(migrationName)) {
      console.log(`⏭️  Skipping ${migrationName} (already executed)`);
      continue;
    }
    
    try {
      console.log(`📄 Applying ${migrationName}...`);
      
      const migrationPath = join(MIGRATIONS_DIR, migrationFile);
      const migrationSQL = await Bun.file(migrationPath).text();
      
      // Execute migration
      db.exec(migrationSQL);
      
      // Record migration
      db.prepare('INSERT INTO migrations (name) VALUES (?)').run(migrationName);
      
      console.log(`✅ Applied ${migrationName}\n`);
      appliedCount++;
    } catch (error) {
      console.error(`❌ Failed to apply ${migrationName}:`, error);
      process.exit(1);
    }
  }
  
  if (appliedCount === 0) {
    console.log('✅ All migrations are up to date');
  } else {
    console.log(`✅ Applied ${appliedCount} migration(s)`);
  }
  
  // Show migration status
  console.log('\n📊 Migration Status:');
  console.log('-'.repeat(50));
  const allMigrations = db.prepare('SELECT name, executed_at FROM migrations ORDER BY executed_at').all() as Array<{ name: string; executed_at: number }>;
  
  if (allMigrations.length === 0) {
    console.log('No migrations executed');
  } else {
    for (const migration of allMigrations) {
      const date = new Date(migration.executed_at * 1000).toISOString();
      console.log(`  ✅ ${migration.name} - ${date}`);
    }
  }
  
  db.close();
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Database Migration Runner
──────────────────────────

Usage:
  bun migrate.ts [options]

Options:
  --help, -h    Show this help message

Examples:
  bun migrate.ts
    `);
    return;
  }
  
  await runMigrations();
}

if (import.meta.main) {
  await main();
}
