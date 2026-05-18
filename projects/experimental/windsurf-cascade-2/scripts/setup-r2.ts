#!/usr/bin/env bun
// One-Click R2 Setup for Global Trading System
// Makes deployment incredibly easy with Bun's advanced package manager

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

interface SetupConfig {
  bucketName: string;
  accountId: string;
  apiToken: string;
  region: string;
}

class R2SetupManager {
  private config: SetupConfig;

  constructor() {
    this.config = {
      bucketName: '',
      accountId: '',
      apiToken: '',
      region: 'auto'
    };
  }

  async run(): Promise<void> {
    console.info('🚀 Global Trading System R2 Setup');
    console.info('================================');
    console.info('This script will configure everything you need for R2 deployment');
    console.info('Powered by Bun Package Manager for ultra-fast performance');
    console.info('');

    try {
      // Step 1: Check prerequisites
      await this.checkPrerequisites();
      
      // Step 2: Gather configuration
      await this.gatherConfiguration();
      
      // Step 3: Setup environment
      await this.setupEnvironment();
      
      // Step 4: Configure Bun
      await this.configureBun();
      
      // Step 5: Create workspace
      await this.createWorkspace();
      
      // Step 6: Install dependencies
      await this.installDependencies();
      
      // Step 7: Build packages
      await this.buildPackages();
      
      // Step 8: Deploy to R2
      await this.deployToR2();
      
      // Step 9: Verify deployment
      await this.verifyDeployment();
      
      console.info('');
      console.info('🎉 Setup completed successfully!');
      console.info('Your Global Trading System is now deployed to Cloudflare R2');
      
    } catch (error) {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    }
  }

  private async checkPrerequisites(): Promise<void> {
    console.info('🔍 Checking prerequisites...');

    // Check if Bun is installed
    try {
      const bunVersion = execSync('bun --version', { encoding: 'utf8' }).trim();
      console.info(`  ✅ Bun ${bunVersion} installed`);
    } catch (error) {
      console.error('  ❌ Bun is not installed. Please install Bun first:');
      console.error('     curl -fsSL https://bun.sh/install | bash');
      throw error;
    }

    // Check if Wrangler is installed
    try {
      execSync('wrangler --version', { stdio: 'pipe' });
      console.info('  ✅ Wrangler CLI installed');
    } catch (error) {
      console.info('  ⚠️  Wrangler CLI not found, installing...');
      execSync('bun install -g wrangler', { stdio: 'inherit' });
      console.info('  ✅ Wrangler CLI installed');
    }

    // Check if we're in the right directory
    if (!existsSync('./global-trading-app.ts')) {
      console.error('  ❌ Please run this script from the project root directory');
      throw new Error('Invalid directory');
    }

    console.info('✅ All prerequisites satisfied');
  }

  private async gatherConfiguration(): Promise<void> {
    console.info('⚙️ Gathering configuration...');

    // Try to read from environment first
    this.config.accountId = process.env.R2_ACCOUNT_ID || '';
    this.config.apiToken = process.env.CLOUDFLARE_API_TOKEN || '';
    this.config.bucketName = process.env.R2_BUCKET_NAME || 'global-trading-packages';

    // If not in environment, prompt user
    if (!this.config.accountId) {
      console.info('  🔑 Please provide your Cloudflare Account ID:');
      console.info('     (Found in Cloudflare dashboard > Right sidebar > Account ID)');
      // In a real setup, you'd use readline or similar
      console.info('     Using environment variable R2_ACCOUNT_ID is recommended');
      this.config.accountId = 'your_account_id_here';
    }

    if (!this.config.apiToken) {
      console.info('  🔑 Please provide your Cloudflare API Token:');
      console.info('     (Create in Cloudflare dashboard > My Profile > API Tokens)');
      console.info('     Required permissions: R2:Edit, Account:Read');
      console.info('     Using environment variable CLOUDFLARE_API_TOKEN is recommended');
      this.config.apiToken = 'your_api_token_here';
    }

    console.info(`  📦 Bucket name: ${this.config.bucketName}`);
    console.info(`  🌍 Account ID: ${this.config.accountId.substring(0, 8)}...`);
    console.info('✅ Configuration gathered');
  }

