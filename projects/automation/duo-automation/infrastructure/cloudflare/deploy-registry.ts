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
    console.log('🚀 Deploying DuoPlus Registry to Cloudflare...');
    console.log(`📦 Environment: ${this.config.environment}`);
    console.log(`🌐 Account: ${this.config.accountId}\n`);
    
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
      
      console.log('\n✅ Registry deployed successfully!');
      console.log('🌐 Registry URL: https://registry.duoplus.com');
      console.log('📊 Health Check: https://registry.duoplus.com/health');
      
    } catch (error) {
      console.error('\n❌ Deployment failed:', error.message);
      process.exit(1);
    }
  }
  
  private async validateConfig() {
    console.log('🔍 Validating configuration...');
    
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
      
      console.log('  ✅ API token valid');
    } catch (error) {
      throw new Error(`API token validation failed: ${error.message}`);
    }
  }
  
  private async setupAuth() {
    console.log('🔐 Setting up authentication...');
    
    // Set environment variables for wrangler
    process.env.CLOUDFLARE_ACCOUNT_ID = this.config.accountId;
    process.env.CLOUDFLARE_API_TOKEN = this.config.apiToken;
    
    console.log('  ✅ Authentication configured');
  }
  
  private async createBuckets() {
    console.log('📦 Creating R2 buckets...');
    
    const buckets = [
      'duoplus-registry',
      'duoplus-packages',
      'duoplus-metadata'
    ];
    
    for (const bucket of buckets) {
      try {
        await $`wrangler r2 bucket create ${bucket}`.quiet();
        console.log(`  ✅ Created bucket: ${bucket}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`  ⚠️  Bucket already exists: ${bucket}`);
        } else {
          throw new Error(`Failed to create bucket ${bucket}: ${error.message}`);
        }
      }
    }
  }
  
  private async deployWorker() {
    console.log('🚀 Deploying Cloudflare Worker...');
    
    try {
      // Deploy to production
      await $`wrangler deploy --env production`.quiet();
      console.log('  ✅ Worker deployed to production');
      
      // Deploy to preview (optional)
      try {
        await $`wrangler deploy --env preview`.quiet();
        console.log('  ✅ Worker deployed to preview');
      } catch (error) {
        console.log(`  ⚠️  Preview deployment failed: ${error.message}`);
      }
      
    } catch (error) {
      throw new Error(`Worker deployment failed: ${error.message}`);
    }
  }
  
  private async configureDomain() {
    console.log('🌐 Configuring custom domain...');
    
    if (!this.config.domain) {
      console.log('  ⚠️  No custom domain specified, skipping');
      return;
    }
    
    try {
      await $`wrangler custom-domains add ${this.config.domain}`.quiet();
      console.log(`  ✅ Custom domain configured: ${this.config.domain}`);
    } catch (error) {
      console.log(`  ⚠️  Domain configuration failed: ${error.message}`);
      console.log('  💡 You may need to configure DNS manually');
    }
  }
  
  private async testDeployment() {
    console.log('🧪 Testing deployment...');
    
    const testUrl = this.config.domain 
      ? `https://${this.config.domain}/health`
      : 'https://registry.factory-wager.com/health';
    
    try {
      // Wait a moment for deployment to propagate
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const response = await fetch(testUrl);
      const health = await response.json();
      
      if (health.status === 'ok') {
        console.log('  ✅ Registry health check passed');
        console.log(`  📊 Service: ${health.service}`);
        console.log(`  🏢 Organization: ${health.organization}`);
        console.log(`  🌐 Website: ${health.website}`);
        console.log(`  🕐 Version: ${health.version}`);
      } else {
        throw new Error('Registry health check failed');
      }
    } catch (error) {
      console.log(`  ⚠️  Health check failed: ${error.message}`);
      console.log('  💡 The worker may still be propagating. Try again in a few minutes.');
    }
  }
  
  private async outputConfig() {
    console.log('\n📋 Factory Wager Registry Configuration:');
    console.log(`Main Registry: https://registry.factory-wager.com`);
    console.log(`NPM Endpoint: https://registry.factory-wager.com`);
    console.log(`Package Downloads: https://packages.factory-wager.com`);
    console.log(`API Endpoint: https://registry.factory-wager.com/@duoplus`);
    console.log(`Health Check: https://registry.factory-wager.com/health`);
    console.log(`Search API: https://registry.factory-wager.com/-/v1/search`);
    
    // Create npmrc configuration
    const npmrc = `
@duoplus:registry=https://registry.factory-wager.com
//registry.factory-wager.com/:_authToken=${process.env.DUOPLUS_REGISTRY_TOKEN || 'YOUR_REGISTRY_TOKEN'}
always-auth=true
    `.trim();
    
    await Bun.write('.npmrc', npmrc);
    console.log('\n📝 Created .npmrc file for Factory Wager registry');
    
    // Create environment file template
    const envTemplate = `
# Factory Wager Registry Configuration
CLOUDFLARE_ACCOUNT_ID=${this.config.accountId}
CLOUDFLARE_API_TOKEN=${this.config.apiToken}
REGISTRY_URL=https://registry.factory-wager.com
FACTORY_WAGER_DOMAIN=registry.factory-wager.com
DUOPLUS_REGISTRY_TOKEN=YOUR_REGISTRY_TOKEN

# Publishing Configuration
NPM_CONFIG_REGISTRY=https://registry.factory-wager.com
NPM_CONFIG_AUTH_TOKEN=YOUR_REGISTRY_TOKEN

# Factory Wager Branding
REGISTRY_NAME=Factory Wager Enterprise Registry
ORGANIZATION=Factory Wager
WEBSITE=https://factory-wager.com
SUPPORT_EMAIL=registry@factory-wager.com
    `.trim();
    
    await Bun.write('.env.factory-wager', envTemplate);
    console.log('📝 Created .env.factory-wager file with configuration');
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
      domain: process.env.REGISTRY_DOMAIN || 'registry.duoplus.com',
      environment: (process.env.NODE_ENV as any) || 'production'
    };
    
    const deployer = new CloudflareRegistryDeployer(config);
    await deployer.deploy();
    
  } else if (command === 'test') {
    console.log('🧪 Testing Cloudflare connection...');
    
    try {
      const result = await $`wrangler whoami`.quiet();
      console.log('✅ Cloudflare authentication successful');
      console.log(result.toString());
    } catch (error) {
      console.error('❌ Cloudflare authentication failed:', error.message);
      process.exit(1);
    }
    
  } else {
    console.log(`
Usage: bun run infrastructure/cloudflare/deploy-registry.ts [command]

Commands:
  deploy   - Deploy the registry to Cloudflare
  test     - Test Cloudflare connection

Environment Variables:
  CLOUDFLARE_ACCOUNT_ID  - Your Cloudflare Account ID
  CLOUDFLARE_API_TOKEN    - Your Cloudflare API Token
  REGISTRY_DOMAIN        - Custom domain (default: registry.duoplus.com)
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
