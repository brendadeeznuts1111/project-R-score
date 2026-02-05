// scripts/deploy-admin-dashboard.ts
/**
 * 🚀 Admin Dashboard Cloudflare Worker Deployment Script
 * 
 * Automated deployment of the admin dashboard to Cloudflare Workers
 * with global CDN distribution and edge computing capabilities.
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface DeploymentConfig {
  environment: 'development' | 'staging' | 'production';
  domain: string;
  workerName: string;
  kvNamespace?: string;
  d1Database?: string;
}

const deploymentConfigs: Record<string, DeploymentConfig> = {
  development: {
    environment: 'development',
    domain: 'admin-dev.factory-wager.com',
    workerName: 'admin-dashboard-dev',
    kvNamespace: 'admin-dashboard-dev-kv',
    d1Database: 'admin-dashboard-dev-db'
  },
  staging: {
    environment: 'staging',
    domain: 'admin-staging.factory-wager.com',
    workerName: 'admin-dashboard-staging',
    kvNamespace: 'admin-dashboard-staging-kv',
    d1Database: 'admin-dashboard-staging-db'
  },
  production: {
    environment: 'production',
    domain: 'admin.factory-wager.com',
    workerName: 'admin-dashboard',
    kvNamespace: 'admin-dashboard-kv',
    d1Database: 'admin-dashboard-db'
  }
};

class AdminDashboardDeployer {
  private config: DeploymentConfig;

  constructor(environment: string) {
    const config = deploymentConfigs[environment];
    if (!config) {
      throw new Error(`Invalid environment: ${environment}. Must be one of: ${Object.keys(deploymentConfigs).join(', ')}`);
    }
    this.config = config;
  }

  async deploy(): Promise<void> {
    console.log('🚀 DEPLOYING ADMIN DASHBOARD TO CLOUDFLARE WORKERS');
    console.log('='.repeat(60));
    console.log(`📊 Environment: ${this.config.environment}`);
    console.log(`🌐 Domain: ${this.config.domain}`);
    console.log(`🏭 Worker: ${this.config.workerName}`);
    console.log('');

    try {
      await this.prerequisites();
      await this.setupKVNamespace();
      await this.setupD1Database();
      await this.deployWorker();
      await this.verifyDeployment();
      await this.postDeployment();

      console.log('');
      console.log('✅ ADMIN DASHBOARD DEPLOYMENT SUCCESSFUL!');
      console.log(`🌐 Available at: https://${this.config.domain}`);
      console.log('');
    } catch (error) {
      console.error('❌ DEPLOYMENT FAILED:', error);
      process.exit(1);
    }
  }

  private async prerequisites(): Promise<void> {
    console.log('🔍 CHECKING PREREQUISITES...');

    // Check if Wrangler CLI is installed
    try {
      execSync('wrangler --version', { stdio: 'pipe' });
      console.log('✅ Wrangler CLI found');
    } catch (error) {
      console.error('❌ Wrangler CLI not found. Please install it with: npm install -g wrangler');
      throw error;
    }

    // Check if user is logged in to Cloudflare
    try {
      execSync('wrangler whoami', { stdio: 'pipe' });
      console.log('✅ Cloudflare authentication verified');
    } catch (error) {
      console.error('❌ Not logged in to Cloudflare. Please run: wrangler auth login');
      throw error;
    }

    // Verify source files exist
    const workerFile = join(process.cwd(), 'src/registry/admin-dashboard-worker.ts');
    const wranglerFile = join(process.cwd(), 'src/registry/admin-wrangler.toml');

    try {
      readFileSync(workerFile);
      readFileSync(wranglerFile);
      console.log('✅ Source files verified');
    } catch (error) {
      console.error('❌ Source files not found');
      throw error;
    }

    console.log('✅ Prerequisites check completed\n');
  }

  private async setupKVNamespace(): Promise<void> {
    console.log('📦 SETTING UP KV NAMESPACE...');

    if (!this.config.kvNamespace) {
      console.log('⏭️ Skipping KV namespace setup');
      return;
    }

    try {
      // Create KV namespace if it doesn't exist
      console.log(`🔧 Creating KV namespace: ${this.config.kvNamespace}`);
      
      const createCommand = `wrangler kv:namespace create "${this.config.kvNamespace}" --env ${this.config.environment}`;
      execSync(createCommand, { stdio: 'pipe' });
      
      console.log('✅ KV namespace created/verified');
    } catch (error) {
      // KV namespace might already exist, which is fine
      console.log('⚠️ KV namespace might already exist');
    }

    console.log('✅ KV namespace setup completed\n');
  }

  private async setupD1Database(): Promise<void> {
    console.log('🗄️ SETTING UP D1 DATABASE...');

    if (!this.config.d1Database) {
      console.log('⏭️ Skipping D1 database setup');
      return;
    }

    try {
      // Create D1 database if it doesn't exist
      console.log(`🔧 Creating D1 database: ${this.config.d1Database}`);
      
      const createCommand = `wrangler d1 create "${this.config.d1Database}"`;
      execSync(createCommand, { stdio: 'pipe' });
      
      console.log('✅ D1 database created/verified');
    } catch (error) {
      // D1 database might already exist, which is fine
      console.log('⚠️ D1 database might already exist');
    }

    console.log('✅ D1 database setup completed\n');
  }

  private async deployWorker(): Promise<void> {
    console.log('🚀 DEPLOYING WORKER...');

    try {
      // Deploy the worker
      const deployCommand = `wrangler deploy --config src/registry/admin-wrangler.toml --env ${this.config.environment}`;
      console.log(`🔧 Running: ${deployCommand}`);
      
      execSync(deployCommand, { stdio: 'inherit' });
      
      console.log('✅ Worker deployed successfully');
    } catch (error) {
      console.error('❌ Worker deployment failed');
      throw error;
    }

    console.log('✅ Worker deployment completed\n');
  }

  private async verifyDeployment(): Promise<void> {
    console.log('🔍 VERIFYING DEPLOYMENT...');

    try {
      // Wait a moment for the deployment to propagate
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Test the deployed worker
      const testUrl = `https://${this.config.domain}/health`;
      console.log(`🔧 Testing: ${testUrl}`);

      const response = await fetch(testUrl);
      
      if (response.ok) {
        console.log('✅ Health check passed');
      } else {
        throw new Error(`Health check failed with status: ${response.status}`);
      }

      // Test the main dashboard
      const dashboardUrl = `https://${this.config.domain}`;
      console.log(`🔧 Testing dashboard: ${dashboardUrl}`);

      const dashboardResponse = await fetch(dashboardUrl);
      
      if (dashboardResponse.ok) {
        console.log('✅ Dashboard test passed');
      } else {
        throw new Error(`Dashboard test failed with status: ${dashboardResponse.status}`);
      }

      console.log('✅ Deployment verification completed\n');
    } catch (error) {
      console.error('❌ Deployment verification failed');
      throw error;
    }
  }

  private async postDeployment(): Promise<void> {
    console.log('📋 POST-DEPLOYMENT TASKS...');

    // Generate deployment report
    const report = {
      deployment: {
        timestamp: new Date().toISOString(),
        environment: this.config.environment,
        domain: this.config.domain,
        workerName: this.config.workerName,
        status: 'success'
      },
      urls: {
        dashboard: `https://${this.config.domain}`,
        health: `https://${this.config.domain}/health`,
        api: `https://${this.config.domain}/api/system/status`
      },
      features: [
        'Global CDN distribution',
        'Edge computing',
        'Auto-scaling',
        'Serverless architecture',
        'Real-time monitoring',
        'DNS management',
        'SSL certificate tracking'
      ],
      nextSteps: [
        'Configure DNS records if needed',
        'Set up monitoring and alerts',
        'Test all functionality',
        'Update team with access credentials'
      ]
    };

    // Save deployment report
    const reportPath = join(process.cwd(), `admin-dashboard-deployment-${this.config.environment}-${Date.now()}.json`);
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📊 Deployment report saved to: ${reportPath}`);

    console.log('');
    console.log('🎉 ADMIN DASHBOARD IS LIVE!');
    console.log('='.repeat(40));
    console.log(`🌐 Dashboard: https://${this.config.domain}`);
    console.log(`🔍 Health Check: https://${this.config.domain}/health`);
    console.log(`📊 API Status: https://${this.config.domain}/api/system/status`);
    console.log('');
    console.log('🚀 Features Available:');
    console.log('  ✅ Global CDN (275+ edge locations)');
    console.log('  ✅ Real-time domain monitoring');
    console.log('  ✅ DNS record management');
    console.log('  ✅ SSL certificate tracking');
    console.log('  ✅ Performance analytics');
    console.log('  ✅ System logs and monitoring');
    console.log('  ✅ Administrative controls');
    console.log('');
  }

  async rollback(): Promise<void> {
    console.log('🔄 ROLLING BACK DEPLOYMENT...');

    try {
      // Get previous deployment info
      const rollbackCommand = `wrangler rollback --config src/registry/admin-wrangler.toml --env ${this.config.environment}`;
      execSync(rollbackCommand, { stdio: 'inherit' });
      
      console.log('✅ Rollback completed successfully');
    } catch (error) {
      console.error('❌ Rollback failed');
      throw error;
    }
  }

  async getLogs(): Promise<void> {
    console.log('📋 FETCHING WORKER LOGS...');

    try {
      const logsCommand = `wrangler tail --config src/registry/admin-wrangler.toml --env ${this.config.environment}`;
      execSync(logsCommand, { stdio: 'inherit' });
    } catch (error) {
      console.error('❌ Failed to fetch logs');
      throw error;
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const environment = args[1] || 'production';

  if (!['development', 'staging', 'production'].includes(environment)) {
    console.error('❌ Invalid environment. Must be one of: development, staging, production');
    process.exit(1);
  }

  const deployer = new AdminDashboardDeployer(environment);

  try {
    switch (command) {
      case 'deploy':
        await deployer.deploy();
        break;
      case 'rollback':
        await deployer.rollback();
        break;
      case 'logs':
        await deployer.getLogs();
        break;
      case 'status':
        console.log(`📊 Admin Dashboard Status (${environment}):`);
        console.log(`🌐 Domain: ${deployer.config.domain}`);
        console.log(`🏭 Worker: ${deployer.config.workerName}`);
        console.log(`🔗 URL: https://${deployer.config.domain}`);
        break;
      default:
        console.log('🚀 Admin Dashboard Deployment Script');
        console.log('='.repeat(40));
        console.log('');
        console.log('Usage:');
        console.log('  bun run deploy-admin-dashboard.ts deploy [environment]');
        console.log('  bun run deploy-admin-dashboard.ts rollback [environment]');
        console.log('  bun run deploy-admin-dashboard.ts logs [environment]');
        console.log('  bun run deploy-admin-dashboard.ts status [environment]');
        console.log('');
        console.log('Environments:');
        console.log('  development - admin-dev.factory-wager.com');
        console.log('  staging     - admin-staging.factory-wager.com');
        console.log('  production  - admin.factory-wager.com');
        console.log('');
        break;
    }
  } catch (error) {
    console.error('❌ Command failed:', error);
    process.exit(1);
  }
}

// Run if this is the main module
if (import.meta.main) {
  main();
}

export { AdminDashboardDeployer };