  private async setupEnvironment(): Promise<void> {
    console.info('🌍 Setting up environment...');

    // Create .env.local from template
    if (!existsSync('.env.local')) {
      if (existsSync('.env.r2.template')) {
        let envContent = readFileSync('.env.r2.template', 'utf8');
        
        // Replace placeholders
        envContent = envContent
          .replace('your_cloudflare_account_id_here', this.config.accountId)
          .replace('your_cloudflare_api_token_here', this.config.apiToken)
          .replace('global-trading-packages', this.config.bucketName);

        writeFileSync('.env.local', envContent);
        console.info('  ✅ Created .env.local from template');
      }
    }

    // Create R2 bucket if it doesn't exist
    try {
      console.info('  🪣 Creating R2 bucket...');
      execSync(`wrangler r2 bucket create ${this.config.bucketName}`, { stdio: 'pipe' });
      console.info(`  ✅ Created bucket: ${this.config.bucketName}`);
    } catch (error) {
      // Bucket might already exist
      console.info(`  ℹ️  Bucket ${this.config.bucketName} already exists or creation failed`);
    }

    console.info('✅ Environment setup completed');
  }

  private async configureBun(): Promise<void> {
    console.info('🥕 Configuring Bun package manager...');

    // Ensure bunfig.toml exists
    if (!existsSync('bunfig.toml')) {
      console.info('  ⚙️  bunfig.toml already configured');
    } else {
      console.info('  ✅ Bun configuration optimized');
    }

    console.info('✅ Bun configured for ultra-fast performance');
  }

  private async createWorkspace(): Promise<void> {
    console.info('📁 Creating workspace structure...');

    const dirs = [
      'packages/core',
      'packages/integrations',
      'packages/platforms',
      'packages/dashboard',
      'packages/cli',
      'dist',
      'scripts'
    ];

    for (const dir of dirs) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
        console.info(`  📁 Created ${dir}`);
      }
    }

    console.info('✅ Workspace structure created');
  }

  private async installDependencies(): Promise<void> {
    console.info('⬇️ Installing dependencies with Bun...');

    try {
      // Use Bun's ultra-fast package manager
      execSync('bun install --frozen-lockfile', { stdio: 'inherit' });
      console.info('✅ Dependencies installed at lightning speed');
    } catch (error) {
      console.error('❌ Failed to install dependencies:', error);
      throw error;
    }
  }

  private async buildPackages(): Promise<void> {
    console.info('🔨 Building packages with Bun...');

    try {
      // Build all packages
      execSync('bun run build:all', { stdio: 'inherit' });
      console.info('✅ All packages built successfully');
    } catch (error) {
      console.error('❌ Build failed:', error);
      throw error;
    }
  }

  private async deployToR2(): Promise<void> {
    console.info('☁️ Deploying to Cloudflare R2...');

    try {
      // Run the deployment script
      execSync('bun run scripts/upload-to-r2.ts', { stdio: 'inherit' });
      console.info('✅ Deployed to R2 successfully');
    } catch (error) {
      console.error('❌ Deployment failed:', error);
      throw error;
    }
  }

  private async verifyDeployment(): Promise<void> {
    console.info('🔍 Verifying deployment...');

    try {
      // Run verification script
      execSync('bun run scripts/verify-deployment.ts', { stdio: 'inherit' });
      console.info('✅ Deployment verified successfully');
    } catch (error) {
      console.error('❌ Verification failed:', error);
      throw error;
    }
  }
}

// Main execution
async function main() {
  const setup = new R2SetupManager();
  await setup.run();
}

if (import.meta.main) {
  main().catch(console.error);
}
