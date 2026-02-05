#!/usr/bin/env bun
/**
 * Fantasy42-Fire22 Registry Database Seeding Script
 * Seeds the database with initial data for development and testing
 */

import { createDatabaseConnection } from '../lib/database';
import { config } from '../config';

async function seedDatabase(): Promise<void> {
  console.log('🌱 Starting database seeding...');

  try {
    const { db, initialize } = createDatabaseConnection();

    // Initialize database (creates tables)
    await initialize();
    console.log('✅ Database schema initialized');

    // Read and execute seed data
    const seedPath = './seed.sql';
    const seedExists = await Bun.file(seedPath).exists();

    if (seedExists) {
      console.log('📄 Loading seed data...');
      const seedContent = await Bun.file(seedPath).text();

      // Execute seed SQL
      db.exec(seedContent);
      console.log('✅ Seed data loaded successfully');
    } else {
      console.log('⚠️ No seed.sql file found, skipping data seeding');
    }

    // Additional programmatic seeding if needed
    await seedDevelopmentData(db);

    // Close database connection
    db.close();
    console.log('✅ Database seeding completed');
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
}

async function seedDevelopmentData(db: any): Promise<void> {
  console.log('🔧 Adding development-specific seed data...');

  // Add development-specific data here if needed
  // For example, test users, sample packages, etc.

  if (config.isDevelopment) {
    // Development-only seeding
    console.log('🏗️ Seeding development data...');

    // Example: Add test packages
    const testPackages = [
      {
        name: '@fire22-dev/test-package',
        description: 'Test package for development',
        author: '{"name": "Development Team", "email": "dev@fire22.com"}',
        version: '1.0.0-dev',
      },
    ];

    // Insert test packages (only if they don't exist)
    for (const pkg of testPackages) {
      const existing = db.prepare('SELECT id FROM packages WHERE name = ?').get(pkg.name);

      if (!existing) {
        const result = db
          .prepare(
            `
          INSERT INTO packages (name, description, author)
          VALUES (?, ?, ?)
        `
          )
          .run(pkg.name, pkg.description, pkg.author);

        // Add version
        db.prepare(
          `
          INSERT INTO package_versions (package_id, version, published_at)
          VALUES (?, ?, datetime('now'))
        `
        ).run(result.lastInsertRowid, pkg.version);

        console.log(`📦 Added test package: ${pkg.name}@${pkg.version}`);
      }
    }
  }
}

// Run seeding if called directly
if (import.meta.main) {
  seedDatabase().catch(console.error);
}

export { seedDatabase, seedDevelopmentData };
