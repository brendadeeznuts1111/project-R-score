#!/usr/bin/env tsx

/**
 * Deploy Docs Worker Script
 * Crystal Clear Architecture - Automated Documentation Deployment
 *
 * This script handles the complete deployment process for the documentation CDN worker.
 */

import { execSync, spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

interface DeploymentConfig {
  workerName: string;
  githubRepo: string;
  githubBranch: string;
  cloudflareAccountId?: string;
  githubToken?: string;
}

class DocsWorkerDeployer {
  private config: DeploymentConfig;
  private projectRoot: string;

  constructor() {
    this.projectRoot = path.resolve(process.cwd());
    this.config = {
      workerName: 'crystal-clear-docs',
      githubRepo: 'brendadeeznuts1111/crystal-clear-architecture',
      githubBranch: 'main',
      cloudflareAccountId: process.env.CLOUDFLARE_ACCOUNT_ID,
      githubToken: process.env.GITHUB_TOKEN,
    };
  }

  /**
   * Main deployment process
   */
  async deploy(): Promise<void> {
    console.log('🚀 Starting Crystal Clear Docs Worker Deployment...\n');

    try {
      await this.validateEnvironment();
      await this.validateFiles();
      await this.buildAndDeploy();
      await this.verifyDeployment();
      await this.printSuccess();
    } catch (error) {
      console.error('❌ Deployment failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  /**
   * Validate environment and dependencies
   */
  private async validateEnvironment(): Promise<void> {
    console.log('🔍 Validating environment...');

    // Check Node.js version
    const nodeVersion = process.version;
    if (!nodeVersion.includes('v18') && !nodeVersion.includes('v20')) {
      throw new Error(`Node.js version ${nodeVersion} not supported. Please use Node.js 18+`);
    }

    // Check if wrangler is installed
    try {
      execSync('wrangler --version', { stdio: 'pipe' });
    } catch (error) {
      throw new Error('Wrangler CLI not found. Install with: bun add -g wrangler');
    }

    // Check Cloudflare authentication
    try {
      execSync('wrangler whoami', { stdio: 'pipe' });
    } catch (error) {
      console.log('⚠️  Not authenticated with Cloudflare. Running login...');
      execSync('wrangler auth login', { stdio: 'inherit' });
    }

    console.log('✅ Environment validation passed\n');
  }

  /**
   * Validate required files exist
   */
  private async validateFiles(): Promise<void> {
    console.log('📁 Validating files...');

    const requiredFiles = [
      'docs-worker/src/docs-worker.ts',
      'docs-worker/wrangler.toml',
      'docs-worker/package.json',
      'docs/index.html',
      'docs/communication.html',
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(this.projectRoot, file);
      try {
        await fs.access(filePath);
        console.log(`  ✅ ${file}`);
      } catch (error) {
        throw new Error(`Required file missing: ${file}`);
      }
    }

    console.log('✅ File validation passed\n');
  }

  /**
   * Build and deploy the worker
   */
  private async buildAndDeploy(): Promise<void> {
    console.log('🏗️  Building and deploying worker...');

    const workerDir = path.join(this.projectRoot, 'docs-worker');

    // Change to worker directory
    process.chdir(workerDir);

    try {
      // Install dependencies
      console.log('📦 Installing dependencies...');
      execSync('bun install', { stdio: 'inherit' });

      // Run type check
      console.log('🔍 Running type check...');
      execSync('bun run typecheck', { stdio: 'pipe' });

      // Deploy to Cloudflare
      console.log('🚀 Deploying to Cloudflare...');
      execSync('bun run deploy', { stdio: 'inherit' });
    } catch (error) {
      throw new Error(`Build/deploy failed: ${error instanceof Error ? error.message : error}`);
    } finally {
      // Change back to project root
      process.chdir(this.projectRoot);
    }

    console.log('✅ Build and deployment completed\n');
  }

  /**
   * Verify the deployment is working
   */
  private async verifyDeployment(): Promise<void> {
    console.log('🩺 Verifying deployment...');

    const workerUrl = `https://${this.config.workerName}.nolarose1968.workers.dev`;

    // Wait a moment for deployment to propagate
    await this.sleep(5000);

    // Test health endpoint
    try {
      const response = await fetch(`${workerUrl}/api/health`);
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      const health = await response.json();
      console.log(`  ✅ Health check passed: ${health.status}`);
    } catch (error) {
      console.log(`  ⚠️  Health check failed, but deployment may still succeed`);
      console.log(`     Error: ${error instanceof Error ? error.message : error}`);
    }

    // Test main page
    try {
      const response = await fetch(`${workerUrl}/`);
      if (response.ok) {
        console.log(`  ✅ Main page accessible`);
      } else {
        console.log(`  ⚠️  Main page returned ${response.status}`);
      }
    } catch (error) {
      console.log(`  ⚠️  Main page check failed`);
    }

    console.log('✅ Deployment verification completed\n');
  }

  /**
   * Print success message with useful URLs
   */
  private async printSuccess(): Promise<void> {
    const workerUrl = `https://${this.config.workerName}.nolarose1968.workers.dev`;

    console.log('🎉 Crystal Clear Docs Worker Deployed Successfully!');
    console.log('');
    console.log('📖 Live Documentation URLs:');
    console.log(`   🌐 Main Site: ${workerUrl}`);
    console.log(`   🩺 Health Check: ${workerUrl}/api/health`);
    console.log(`   📋 API Info: ${workerUrl}/api/docs`);
    console.log(`   📞 Communication: ${workerUrl}/communication.html`);
    console.log(`   🌐 Domains: ${workerUrl}/domains.html`);
    console.log(`   ⚡ Performance: ${workerUrl}/performance.html`);
    console.log('');
    console.log('🔧 Management:');
    console.log(`   📊 View Logs: wrangler tail`);
    console.log(`   🔄 Redeploy: bun run deploy (from docs-worker/)`);
    console.log(`   🧹 Clear Cache: POST ${workerUrl}/api/clear-cache`);
    console.log('');
    console.log('⚡ Features:');
    console.log('   • Automatic content fetching from GitHub');
    console.log('   • Smart caching with ETags');
    console.log('   • Real-time updates on git push');
    console.log('   • CDN optimization via Cloudflare');
    console.log('   • Comprehensive health monitoring');
    console.log('');
    console.log('🚀 Deployment completed successfully!');
  }

  /**
   * Utility function to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI runner
async function main() {
  const deployer = new DocsWorkerDeployer();

  try {
    await deployer.deploy();
  } catch (error) {
    console.error('💥 Deployment script failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { DocsWorkerDeployer };
