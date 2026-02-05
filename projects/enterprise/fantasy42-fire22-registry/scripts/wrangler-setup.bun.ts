#!/usr/bin/env bun
/**
 * Fantasy42-Fire22 Wrangler Quick Setup
 * One-command setup for Cloudflare infrastructure
 */

import { $ } from 'bun';

async function checkWranglerAuth() {
  console.log(`🔐 Checking Wrangler authentication...`);

  try {
    const result = await $`wrangler auth whoami`.quiet();
    console.log(`✅ Authenticated with Cloudflare`);
    console.log(result.stdout);
    return true;
  } catch (error) {
    console.log(`❌ Not authenticated with Cloudflare`);
    console.log(`🔑 Please run: wrangler auth login`);
    return false;
  }
}

async function setupEnvironment(env: string) {
  console.log(`🚀 Setting up ${env} environment`);
  console.log('═'.repeat(60));

  const cloudflareDir = 'enterprise/packages/cloudflare';

  // 1. Create D1 Database
  console.log(`\n📊 1. Setting up D1 Database...`);
  try {
    await $`cd ${cloudflareDir} && wrangler d1 create fantasy42-registry --env ${env}`.quiet();
    console.log(`✅ Created D1 database for ${env}`);
  } catch (error) {
    console.log(`⚠️  D1 database may already exist for ${env}`);
  }

  // 2. Create KV Namespace
  console.log(`\n📦 2. Setting up KV Namespace...`);
  try {
    await $`cd ${cloudflareDir} && wrangler kv:namespace create "CACHE" --env ${env}`.quiet();
    console.log(`✅ Created KV namespace for ${env}`);
  } catch (error) {
    console.log(`⚠️  KV namespace may already exist for ${env}`);
  }

  // 3. Create R2 Bucket
  console.log(`\n☁️ 3. Setting up R2 Bucket...`);
  try {
    await $`cd ${cloudflareDir} && wrangler r2 bucket create fantasy42-packages --env ${env}`.quiet();
    console.log(`✅ Created R2 bucket for ${env}`);
  } catch (error) {
    console.log(`⚠️  R2 bucket may already exist for ${env}`);
  }

  // 4. Create Queue
  console.log(`\n📋 4. Setting up Queue...`);
  try {
    await $`cd ${cloudflareDir} && wrangler queues create registry-events --env ${env}`.quiet();
    console.log(`✅ Created queue for ${env}`);
  } catch (error) {
    console.log(`⚠️  Queue may already exist for ${env}`);
  }

  // 5. Deploy Worker
  console.log(`\n🚀 5. Deploying Worker...`);
  try {
    const result = await $`cd ${cloudflareDir} && wrangler deploy --env ${env}`.quiet();
    console.log(`✅ Deployed worker for ${env}`);
    console.log(
      `🌐 Worker URL:`,
      result.stdout.match(/https:\/\/[^\s]+/)?.[0] || 'Check Wrangler output'
    );
  } catch (error) {
    console.error(`❌ Failed to deploy worker for ${env}:`, error.message);
  }

  console.log(`\n✅ ${env} environment setup completed!`);
}

async function setupAllEnvironments() {
  console.log(`🌍 Setting up all environments...`);
  console.log('═'.repeat(60));

  const environments = ['development', 'staging', 'production'];

  for (const env of environments) {
    await setupEnvironment(env);
    console.log(''); // Add spacing between environments
  }

  console.log(`🎉 All environments setup completed!`);
  console.log(`\n🚀 Quick start commands:`);
  console.log(`  bun run wrangler:dev          # Start development server`);
  console.log(`  bun run wrangler:deploy       # Deploy to development`);
  console.log(`  bun run wrangler:health       # Check health status`);
  console.log(`  bun run wrangler:tail         # Tail worker logs`);
}

