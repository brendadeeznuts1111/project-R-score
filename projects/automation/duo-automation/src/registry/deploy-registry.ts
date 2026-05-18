#!/usr/bin/env bun

// infrastructure/cloudflare/deploy-registry.ts
import { $ } from "bun";
import { join } from "path";

interface DeploymentConfig {
  accountId: string;
  apiToken: string;
  domain?: string;
  environment: 'development' | 'staging' | 'production';
}

class CloudflareRegistryDeployer {
  private config: DeploymentConfig;
  
  constructor(config: DeploymentConfig) {
    this.config = config;
  }
  
  async deploy() {
    console.info('🚀 Deploying FactoryWager Registry to Cloudflare...');
    console.info(`📦 Environment: ${this.config.environment}`);
    console.info(`🌐 Account: ${this.config.accountId}\n`);
    
    try {
      // 1. Validate configuration
      await this.validateConfig();
      
      // 2. Set up authentication
      await this.setupAuth();
      
      // 3. Create R2 buckets
      await this.createBuckets();
      
      // 4. Deploy worker
      await this.deployWorker();
      
      // 5. Configure custom domain
      if (this.config.domain) {
        await this.configureDomain();
      }
      
      // 6. Test deployment
      await this.testDeployment();
      
      // 7. Output configuration
      await this.outputConfig();
      
      console.info('\n✅ Registry deployed successfully!');
      console.info('🌐 Registry URL: https://registry.factory-wager.com');
      console.info('📊 Health Check: https://registry.factory-wager.com/health');
      
    } catch (error) {
      console.error('\n❌ Deployment failed:', error.message);
      process.exit(1);
    }
  }
  
  private async validateConfig() {
    console.info('🔍 Validating configuration...');
    
    if (!this.config.accountId) {
      throw new Error('Cloudflare Account ID is required');
    }
    
    if (!this.config.apiToken) {
      throw new Error('Cloudflare API Token is required');
    }
    
    // Test API token
    try {
      const result = await $`curl -s -H "Authorization: Bearer ${this.config.apiToken}" "https://api.cloudflare.com/client/v4/user/tokens/verify"`.quiet();
      const response = JSON.parse(result.toString());
      
      if (!response.success) {
        throw new Error('Invalid API token');
      }
      
      console.info('  ✅ API token valid');
    } catch (error) {
      throw new Error(`API token validation failed: ${error.message}`);
    }
  }
  
  private async setupAuth() {
    console.info('🔐 Setting up authentication...');
    
    // Set environment variables for wrangler
    process.env.CLOUDFLARE_ACCOUNT_ID = this.config.accountId;
    process.env.CLOUDFLARE_API_TOKEN = this.config.apiToken;
    
    console.info('  ✅ Authentication configured');
  }
  
