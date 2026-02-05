#!/usr/bin/env bun
/**
 * Fantasy42-Fire22 Wrangler Database CLI
 * Easy database management for Cloudflare D1
 */

import { $ } from 'bun';

async function runCommand(cmd: string, description: string) {
  console.log(`🔧 ${description}`);
  console.log(`📝 Running: ${cmd}`);
  console.log('─'.repeat(60));

  try {
    const result = await $`${{ raw: cmd }}`.quiet();
    console.log(result.stdout);
    if (result.stderr) {
      console.warn(`⚠️  Warning:`, result.stderr);
    }
    return result;
  } catch (error) {
    console.error(`❌ Command failed:`, error.message);
    return null;
  }
}

async function createDatabase(env: string) {
  console.log(`🗄️ Creating D1 database for ${env}`);
  const cloudflareDir = 'enterprise/packages/cloudflare';

  await runCommand(
    `cd ${cloudflareDir} && wrangler d1 create fantasy42-registry --env ${env}`,
    `Creating fantasy42-registry database for ${env}`
  );
}

async function createMigration(name: string) {
  console.log(`📄 Creating database migration: ${name}`);
  const cloudflareDir = 'enterprise/packages/cloudflare';

  await runCommand(
    `cd ${cloudflareDir} && wrangler d1 migrations create fantasy42-registry ${name}`,
    `Creating migration file for ${name}`
  );
}

async function applyMigrations(env: string) {
  console.log(`⬆️ Applying database migrations for ${env}`);
  const cloudflareDir = 'enterprise/packages/cloudflare';

  await runCommand(
    `cd ${cloudflareDir} && wrangler d1 migrations apply fantasy42-registry --env ${env}`,
    `Applying migrations to ${env} database`
  );
}

async function listMigrations(env: string) {
  console.log(`📋 Listing database migrations for ${env}`);
  const cloudflareDir = 'enterprise/packages/cloudflare';

  await runCommand(
    `cd ${cloudflareDir} && wrangler d1 migrations list fantasy42-registry --env ${env}`,
    `Listing migrations for ${env} database`
  );
}

async function queryDatabase(env: string, query: string) {
  console.log(`🔍 Running query on ${env} database`);
  const cloudflareDir = 'enterprise/packages/cloudflare';

  await runCommand(
    `cd ${cloudflareDir} && echo "${query}" | wrangler d1 execute fantasy42-registry --env ${env}`,
    `Executing query on ${env} database`
  );
}

async function seedDatabase(env: string) {
  console.log(`🌱 Seeding database for ${env}`);
  const cloudflareDir = 'enterprise/packages/cloudflare';

  // Create initial schema
  const schemaQuery = `
    CREATE TABLE IF NOT EXISTS packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      version TEXT NOT NULL,
      description TEXT,
      author TEXT,
      license TEXT,
      repository TEXT,
      homepage TEXT,
      keywords TEXT,
      downloads INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS package_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      package_name TEXT NOT NULL,
      version TEXT NOT NULL,
      size INTEGER,
      integrity TEXT,
      published_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (package_name) REFERENCES packages(name)
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_packages_name ON packages(name);
    CREATE INDEX IF NOT EXISTS idx_packages_downloads ON packages(downloads DESC);
    CREATE INDEX IF NOT EXISTS idx_package_versions_package_name ON package_versions(package_name);
  `;

  await runCommand(
    `cd ${cloudflareDir} && echo "${schemaQuery}" | wrangler d1 execute fantasy42-registry --env ${env}`,
    `Seeding ${env} database with initial schema`
  );
}

async function backupDatabase(env: string) {
  console.log(`💾 Creating database backup for ${env}`);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = `backup-${env}-${timestamp}.sql`;

  const cloudflareDir = 'enterprise/packages/cloudflare';

  await runCommand(
    `cd ${cloudflareDir} && wrangler d1 export fantasy42-registry --env ${env} --output ${backupFile}`,
    `Creating backup ${backupFile} for ${env} database`
  );

  console.log(`✅ Backup saved to: enterprise/packages/cloudflare/${backupFile}`);
}

async function showStats(env: string) {
  console.log(`📊 Database statistics for ${env}`);
  const cloudflareDir = 'enterprise/packages/cloudflare';

  const statsQuery = `
    SELECT
      'packages' as table_name,
      COUNT(*) as record_count
    FROM packages
    UNION ALL
    SELECT
      'package_versions' as table_name,
      COUNT(*) as record_count
    FROM package_versions
    UNION ALL
    SELECT
      'users' as table_name,
      COUNT(*) as record_count
    FROM users;
  `;

  await runCommand(
    `cd ${cloudflareDir} && echo "${statsQuery}" | wrangler d1 execute fantasy42-registry --env ${env}`,
    `Showing statistics for ${env} database`
  );
}

async function showHelp() {
  console.log(`
🗄️ Fantasy42-Fire22 Wrangler Database CLI
Easy database management for Cloudflare D1

USAGE:
  bun run scripts/wrangler-db.bun.ts <command> [environment] [options]

COMMANDS:
  create [env]     Create D1 database for environment
  migrate [name]   Create new migration file
  apply [env]      Apply migrations to environment
  list [env]       List migrations for environment
  query [env]      Run SQL query (provide query as additional arg)
  seed [env]       Seed database with initial schema
  backup [env]     Create database backup
  stats [env]      Show database statistics

ENVIRONMENTS:
  development     Development environment (default)
  staging         Staging environment
  production      Production environment

EXAMPLES:
  bun run scripts/wrangler-db.bun.ts create development
  bun run scripts/wrangler-db.bun.ts migrate add_user_profiles
  bun run scripts/wrangler-db.bun.ts apply production
  bun run scripts/wrangler-db.bun.ts seed staging
  bun run scripts/wrangler-db.bun.ts stats production
  bun run scripts/wrangler-db.bun.ts backup development
  bun run scripts/wrangler-db.bun.ts query development "SELECT * FROM packages LIMIT 5"

NOTES:
- Make sure you're authenticated: wrangler auth login
- Environment defaults to 'development'
- Use quotes around SQL queries with spaces
`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const env = args[1] || 'development';
  const extraArg = args[2];

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    await showHelp();
    return;
  }

  const validEnvs = ['development', 'staging', 'production'];
  if (!validEnvs.includes(env) && command !== 'migrate') {
    console.error(`❌ Invalid environment: ${env}`);
    console.log(`Valid environments: ${validEnvs.join(', ')}`);
    return;
  }

  switch (command) {
    case 'create':
      await createDatabase(env);
      break;

    case 'migrate':
      if (!extraArg) {
        console.error(
          `❌ Migration name required: bun run scripts/wrangler-db.bun.ts migrate <name>`
        );
        return;
      }
      await createMigration(extraArg);
      break;

    case 'apply':
      await applyMigrations(env);
      break;

    case 'list':
      await listMigrations(env);
      break;

    case 'query':
      if (!extraArg) {
        console.error(`❌ Query required: bun run scripts/wrangler-db.bun.ts query <env> "<sql>"`);
        return;
      }
      await queryDatabase(env, extraArg);
      break;

    case 'seed':
      await seedDatabase(env);
      break;

    case 'backup':
      await backupDatabase(env);
      break;

    case 'stats':
      await showStats(env);
      break;

    default:
      console.error(`❌ Unknown command: ${command}`);
      await showHelp();
      break;
  }
}

// Run the CLI
if (import.meta.main) {
  main().catch(console.error);
}
