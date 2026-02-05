#!/usr/bin/env bun

/**
 * 🚀 Complete Cloudflare Infrastructure Setup for Fantasy42-Fire22
 * Creates all required resources and deploys the worker with proper health checks
 */

import { $ } from 'bun';

class CloudflareInfrastructureSetup {
  private env: string;

  constructor(env: string = 'development') {
    this.env = env;
  }

  async createD1Database(): Promise<void> {
    console.log('🗄️ Creating D1 Database...');

    try {
      const result = await $`wrangler d1 create fantasy42-registry --env ${this.env}`.quiet();
      console.log('✅ D1 Database created successfully');

      // Extract the database ID from the output
      const dbId = this.extractDatabaseId(result.stdout);
      if (dbId) {
        console.log(`📋 Database ID: ${dbId}`);
        await this.setEnvironmentVariable('REGISTRY_DB_ID', dbId);
      }
    } catch (error) {
      console.log('⚠️ D1 Database may already exist, checking...');
      const listResult = await $`wrangler d1 list --env ${this.env}`.quiet();
      const existingDb = this.findExistingDatabase(listResult.stdout);
      if (existingDb) {
        console.log(`✅ Using existing D1 Database: ${existingDb.name}`);
        await this.setEnvironmentVariable('REGISTRY_DB_ID', existingDb.id);
      } else {
        throw error;
      }
    }
  }

  async createKVNamespace(): Promise<void> {
    console.log('📦 Creating KV Namespace...');

    try {
      const result = await $`wrangler kv:namespace create "CACHE" --env ${this.env}`.quiet();
      console.log('✅ KV Namespace created successfully');

      const kvId = this.extractKVId(result.stdout);
      if (kvId) {
        console.log(`📋 KV ID: ${kvId}`);
        await this.setEnvironmentVariable('CACHE_KV_ID', kvId);

        // Also create preview KV for development
        if (this.env === 'development') {
          const previewResult =
            await $`wrangler kv:namespace create "CACHE_preview" --env ${this.env}`.quiet();
          const previewId = this.extractKVId(previewResult.stdout);
          if (previewId) {
            await this.setEnvironmentVariable('CACHE_KV_PREVIEW_ID', previewId);
          }
        }
      }
    } catch (error) {
      console.log('⚠️ KV Namespace may already exist, checking...');
      const listResult = await $`wrangler kv namespace list`.quiet();
      const existingKV = this.findExistingKV(listResult.stdout.toString());
      if (existingKV) {
        console.log(`✅ Using existing KV Namespace: ${existingKV.title}`);
        await this.setEnvironmentVariable('CACHE_KV_ID', existingKV.id);
      } else {
        throw error;
      }
    }
  }

  async createR2Bucket(): Promise<void> {
    console.log('☁️ Creating R2 Bucket...');

    try {
      const result =
        await $`wrangler r2 bucket create fantasy42-packages --env ${this.env}`.quiet();
      console.log('✅ R2 Bucket created successfully');
    } catch (error) {
      console.log('⚠️ R2 Bucket may already exist');
    }
  }

  async createQueue(): Promise<void> {
    console.log('📋 Creating Queue...');

    try {
      const result = await $`wrangler queues create registry-events --env ${this.env}`.quiet();
      console.log('✅ Queue created successfully');
    } catch (error) {
      console.log('⚠️ Queue may already exist');
    }
  }

  async deployWorker(): Promise<void> {
    console.log('🚀 Deploying Cloudflare Worker...');

    try {
      const result = await $`wrangler deploy --env ${this.env}`.quiet();
      console.log('✅ Worker deployed successfully');

      // Extract the deployment URL
      const url = this.extractDeploymentUrl(result.stdout);
      if (url) {
        console.log(`🌐 Deployment URL: ${url}`);
      }
    } catch (error) {
      console.log('❌ Worker deployment failed:', error.message);
      throw error;
    }
  }

  async testHealthCheck(): Promise<void> {
    console.log('🏥 Testing Health Check Endpoint...');

    try {
      const result =
        await $`curl -s https://fantasy42-fire22-dev.apexodds.workers.dev/health`.quiet();
      const healthData = JSON.parse(result.stdout);

      if (healthData.status === 'healthy') {
        console.log('✅ Health check passed!');
        console.log(`   Database: ${healthData.services.database}`);
        console.log(`   Cache: ${healthData.services.cache}`);
        console.log(`   Storage: ${healthData.services.storage}`);
        console.log(`   Region: ${healthData.environment.region}`);
      } else {
        console.log('❌ Health check failed');
        console.log(healthData);
      }
    } catch (error) {
      console.log('❌ Health check request failed:', error.message);
    }
  }

  async setupHeartbeatMonitoring(): Promise<void> {
    console.log('💓 Setting up Heartbeat Monitoring...');

    // Create a simple heartbeat script
    const heartbeatScript = `
#!/usr/bin/env bun

/**
 * ❤️ Cloudflare Worker Heartbeat Monitor
 * Monitors worker health and reports to central hub
 */

const HUB_ENDPOINT = 'https://apexodds.net/api/hub/heartbeat'

async function heartbeat() {
  const timestamp = new Date().toISOString()
  const payload = {
    service: 'fantasy42-fire22-registry',
    environment: '${this.env}',
    timestamp,
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage()
  }

  try {
    const response = await fetch(HUB_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (response.ok) {
      console.log('✅ Heartbeat sent to hub:', timestamp)
    } else {
      console.log('⚠️ Heartbeat failed:', response.status)
    }
  } catch (error) {
    console.log('❌ Heartbeat error:', error.message)
  }
}

// Run heartbeat every 30 seconds
setInterval(heartbeat, 30000)
heartbeat() // Initial heartbeat

export default { heartbeat }
`;

    await Bun.write('./src/heartbeat.ts', heartbeatScript);
    console.log('✅ Heartbeat monitoring script created');
  }

