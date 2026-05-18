#!/usr/bin/env tsx
/**
 * Domain Workers Deployment Automation
 * Crystal Clear Architecture Integration
 *
 * Automatically generates, configures, and deploys domain-specific
 * Cloudflare Workers for the Crystal Clear Architecture
 */

import { DomainWorkerFactory } from './domain-worker-factory';
import { writeFile, mkdir } from 'fs/promises';
import { execSync } from 'child_process';

interface DeploymentConfig {
  accountId: string;
  zoneId: string;
  domain: string;
  environment: 'development' | 'staging' | 'production';
  createDatabases: boolean;
  createKVNamespaces: boolean;
}

export class DomainDeploymentManager {
  private factory: DomainWorkerFactory;
  private config: DeploymentConfig;

  constructor(config: DeploymentConfig) {
    this.factory = DomainWorkerFactory.getInstance();
    this.config = config;
  }

  /**
   * Execute full domain workers deployment
   */
  async deployAllDomains(): Promise<void> {
    console.info('🚀 Starting Crystal Clear Architecture Domain Workers Deployment...\n');

    try {
      // Step 1: Generate worker configurations
      console.info('📝 Generating domain worker configurations...');
      await this.generateWorkerConfigurations();

      // Step 2: Create Cloudflare resources
      console.info('☁️  Creating Cloudflare resources...');
      await this.createCloudflareResources();

      // Step 3: Generate deployment configuration
      console.info('⚙️  Generating deployment configuration...');
      await this.generateDeploymentConfig();

      // Step 4: Deploy domain workers
      console.info('📦 Deploying domain workers...');
      await this.deployWorkers();

      // Step 5: Configure routing
      console.info('🔀 Configuring domain routing...');
      await this.configureRouting();

      // Step 6: Verify deployment
      console.info('✅ Verifying deployment...');
      await this.verifyDeployment();

      console.info('\n🎉 Crystal Clear Architecture domain workers deployed successfully!');
      this.printDeploymentSummary();
    } catch (error) {
      console.error('❌ Deployment failed:', error);
      throw error;
    }
  }

  private async generateWorkerConfigurations(): Promise<void> {
    const deployments = this.factory.getAllDeploymentConfigs();

    // Create output directory
    await mkdir('dist/domain-workers', { recursive: true });

    for (const deployment of deployments) {
      const filePath = `dist/domain-workers/${deployment.name}.ts`;
      await writeFile(filePath, deployment.script);
      console.info(`  ✅ Generated ${deployment.name}.ts`);
    }

    // Generate domain router
    const routerScript = this.factory.generateDomainRouter();
    await writeFile('dist/domain-workers/domain-router.ts', routerScript);
    console.info('  ✅ Generated domain-router.ts');
  }

  private async createCloudflareResources(): Promise<void> {
    if (!this.config.createDatabases && !this.config.createKVNamespaces) {
      console.info('  ⏭️  Skipping resource creation (disabled in config)');
      return;
    }

    // Create D1 databases
    if (this.config.createDatabases) {
      const databases = [
        'collections-db',
        'distributions-db',
        'freeplay-db',
        'balance-db',
        'adjustment-db',
      ];

      for (const db of databases) {
        try {
          execSync(`wrangler d1 create ${db}`, { stdio: 'pipe' });
          console.info(`  ✅ Created D1 database: ${db}`);
        } catch (error) {
          console.info(`  ⚠️  D1 database ${db} may already exist`);
        }
      }
    }

    // Create KV namespaces
    if (this.config.createKVNamespaces) {
      const namespaces = [
        'COLLECTIONS_CACHE',
        'DISTRIBUTIONS_CACHE',
        'FREEPLAY_CACHE',
        'BALANCE_CACHE',
        'ADJUSTMENT_CACHE',
      ];

      for (const ns of namespaces) {
        try {
          execSync(`wrangler kv:namespace create ${ns}`, { stdio: 'pipe' });
          console.info(`  ✅ Created KV namespace: ${ns}`);
        } catch (error) {
          console.info(`  ⚠️  KV namespace ${ns} may already exist`);
        }
      }
    }
  }

  private async generateDeploymentConfig(): Promise<void> {
    const wranglerConfig = this.factory.generateWranglerConfig();

    // Add environment-specific configuration
    let envConfig = '';

    if (this.config.environment === 'production') {
      envConfig = `
# Production Environment Configuration
[env.production]
name = "crystal-clear-prod"
routes = [
  { pattern = "api.crystalclear.workers.dev/api/domains/*", zone_id = "${this.config.zoneId}" }
]

[env.production.vars]
ENVIRONMENT = "production"
LOG_LEVEL = "warn"
`;
    } else if (this.config.environment === 'staging') {
      envConfig = `
# Staging Environment Configuration
[env.staging]
name = "crystal-clear-staging"
routes = [
  { pattern = "staging-api.crystalclear.workers.dev/api/domains/*", zone_id = "${this.config.zoneId}" }
]

[env.staging.vars]
ENVIRONMENT = "staging"
LOG_LEVEL = "info"
`;
    }

    const fullConfig = wranglerConfig + envConfig;
    await writeFile('dist/domain-workers/wrangler.toml', fullConfig);
    console.info('  ✅ Generated wrangler.toml');
  }

