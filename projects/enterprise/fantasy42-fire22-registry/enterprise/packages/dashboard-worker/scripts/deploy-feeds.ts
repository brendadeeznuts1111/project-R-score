#!/usr/bin/env bun

/**
 * 📡 RSS Feed Deployment Script
 *
 * Deploys RSS feeds to Cloudflare Workers with validation and monitoring
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);

interface DeploymentConfig {
  environment?: string;
  dryRun?: boolean;
  skipValidation?: boolean;
  verbose?: boolean;
}

class FeedDeployer {
  private config: DeploymentConfig;

  constructor(config: DeploymentConfig = {}) {
    this.config = {
      environment: config.environment || 'production',
      dryRun: config.dryRun || false,
      skipValidation: config.skipValidation || false,
      verbose: config.verbose || false,
    };
  }

  async deploy(): Promise<void> {
    console.info('📡 Fire22 RSS Feed Deployment');
    console.info('!==!==!==!==!====\n');
    console.info(`🎯 Environment: ${this.config.environment}`);
    console.info(`🔍 Dry Run: ${this.config.dryRun ? 'Yes' : 'No'}`);
    console.info();

    try {
      // Step 1: Build feeds module
      await this.buildFeedsModule();

      // Step 2: Validate feeds
      if (!this.config.skipValidation) {
        await this.validateFeeds();
      }

      // Step 3: Run tests
      await this.runTests();

      // Step 4: Deploy to Cloudflare
      if (!this.config.dryRun) {
        await this.deployToCloudflare();
      } else {
        console.info('📝 Dry run - skipping actual deployment');
      }

      // Step 5: Verify deployment
      if (!this.config.dryRun) {
        await this.verifyDeployment();
      }

      console.info('\n✅ RSS Feed deployment completed successfully!');
    } catch (error) {
      console.error('\n❌ Deployment failed:', error);
      process.exit(1);
    }
  }

  private async buildFeedsModule(): Promise<void> {
    console.info('🔨 Building feeds module...');

    const buildScript = join(process.cwd(), 'scripts', 'build-feeds-module.ts');
    if (!existsSync(buildScript)) {
      throw new Error('Build script not found: ' + buildScript);
    }

    const { stdout, stderr } = await execAsync(`bun run ${buildScript}`);

    if (this.config.verbose) {
      console.info(stdout);
    }

    if (stderr) {
      console.error('Build warnings:', stderr);
    }

    console.info('✅ Feeds module built successfully');
  }

  private async validateFeeds(): Promise<void> {
    console.info('\n🔍 Validating RSS feeds...');

    const validateScript = join(process.cwd(), 'scripts', 'validate-feeds.ts');
    if (!existsSync(validateScript)) {
      console.warn('⚠️  Validation script not found, skipping validation');
      return;
    }

    try {
      const { stdout } = await execAsync(`bun run ${validateScript}`);
      if (this.config.verbose) {
        console.info(stdout);
      }
      console.info('✅ Feed validation passed');
    } catch (error: any) {
      throw new Error(`Feed validation failed: ${error.message}`);
    }
  }

  private async runTests(): Promise<void> {
    console.info('\n🧪 Running feed tests...');

    const testFiles = ['src/feeds-handler.ts', 'scripts/build-feeds-module.ts'];

    for (const file of testFiles) {
      if (existsSync(file)) {
        try {
          const { stdout } = await execAsync(`bun test ${file}`);
          if (this.config.verbose) {
            console.info(stdout);
          }
        } catch (error) {
          console.warn(`⚠️  Test failed for ${file}`);
        }
      }
    }

    console.info('✅ Tests completed');
  }

  private async deployToCloudflare(): Promise<void> {
    console.info('\n🚀 Deploying to Cloudflare Workers...');

    const envFlag =
      this.config.environment === 'production' ? '--env=""' : `--env=${this.config.environment}`;

    try {
      const { stdout, stderr } = await execAsync(`wrangler deploy ${envFlag}`);

      if (this.config.verbose) {
        console.info(stdout);
      }

      // Extract deployment URL
      const urlMatch = stdout.match(/https:\/\/[\w\-\.]+\.workers\.dev/);
      if (urlMatch) {
        console.info(`\n🌐 Deployed to: ${urlMatch[0]}`);
        console.info(`📡 RSS Feeds available at: ${urlMatch[0]}/feeds/`);
      }

      console.info('✅ Deployment successful');
    } catch (error: any) {
      throw new Error(`Cloudflare deployment failed: ${error.message}`);
    }
  }

  private async verifyDeployment(): Promise<void> {
    console.info('\n🔍 Verifying deployment...');

    // Get worker URL (you might need to adjust this based on your setup)
    const workerUrl = 'https://dashboard-worker.nolarose1968-806.workers.dev';

    const feedsToCheck = [
      '/feeds/',
      '/feeds/error-codes-rss.xml',
      '/feeds/team-announcements-rss.xml',
    ];

    for (const feed of feedsToCheck) {
      const url = `${workerUrl}${feed}`;
      try {
        const response = await fetch(url);
        if (response.ok) {
          console.info(`✅ ${feed} - Status: ${response.status}`);
        } else {
          console.warn(`⚠️  ${feed} - Status: ${response.status}`);
        }
      } catch (error) {
        console.error(`❌ ${feed} - Failed to fetch`);
      }
    }

    console.info('\n📡 RSS Feed URLs:');
    console.info(`  - Main Index: ${workerUrl}/feeds/`);
    console.info(`  - Error Codes RSS: ${workerUrl}/feeds/error-codes-rss.xml`);
    console.info(`  - Error Codes Atom: ${workerUrl}/feeds/error-codes-atom.xml`);
    console.info(`  - Team Announcements RSS: ${workerUrl}/feeds/team-announcements-rss.xml`);
    console.info(`  - Team Announcements Atom: ${workerUrl}/feeds/team-announcements-atom.xml`);
    console.info(`  - Critical Alerts: ${workerUrl}/feeds/critical-errors-alert.xml`);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const config: DeploymentConfig = {
  environment: process.env.DEPLOY_ENV || 'production',
  dryRun: args.includes('--dry-run'),
  skipValidation: args.includes('--skip-validation'),
  verbose: args.includes('--verbose') || args.includes('-v'),
};

// Handle environment argument
const envArg = args.find(arg => arg.startsWith('--env='));
if (envArg) {
  config.environment = envArg.split('=')[1];
}

// Run deployment
const deployer = new FeedDeployer(config);
deployer.deploy();