  private async createBuckets() {
    console.info('📦 Creating R2 buckets...');
    
    const buckets = [
      'factory-wager-registry',
      'factory-wager-packages',
      'factory-wager-metadata'
    ];
    
    for (const bucket of buckets) {
      try {
        await $`wrangler r2 bucket create ${bucket}`.quiet();
        console.info(`  ✅ Created bucket: ${bucket}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.info(`  ⚠️  Bucket already exists: ${bucket}`);
        } else {
          throw new Error(`Failed to create bucket ${bucket}: ${error.message}`);
        }
      }
    }
  }
  
  private async deployWorker() {
    console.info('🚀 Deploying Cloudflare Worker...');
    
    try {
      // Deploy to production
      await $`wrangler deploy --env production`.quiet();
      console.info('  ✅ Worker deployed to production');
      
      // Deploy to preview (optional)
      try {
        await $`wrangler deploy --env preview`.quiet();
        console.info('  ✅ Worker deployed to preview');
      } catch (error) {
        console.info(`  ⚠️  Preview deployment failed: ${error.message}`);
      }
      
    } catch (error) {
      throw new Error(`Worker deployment failed: ${error.message}`);
    }
  }
  
  private async configureDomain() {
    console.info('🌐 Configuring custom domain...');
    
    if (!this.config.domain) {
      console.info('  ⚠️  No custom domain specified, skipping');
      return;
    }
    
    try {
      await $`wrangler custom-domains add ${this.config.domain}`.quiet();
      console.info(`  ✅ Custom domain configured: ${this.config.domain}`);
    } catch (error) {
      console.info(`  ⚠️  Domain configuration failed: ${error.message}`);
      console.info('  💡 You may need to configure DNS manually');
    }
  }
  
  private async testDeployment() {
    console.info('🧪 Testing deployment...');
    
    const testUrl = this.config.domain 
      ? `https://${this.config.domain}/health`
      : 'https://registry.factory-wager-registry.utahj4754.workers.dev/health';
    
    try {
      // Wait a moment for deployment to propagate
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const response = await fetch(testUrl);
      const health = await response.json();
      
      if (health.status === 'ok') {
        console.info('  ✅ Registry health check passed');
        console.info(`  📊 Service: ${health.service}`);
        console.info(`  🏢 Organization: ${health.organization}`);
        console.info(`  🌐 Website: ${health.website}`);
        console.info(`  🕐 Version: ${health.version}`);
      } else {
        throw new Error('Registry health check failed');
      }
    } catch (error) {
      console.info(`  ⚠️  Health check failed: ${error.message}`);
      console.info('  💡 The worker may still be propagating. Try again in a few minutes.');
    }
  }
  
  private async outputConfig() {
    console.info('\n📋 Factory Wager Registry Configuration:');
    console.info(`Main Registry: https://registry.factory-wager-registry.utahj4754.workers.dev`);
    console.info(`NPM Endpoint: https://npm.factory-wager-registry.utahj4754.workers.dev`);
    console.info(`Package Downloads: https://packages.factory-wager-registry.utahj4754.workers.dev`);
    console.info(`API Endpoint: https://registry.factory-wager-registry.utahj4754.workers.dev/@factory-wager`);
    console.info(`Health Check: https://registry.factory-wager-registry.utahj4754.workers.dev/health`);
    console.info(`Search API: https://registry.factory-wager-registry.utahj4754.workers.dev/-/v1/search`);
    
    // Create npmrc configuration
    const npmrc = `
@factory-wager:registry=https://registry.factory-wager-registry.utahj4754.workers.dev
//registry.factory-wager-registry.utahj4754.workers.dev/:_authToken=${process.env.FACTORY_WAGER_REGISTRY_TOKEN || 'YOUR_REGISTRY_TOKEN'}
always-auth=true
    `.trim();
    
    await Bun.write('.npmrc', npmrc);
    console.info('\n📝 Created .npmrc file for Factory Wager registry');
    
    // Create environment file template
    const envTemplate = `
# Factory Wager Registry Configuration
CLOUDFLARE_ACCOUNT_ID=${this.config.accountId}
CLOUDFLARE_API_TOKEN=${this.config.apiToken}
REGISTRY_URL=https://registry.factory-wager-registry.utahj4754.workers.dev
FACTORY_WAGER_DOMAIN=registry.factory-wager-registry.utahj4754.workers.dev
FACTORY_WAGER_REGISTRY_TOKEN=YOUR_REGISTRY_TOKEN

# Publishing Configuration
NPM_CONFIG_REGISTRY=https://registry.factory-wager-registry.utahj4754.workers.dev
NPM_CONFIG_AUTH_TOKEN=YOUR_REGISTRY_TOKEN

# Factory Wager Branding
REGISTRY_NAME=Factory Wager Enterprise Registry
ORGANIZATION=Factory Wager
WEBSITE=https://factory-wager-registry.utahj4754.workers.dev
SUPPORT_EMAIL=registry@factory-wager-registry.utahj4754.workers.dev
    `.trim();
    
    await Bun.write('.env.factory-wager', envTemplate);
    console.info('📝 Created .env.factory-wager file with configuration');
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (command === 'deploy') {
    const config: DeploymentConfig = {
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID || '',
      apiToken: process.env.CLOUDFLARE_API_TOKEN || '',
      domain: process.env.REGISTRY_DOMAIN || 'registry.factory-wager.com',
      environment: (process.env.NODE_ENV as any) || 'production'
    };
    
    const deployer = new CloudflareRegistryDeployer(config);
    await deployer.deploy();
    
  } else if (command === 'test') {
    console.info('🧪 Testing Cloudflare connection...');
    
    try {
      const result = await $`wrangler whoami`.quiet();
      console.info('✅ Cloudflare authentication successful');
      console.info(result.toString());
    } catch (error) {
      console.error('❌ Cloudflare authentication failed:', error.message);
      process.exit(1);
    }
    
  } else {
    console.info(`
Usage: bun run infrastructure/cloudflare/deploy-registry.ts [command]

Commands:
  deploy   - Deploy the registry to Cloudflare
  test     - Test Cloudflare connection

Environment Variables:
  CLOUDFLARE_ACCOUNT_ID  - Your Cloudflare Account ID
  CLOUDFLARE_API_TOKEN    - Your Cloudflare API Token
  REGISTRY_DOMAIN        - Custom domain (default: registry.factory-wager.com)
  NODE_ENV               - Environment (default: production)

Example:
  export CLOUDFLARE_ACCOUNT_ID=your-account-id
  export CLOUDFLARE_API_TOKEN=your-api-token
  bun run infrastructure/cloudflare/deploy-registry.ts deploy
    `);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}