  private async deployWorkers(): Promise<void> {
    const deployments = this.factory.getAllDeploymentConfigs();

    for (const deployment of deployments) {
      try {
        console.info(`  📦 Deploying ${deployment.name}...`);

        // Deploy worker
        execSync(
          `cd dist/domain-workers && wrangler deploy ${deployment.name}.ts --name ${deployment.name}`,
          {
            stdio: 'inherit',
          }
        );

        // Configure routes
        for (const route of deployment.routes) {
          execSync(`wrangler route add "${route}" ${deployment.name}`, { stdio: 'pipe' });
        }

        console.info(`  ✅ ${deployment.name} deployed successfully`);
      } catch (error) {
        console.error(`  ❌ Failed to deploy ${deployment.name}:`, error);
        throw error;
      }
    }

    // Deploy domain router
    try {
      console.info('  🔄 Deploying domain router...');
      execSync(
        `cd dist/domain-workers && wrangler deploy domain-router.ts --name crystal-clear-domains`,
        {
          stdio: 'inherit',
        }
      );
      console.info('  ✅ Domain router deployed successfully');
    } catch (error) {
      console.error('  ❌ Failed to deploy domain router:', error);
      throw error;
    }
  }

  private async configureRouting(): Promise<void> {
    const routingConfig = {
      domains: this.factory.getAllDeploymentConfigs().map(d => ({
        name: d.name,
        routes: d.routes,
        environment: d.environment,
      })),
    };

    await writeFile(
      'dist/domain-workers/routing-config.json',
      JSON.stringify(routingConfig, null, 2)
    );
    console.info('  ✅ Generated routing configuration');
  }

  private async verifyDeployment(): Promise<void> {
    const deployments = this.factory.getAllDeploymentConfigs();
    const verificationResults: any[] = [];

    for (const deployment of deployments) {
      try {
        // Test health endpoint
        const response = await fetch(`https://${deployment.name}.${this.config.domain}/health`);
        const health = await response.json();

        verificationResults.push({
          domain: deployment.name,
          status: response.ok ? 'healthy' : 'unhealthy',
          health: health,
        });

        console.info(`  ✅ ${deployment.name}: ${response.ok ? 'healthy' : 'unhealthy'}`);
      } catch (error) {
        verificationResults.push({
          domain: deployment.name,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        console.info(
          `  ❌ ${deployment.name}: error - ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    await writeFile(
      'dist/domain-workers/verification-results.json',
      JSON.stringify(verificationResults, null, 2)
    );
  }

  private printDeploymentSummary(): void {
    const deployments = this.factory.getAllDeploymentConfigs();

    console.info('\n📋 Deployment Summary:');
    console.info('='.repeat(50));

    deployments.forEach(deployment => {
      console.info(`✅ ${deployment.name}`);
      console.info(`   Routes: ${deployment.routes.join(', ')}`);
      console.info(`   Environment: ${Object.keys(deployment.environment).length} variables`);
      console.info('');
    });

    console.info('🔗 Domain Router: crystal-clear-domains');
    console.info(`🌐 Base URL: https://crystal-clear-domains.${this.config.domain}`);
    console.info('📊 Health Check: /health');
    console.info('📈 Metrics: /metrics');

    console.info('\n🔧 Next Steps:');
    console.info('1. Configure monitoring and alerting');
    console.info('2. Set up CI/CD pipelines');
    console.info('3. Test domain-specific functionality');
    console.info('4. Configure load balancing if needed');
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.info('Usage: deploy-domains.ts <environment> [options]');
    console.info('');
    console.info('Environments:');
    console.info('  development  - Local development deployment');
    console.info('  staging     - Staging environment deployment');
    console.info('  production  - Production environment deployment');
    console.info('');
    console.info('Options:');
    console.info('  --account-id <id>     - Cloudflare account ID');
    console.info('  --zone-id <id>        - Cloudflare zone ID');
    console.info('  --domain <domain>     - Domain for deployment');
    console.info('  --create-db           - Create D1 databases');
    console.info('  --create-kv           - Create KV namespaces');
    process.exit(1);
  }

  const environment = args[0] as 'development' | 'staging' | 'production';

  // Parse additional arguments
  const accountId = args.includes('--account-id')
    ? args[args.indexOf('--account-id') + 1]
    : process.env.CF_ACCOUNT_ID;

  const zoneId = args.includes('--zone-id')
    ? args[args.indexOf('--zone-id') + 1]
    : process.env.CF_ZONE_ID;

  const domain = args.includes('--domain') ? args[args.indexOf('--domain') + 1] : 'workers.dev';

  const createDatabases = args.includes('--create-db');
  const createKVNamespaces = args.includes('--create-kv');

  if (!accountId || !zoneId) {
    console.error('❌ Missing required Cloudflare credentials');
    console.error(
      'Set CF_ACCOUNT_ID and CF_ZONE_ID environment variables or use --account-id and --zone-id flags'
    );
    process.exit(1);
  }

  const config: DeploymentConfig = {
    accountId,
    zoneId,
    domain,
    environment,
    createDatabases,
    createKVNamespaces,
  };

  const deploymentManager = new DomainDeploymentManager(config);

  try {
    await deploymentManager.deployAllDomains();
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
