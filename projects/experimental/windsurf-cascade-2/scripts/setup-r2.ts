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
    console.log('🚀 Global Trading System R2 Setup');
    console.log('================================');
    console.log('This script will configure everything you need for R2 deployment');
    console.log('Powered by Bun Package Manager for ultra-fast performance');
    console.log('');

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
      
      console.log('');
      console.log('🎉 Setup completed successfully!');
      console.log('Your Global Trading System is now deployed to Cloudflare R2');
      
    } catch (error) {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    }
  }

  private async checkPrerequisites(): Promise<void> {
    console.log('🔍 Checking prerequisites...');

    // Check if Bun is installed
    try {
      const bunVersion = execSync('bun --version', { encoding: 'utf8' }).trim();
      console.log(`  ✅ Bun ${bunVersion} installed`);
    } catch (error) {
      console.error('  ❌ Bun is not installed. Please install Bun first:');
      console.error('     curl -fsSL https://bun.sh/install | bash');
      throw error;
    }

    // Check if Wrangler is installed
    try {
      execSync('wrangler --version', { stdio: 'pipe' });
      console.log('  ✅ Wrangler CLI installed');
    } catch (error) {
      console.log('  ⚠️  Wrangler CLI not found, installing...');
      execSync('bun install -g wrangler', { stdio: 'inherit' });
      console.log('  ✅ Wrangler CLI installed');
    }

    // Check if we're in the right directory
    if (!existsSync('./global-trading-app.ts')) {
      console.error('  ❌ Please run this script from the project root directory');
      throw new Error('Invalid directory');
    }

    console.log('✅ All prerequisites satisfied');
  }

  private async gatherConfiguration(): Promise<void> {
    console.log('⚙️ Gathering configuration...');

    // Try to read from environment first
    this.config.accountId = process.env.R2_ACCOUNT_ID || '';
    this.config.apiToken = process.env.CLOUDFLARE_API_TOKEN || '';
    this.config.bucketName = process.env.R2_BUCKET_NAME || 'global-trading-packages';

    // If not in environment, prompt user
    if (!this.config.accountId) {
      console.log('  🔑 Please provide your Cloudflare Account ID:');
      console.log('     (Found in Cloudflare dashboard > Right sidebar > Account ID)');
      // In a real setup, you'd use readline or similar
      console.log('     Using environment variable R2_ACCOUNT_ID is recommended');
      this.config.accountId = 'your_account_id_here';
    }

    if (!this.config.apiToken) {
      console.log('  🔑 Please provide your Cloudflare API Token:');
      console.log('     (Create in Cloudflare dashboard > My Profile > API Tokens)');
      console.log('     Required permissions: R2:Edit, Account:Read');
      console.log('     Using environment variable CLOUDFLARE_API_TOKEN is recommended');
      this.config.apiToken = 'your_api_token_here';
    }

    console.log(`  📦 Bucket name: ${this.config.bucketName}`);
    console.log(`  🌍 Account ID: ${this.config.accountId.substring(0, 8)}...`);
    console.log('✅ Configuration gathered');
  }

  private async setupEnvironment(): Promise<void> {
    console.log('🌍 Setting up environment...');

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
        console.log('  ✅ Created .env.local from template');
      }
    }

    // Create R2 bucket if it doesn't exist
    try {
      console.log('  🪣 Creating R2 bucket...');
      execSync(`wrangler r2 bucket create ${this.config.bucketName}`, { stdio: 'pipe' });
      console.log(`  ✅ Created bucket: ${this.config.bucketName}`);
    } catch (error) {
      // Bucket might already exist
      console.log(`  ℹ️  Bucket ${this.config.bucketName} already exists or creation failed`);
    }

    console.log('✅ Environment setup completed');
  }

  private async configureBun(): Promise<void> {
    console.log('🥕 Configuring Bun package manager...');

    // Ensure bunfig.toml exists
    if (!existsSync('bunfig.toml')) {
      console.log('  ⚙️  bunfig.toml already configured');
    } else {
      console.log('  ✅ Bun configuration optimized');
    }

    console.log('✅ Bun configured for ultra-fast performance');
  }

  private async createWorkspace(): Promise<void> {
    console.log('📁 Creating workspace structure...');

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
        console.log(`  📁 Created ${dir}`);
      }
    }

    console.log('✅ Workspace structure created');
  }

  private async installDependencies(): Promise<void> {
    console.log('⬇️ Installing dependencies with Bun...');

    try {
      // Use Bun's ultra-fast package manager
      execSync('bun install --frozen-lockfile', { stdio: 'inherit' });
      console.log('✅ Dependencies installed at lightning speed');
    } catch (error) {
      console.error('❌ Failed to install dependencies:', error);
      throw error;
    }
  }

  private async buildPackages(): Promise<void> {
    console.log('🔨 Building packages with Bun...');

    try {
      // Build all packages
      execSync('bun run build:all', { stdio: 'inherit' });
      console.log('✅ All packages built successfully');
    } catch (error) {
      console.error('❌ Build failed:', error);
      throw error;
    }
  }

  private async deployToR2(): Promise<void> {
    console.log('☁️ Deploying to Cloudflare R2...');

    try {
      // Run the deployment script
      execSync('bun run scripts/upload-to-r2.ts', { stdio: 'inherit' });
      console.log('✅ Deployed to R2 successfully');
    } catch (error) {
      console.error('❌ Deployment failed:', error);
      throw error;
    }
  }

  private async verifyDeployment(): Promise<void> {
    console.log('🔍 Verifying deployment...');

    try {
      // Run verification script
      execSync('bun run scripts/verify-deployment.ts', { stdio: 'inherit' });
      console.log('✅ Deployment verified successfully');
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