async function showStatus() {
  console.log(`📊 Cloudflare Infrastructure Status`);
  console.log('═'.repeat(60));

  const environments = ['development', 'staging', 'production'];

  for (const env of environments) {
    console.log(`\n🌍 ${env.toUpperCase()} ENVIRONMENT:`);

    const cloudflareDir = 'enterprise/packages/cloudflare';

    try {
      // Check if worker is deployed
      const whoami = await $`cd ${cloudflareDir} && wrangler whoami --env ${env}`.quiet();
      console.log(`✅ Authenticated: Yes`);

      // Check D1 database
      const d1List = await $`cd ${cloudflareDir} && wrangler d1 list --env ${env}`.quiet();
      const hasD1 = d1List.stdout.includes('fantasy42-registry');
      console.log(`🗄️  D1 Database: ${hasD1 ? '✅ Created' : '❌ Missing'}`);

      // Check KV namespaces
      const kvList =
        await $`cd ${cloudflareDir} && wrangler kv:namespace list --env ${env}`.quiet();
      const hasKV = kvList.stdout.includes('CACHE');
      console.log(`📦 KV Namespace: ${hasKV ? '✅ Created' : '❌ Missing'}`);

      // Check R2 buckets
      const r2List = await $`cd ${cloudflareDir} && wrangler r2 bucket list --env ${env}`.quiet();
      const hasR2 = r2List.stdout.includes('fantasy42-packages');
      console.log(`☁️  R2 Bucket: ${hasR2 ? '✅ Created' : '❌ Missing'}`);

      // Check worker deployment
      try {
        const deployCheck =
          await $`cd ${cloudflareDir} && wrangler tail --format json --env ${env}`.quiet();
        console.log(`🚀 Worker: ✅ Deployed`);
      } catch {
        console.log(`🚀 Worker: ❌ Not deployed`);
      }
    } catch (error) {
      console.log(`❌ Error checking ${env}:`, error.message);
    }
  }
}

async function showHelp() {
  console.log(`
🚀 Fantasy42-Fire22 Wrangler Quick Setup
One-command setup for Cloudflare infrastructure

USAGE:
  bun run scripts/wrangler-setup.bun.ts <command>

COMMANDS:
  auth          Check Wrangler authentication
  setup [env]   Setup specific environment (development/staging/production)
  setup-all     Setup all environments
  status        Show infrastructure status
  help          Show this help

EXAMPLES:
  bun run scripts/wrangler-setup.bun.ts auth
  bun run scripts/wrangler-setup.bun.ts setup development
  bun run scripts/wrangler-setup.bun.ts setup-all
  bun run scripts/wrangler-setup.bun.ts status

NOTES:
- Make sure you're authenticated: wrangler auth login
- Setup is idempotent - safe to run multiple times
- All environments get the same infrastructure
- Check status to see what's already configured

ENVIRONMENTS:
  development   Local development (dev.apexodds.net)
  staging       Staging environment (staging.apexodds.net)
  production    Production environment (api.apexodds.net)

RESOURCES CREATED:
  🗄️  D1 Database: fantasy42-registry
  📦 KV Namespace: CACHE
  ☁️  R2 Bucket: fantasy42-packages
  📋 Queue: registry-events
  🚀 Cloudflare Worker: Fantasy42-Fire22 Registry API
`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const env = args[1];

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    await showHelp();
    return;
  }

  switch (command) {
    case 'auth':
      await checkWranglerAuth();
      break;

    case 'setup':
      if (!env) {
        console.error(`❌ Environment required: bun run scripts/wrangler-setup.bun.ts setup <env>`);
        console.log(`Valid environments: development, staging, production`);
        return;
      }
      const validEnvs = ['development', 'staging', 'production'];
      if (!validEnvs.includes(env)) {
        console.error(`❌ Invalid environment: ${env}`);
        console.log(`Valid environments: ${validEnvs.join(', ')}`);
        return;
      }
      await setupEnvironment(env);
      break;

    case 'setup-all':
      await setupAllEnvironments();
      break;

    case 'status':
      await showStatus();
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