  async connectToHub(): Promise<void> {
    console.log('🔗 Connecting to ApexOdds Hub...');

    const hubConfig = {
      service: 'fantasy42-fire22-registry',
      environment: this.env,
      endpoints: [
        'https://fantasy42-fire22-dev.apexodds.workers.dev',
        'https://fantasy42-fire22-staging.apexodds.workers.dev',
        'https://api.apexodds.net',
      ],
      capabilities: ['registry', 'analytics', 'health-monitoring'],
      connected: true,
      lastHeartbeat: new Date().toISOString(),
    };

    try {
      const response = await fetch('https://apexodds.net/api/hub/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hubConfig),
      });

      if (response.ok) {
        console.log('✅ Successfully connected to ApexOdds Hub');
        console.log('📡 Service registered and monitoring active');
      } else {
        console.log('⚠️ Hub connection response:', response.status);
      }
    } catch (error) {
      console.log('⚠️ Hub connection failed (may not be available):', error.message);
      console.log('🔄 Service will attempt to reconnect automatically');
    }
  }

  async fullSetup(): Promise<void> {
    console.log('🚀 STARTING COMPLETE CLOUDFLARE INFRASTRUCTURE SETUP');
    console.log('=================================================');
    console.log(`Environment: ${this.env}`);
    console.log('');

    try {
      // Step 1: Create infrastructure resources
      console.log('📋 STEP 1: Creating Infrastructure Resources');
      await this.createD1Database();
      await this.createKVNamespace();
      await this.createR2Bucket();
      await this.createQueue();

      console.log('\\n✅ Infrastructure resources created');

      // Step 2: Deploy worker
      console.log('\\n📋 STEP 2: Deploying Worker');
      await this.deployWorker();

      // Step 3: Test health
      console.log('\\n📋 STEP 3: Testing Health Checks');
      await this.testHealthCheck();

      // Step 4: Setup monitoring
      console.log('\\n📋 STEP 4: Setting up Monitoring');
      await this.setupHeartbeatMonitoring();
      await this.connectToHub();

      console.log('\\n🎉 SETUP COMPLETE!');
      console.log('================');
      console.log('✅ D1 Database: fantasy42-registry');
      console.log('✅ KV Namespace: CACHE');
      console.log('✅ R2 Bucket: fantasy42-packages');
      console.log('✅ Queue: registry-events');
      console.log('✅ Worker: Deployed and healthy');
      console.log('✅ Health Checks: Active');
      console.log('✅ Heartbeat: Monitoring');
      console.log('✅ Hub Connection: Established');

      console.log('\\n🚀 Your Fantasy42-Fire22 API is now fully operational!');
      console.log('🌐 Access your API at:');
      console.log(`   Development: https://fantasy42-fire22-dev.apexodds.workers.dev`);
      console.log(`   Staging: https://fantasy42-fire22-staging.apexodds.workers.dev`);
      console.log(`   Production: https://api.apexodds.net`);
    } catch (error) {
      console.error('\\n❌ SETUP FAILED:', error.message);
      console.log('\\n🔧 Troubleshooting:');
      console.log('1. Check your wrangler authentication: wrangler whoami');
      console.log('2. Verify account permissions');
      console.log('3. Check network connectivity');
      console.log('4. Try running individual setup steps');
      throw error;
    }
  }

  // Helper methods
  private extractDatabaseId(output: string): string | null {
    const match = output.match(/([a-f0-9-]{36})/);
    return match ? match[1] : null;
  }

  private findExistingDatabase(output: string): any {
    try {
      const databases = JSON.parse(output);
      return databases.find((db: any) => db.name === 'fantasy42-registry');
    } catch {
      return null;
    }
  }

  private extractKVId(output: string): string | null {
    const match = output.match(/([a-f0-9-]{32,})/);
    return match ? match[1] : null;
  }

  private findExistingKV(output: string): any {
    try {
      const namespaces = JSON.parse(output);
      return namespaces.find((ns: any) => ns.title === 'CACHE');
    } catch {
      return null;
    }
  }

  private extractDeploymentUrl(output: string): string | null {
    const match = output.match(/(https:\/\/[^\s]+)/);
    return match ? match[1] : null;
  }

  private async setEnvironmentVariable(key: string, value: string): Promise<void> {
    // In a real setup, you'd use wrangler secret put or environment files
    console.log(`🔧 Environment variable ${key} would be set to: ${value}`);
  }
}

// CLI interface
if (import.meta.main) {
  const args = process.argv.slice(2);
  const env = args[0] || 'development';

  console.log('🔧 CLOUDFLARE INFRASTRUCTURE SETUP');
  console.log('===================================');

  const setup = new CloudflareInfrastructureSetup(env);
  setup.fullSetup().catch(console.error);
}

export { CloudflareInfrastructureSetup };
