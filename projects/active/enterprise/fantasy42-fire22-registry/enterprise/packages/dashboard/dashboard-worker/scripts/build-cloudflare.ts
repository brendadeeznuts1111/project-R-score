#!/usr/bin/env bun

/**
 * 🚀 Fire22 Cloudflare Build & Deploy System
 *
 * Integrates Cloudflare Workers deployment into the build system
 */

import { $ } from 'bun';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

interface CloudflareOptions {
  environment?: 'development' | 'staging' | 'production';
  dryRun?: boolean;
  local?: boolean;
  minify?: boolean;
}

export class CloudflareBuildSystem {
  private readonly srcDir = join(process.cwd(), 'src');
  private readonly distDir = join(process.cwd(), 'dist');

  /**
   * Build for Cloudflare Workers
   */
  async buildWorker(options: CloudflareOptions = {}): Promise<void> {
    console.info('☁️  Building for Cloudflare Workers');
    console.info('='.repeat(50));

    const env = options.environment || 'development';

    // Ensure dist directory exists
    if (!existsSync(this.distDir)) {
      mkdirSync(this.distDir, { recursive: true });
    }

    console.info(`\n📦 Environment: ${env}`);

    // Build the worker bundle
    if (options.minify) {
      console.info('🔨 Building minified worker...');
      await $`bun build ./src/worker.ts --target=browser --outfile=${this.distDir}/worker.js --minify`;
    } else {
      console.info('🔨 Building worker...');
      await $`bun build ./src/worker.ts --target=browser --outfile=${this.distDir}/worker.js`;
    }

    // Get build size
    const stats = await Bun.file(join(this.distDir, 'worker.js')).size;
    const sizeKB = (stats / 1024).toFixed(2);
    console.info(`   ✅ Built: ${sizeKB}KB`);
  }

  /**
   * Deploy to Cloudflare
   */
  async deploy(options: CloudflareOptions = {}): Promise<void> {
    console.info('🚀 Deploying to Cloudflare Workers');
    console.info('='.repeat(50));

    const env = options.environment || 'development';

    if (options.dryRun) {
      console.info('🔍 DRY RUN - Would deploy with:');
      console.info(`   Environment: ${env}`);
      console.info(`   Command: wrangler deploy${env !== 'development' ? ` --env ${env}` : ''}`);
      return;
    }

    // Deploy based on environment
    console.info(`\n📦 Deploying to ${env}...`);

    try {
      if (env === 'development') {
        await $`wrangler deploy`;
      } else {
        await $`wrangler deploy --env ${env}`;
      }

      console.info('✅ Deployment successful!');

      // Get deployment URL
      const workerName = 'dashboard-worker';
      const accountSubdomain = 'nolarose1968-806';
      const url =
        env === 'production'
          ? `https://${workerName}.${accountSubdomain}.workers.dev`
          : `https://${workerName}-${env}.${accountSubdomain}.workers.dev`;

      console.info(`\n🌐 Deployed to: ${url}`);

      // Test the deployment
      console.info('\n🧪 Testing deployment...');
      const response = await fetch(url);
      const data = await response.json();
      console.info('   Status:', data.status);
      console.info('   Version:', data.version);
    } catch (error) {
      console.error('❌ Deployment failed:', error);
      throw error;
    }
  }

  /**
   * Run local development server
   */
  async runLocal(port: number = 8787): Promise<void> {
    console.info('🖥️  Starting Local Development Server');
    console.info('='.repeat(50));

    console.info(`\n📦 Port: ${port}`);
    console.info('   Press Ctrl+C to stop\n');

    await $`wrangler dev --port ${port} --local`;
  }

  /**
   * Create D1 database tables
   */
  async setupDatabase(): Promise<void> {
    console.info('🗄️  Setting up D1 Database');
    console.info('='.repeat(50));

    const schemaFile = join(process.cwd(), 'schema.sql');

    if (!existsSync(schemaFile)) {
      console.info('⚠️  No schema.sql file found');
      return;
    }

    console.info('\n📦 Applying database schema...');

    try {
      await $`wrangler d1 execute fire22-dashboard --file=${schemaFile}`;
      console.info('✅ Database schema applied');
    } catch (error) {
      console.error('❌ Database setup failed:', error);
    }
  }

