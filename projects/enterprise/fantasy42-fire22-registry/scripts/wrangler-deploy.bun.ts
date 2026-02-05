#!/usr/bin/env bun
/**
 * Fantasy42-Fire22 Wrangler Deployment CLI
 * Automated deployment workflows for Cloudflare infrastructure
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

async function deployToEnvironment(env: string) {
  console.log(`🚀 Deploying Fantasy42-Fire22 Registry to ${env}`);
  console.log('═'.repeat(60));

  const cloudflareDir = 'enterprise/packages/cloudflare';

  // Pre-deployment checks
  console.log(`🔍 Running pre-deployment checks for ${env}...`);

  // Build the project
  await runCommand(`cd ${cloudflareDir} && bun run build`, `Building project for ${env}`);

  // Run tests
  await runCommand(`cd ${cloudflareDir} && bun test`, `Running tests for ${env}`);

  // Deploy to Cloudflare
  const deployResult = await runCommand(
    `cd ${cloudflareDir} && wrangler deploy --env ${env}`,
    `Deploying to ${env} environment`
  );

  if (deployResult) {
    console.log(`✅ Deployment to ${env} completed successfully!`);

    // Post-deployment health check
    console.log(`🏥 Running health check for ${env}...`);
    try {
      const healthUrl =
        env === 'production'
          ? 'https://api.apexodds.net/health'
          : `https://${env}.apexodds.net/health`;

      const response = await fetch(healthUrl);
      const health = await response.json();

      if (health.status === 'healthy') {
        console.log(`✅ Health check passed for ${env}`);
        console.log(`🌐 ${env} URL: ${healthUrl}`);
      } else {
        console.warn(`⚠️  Health check warning for ${env}:`, health);
      }
    } catch (error) {
      console.warn(`⚠️  Health check failed for ${env}:`, error.message);
    }

    return true;
  } else {
    console.error(`❌ Deployment to ${env} failed!`);
    return false;
  }
}

async function setupDatabase(env: string) {
  console.log(`🗄️ Setting up D1 database for ${env}`);
  console.log('═'.repeat(60));

  const cloudflareDir = 'enterprise/packages/cloudflare';

  // Create database if it doesn't exist
  await runCommand(
    `cd ${cloudflareDir} && wrangler d1 create fantasy42-registry --env ${env}`,
    `Creating D1 database for ${env}`
  );

  // Run migrations
  await runCommand(
    `cd ${cloudflareDir} && wrangler d1 migrations apply fantasy42-registry --env ${env}`,
    `Applying database migrations for ${env}`
  );

  console.log(`✅ Database setup completed for ${env}`);
}

async function setupKV(env: string) {
  console.log(`📦 Setting up KV namespaces for ${env}`);
  console.log('═'.repeat(60));

  const cloudflareDir = 'enterprise/packages/cloudflare';

  // Create KV namespace for cache
  await runCommand(
    `cd ${cloudflareDir} && wrangler kv:namespace create "CACHE" --env ${env}`,
    `Creating KV namespace for cache in ${env}`
  );

  console.log(`✅ KV setup completed for ${env}`);
}

async function setupR2(env: string) {
  console.log(`☁️ Setting up R2 buckets for ${env}`);
  console.log('═'.repeat(60));

  const cloudflareDir = 'enterprise/packages/cloudflare';

  // Create R2 bucket for packages
  await runCommand(
    `cd ${cloudflareDir} && wrangler r2 bucket create fantasy42-packages --env ${env}`,
    `Creating R2 bucket for packages in ${env}`
  );

  console.log(`✅ R2 setup completed for ${env}`);
}

async function fullSetup(env: string) {
  console.log(`🔧 Running full infrastructure setup for ${env}`);
  console.log('═'.repeat(60));

  await setupDatabase(env);
  await setupKV(env);
  await setupR2(env);

  console.log(`✅ Full infrastructure setup completed for ${env}`);
}

async function showHelp() {
  console.log(`
🚀 Fantasy42-Fire22 Wrangler Deployment CLI
Automated deployment and infrastructure management

USAGE:
  bun run scripts/wrangler-deploy.bun.ts <command> [environment]

COMMANDS:
  deploy [env]     Deploy to specified environment (development/staging/production)
  setup-db [env]   Setup D1 database for environment
  setup-kv [env]   Setup KV namespaces for environment
  setup-r2 [env]   Setup R2 buckets for environment
  setup [env]      Run full infrastructure setup
  promote          Promote staging to production

ENVIRONMENTS:
  development     Development environment (default)
  staging         Staging environment
  production      Production environment

EXAMPLES:
  bun run scripts/wrangler-deploy.bun.ts deploy production
  bun run scripts/wrangler-deploy.bun.ts setup development
  bun run scripts/wrangler-deploy.bun.ts setup-db staging
  bun run scripts/wrangler-deploy.bun.ts promote

NOTES:
- Make sure you're authenticated: wrangler auth login
- Environment defaults to 'development'
- All infrastructure setup is idempotent
`);
}

async function promoteStagingToProduction() {
  console.log(`⬆️ Promoting staging to production`);
  console.log('═'.repeat(60));

  console.log(`🔄 This will deploy the current staging build to production...`);

  // Deploy staging configuration to production
  const success = await deployToEnvironment('production');

  if (success) {
    console.log(`✅ Staging successfully promoted to production!`);
  } else {
    console.error(`❌ Promotion failed!`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const env = args[1] || 'development';

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    await showHelp();
    return;
  }

  const validEnvs = ['development', 'staging', 'production'];
  if (!validEnvs.includes(env)) {
    console.error(`❌ Invalid environment: ${env}`);
    console.log(`Valid environments: ${validEnvs.join(', ')}`);
    return;
  }

  switch (command) {
    case 'deploy':
      await deployToEnvironment(env);
      break;

    case 'setup-db':
      await setupDatabase(env);
      break;

    case 'setup-kv':
      await setupKV(env);
      break;

    case 'setup-r2':
      await setupR2(env);
      break;

    case 'setup':
      await fullSetup(env);
      break;

    case 'promote':
      await promoteStagingToProduction();
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