  /**
   * Update secrets
   */
  async updateSecrets(secrets: Record<string, string>): Promise<void> {
    console.info('🔐 Updating Cloudflare Secrets');
    console.info('='.repeat(50));

    for (const [key, value] of Object.entries(secrets)) {
      console.info(`\n🔑 Setting ${key}...`);
      await $`echo ${value} | wrangler secret put ${key}`;
    }

    console.info('\n✅ All secrets updated');
  }

  /**
   * Full build and deploy pipeline
   */
  async pipeline(options: CloudflareOptions = {}): Promise<void> {
    console.info('🔄 Full Cloudflare Pipeline');
    console.info('='.repeat(50));

    // 1. Build
    console.info('\n1️⃣  Building worker...');
    await this.buildWorker(options);

    // 2. Test locally (optional)
    if (options.local) {
      console.info('\n2️⃣  Testing locally...');
      // This would run in background normally
      console.info('   Skipping local test (would block)');
    }

    // 3. Deploy
    console.info('\n3️⃣  Deploying...');
    await this.deploy(options);

    // 4. Verify
    console.info('\n4️⃣  Verifying deployment...');
    await this.verifyDeployment();

    console.info('\n✅ Pipeline complete!');
  }

  /**
   * Verify deployment
   */
  async verifyDeployment(): Promise<void> {
    const url = 'https://dashboard-worker.nolarose1968-806.workers.dev';

    try {
      const response = await fetch(url);
      const data = await response.json();

      console.info('📊 Deployment Status:');
      console.info(`   ✅ Status: ${data.status}`);
      console.info(`   📦 Version: ${data.version}`);
      console.info(`   🌍 Environment: ${data.environment}`);
      console.info(`   🕐 Timestamp: ${data.timestamp}`);
    } catch (error) {
      console.error('❌ Verification failed:', error);
    }
  }

  /**
   * Show Cloudflare info
   */
  async showInfo(): Promise<void> {
    console.info('ℹ️  Cloudflare Workers Information');
    console.info('='.repeat(50));

    // Account info
    console.info('\n👤 Account:');
    await $`wrangler whoami`;

    // Database info
    console.info('\n🗄️  Databases:');
    await $`wrangler d1 list`;

    // KV namespaces
    console.info('\n📦 KV Namespaces:');
    await $`wrangler kv:namespace list`;

    // Deployments
    console.info('\n🚀 Recent Deployments:');
    try {
      await $`wrangler deployments list --limit 5`;
    } catch {
      console.info('   No recent deployments or unable to fetch');
    }
  }
}

// CLI Interface
if (import.meta.main) {
  const builder = new CloudflareBuildSystem();
  const [command, ...args] = process.argv.slice(2);

  try {
    switch (command) {
      case 'build':
        await builder.buildWorker({
          minify: args.includes('--minify'),
          environment: args.find(a => ['development', 'staging', 'production'].includes(a)) as any,
        });
        break;

      case 'deploy':
        await builder.deploy({
          dryRun: args.includes('--dry-run'),
          environment: args.find(a => ['development', 'staging', 'production'].includes(a)) as any,
        });
        break;

      case 'local':
        const port = args.find(a => a.startsWith('--port='))?.split('=')[1];
        await builder.runLocal(port ? parseInt(port) : 8787);
        break;

      case 'database':
        await builder.setupDatabase();
        break;

      case 'pipeline':
        await builder.pipeline({
          environment: args.find(a => ['development', 'staging', 'production'].includes(a)) as any,
          minify: args.includes('--minify'),
          local: args.includes('--local'),
        });
        break;

      case 'verify':
        await builder.verifyDeployment();
        break;

      case 'info':
        await builder.showInfo();
        break;

      default:
        console.info(`
☁️  Cloudflare Build System
!==!==!==!==!===

Commands:
  build [env]      Build worker bundle
  deploy [env]     Deploy to Cloudflare
  local            Run local dev server
  database         Setup D1 database
  pipeline [env]   Full build & deploy
  verify           Verify deployment
  info             Show account info

Environments:
  development      Default environment
  staging          Staging environment
  production       Production environment

Options:
  --minify         Minify the build
  --dry-run        Preview without deploying
  --local          Test locally first
  --port=8787      Local dev server port

Examples:
  bun run scripts/build-cloudflare.ts build --minify
  bun run scripts/build-cloudflare.ts deploy production
  bun run scripts/build-cloudflare.ts pipeline staging --minify
  bun run scripts/build-cloudflare.ts verify
        `);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

export default CloudflareBuildSystem;
