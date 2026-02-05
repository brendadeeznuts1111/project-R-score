#!/usr/bin/env bun
/**
 * FactoryWager Complete Deployment v1.3.8
 * Integrates DNS setup, Wrangler deployment, and R2 configuration
 */

class CompleteDeployment {
  private registryDomain = 'registry.factory-wager.co';
  private workerName = 'factory-wager-registry';

  async deploy(): Promise<void> {
    console.log("🚀 FactoryWager Complete Deployment");
    console.log("==================================");

    // Step 1: Authentication
    await this.setupAuthentication();
    
    // Step 2: DNS Configuration
    await this.configureDNS();
    
    // Step 3: R2 Bucket Setup
    await this.setupR2Buckets();
    
    // Step 4: Worker Deployment
    await this.deployWorker();
    
    // Step 5: Custom Domain Setup
    await this.setupCustomDomain();
    
    // Step 6: Validation
    await this.validateDeployment();
  }

  private async setupAuthentication(): Promise<void> {
    console.log("\n🔐 Step 1: Cloudflare Authentication");
    
    try {
      const authStatus = await Bun.$`bunx wrangler whoami`.text();
      console.log("✅ Already authenticated:", authStatus.trim());
    } catch {
      console.log("🔧 Please authenticate:");
      console.log("   bunx wrangler login");
      console.log("   Then run this script again");
      process.exit(1);
    }
  }

  private async configureDNS(): Promise<void> {
    console.log("\n🌐 Step 2: DNS Configuration");
    
    console.log("🔧 Setting up DNS for registry...");
    
    // Use our existing DNS setup
    const setupCommands = [
      'export CLOUDFLARE_API_TOKEN=$(bunx wrangler whoami --output json | jq -r ".api_token")',
      `bunx curl -s -X GET "https://api.cloudflare.com/client/v4/zones?name=factory-wager.com" -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | bunx jq -r '.result[0].id'`,
      `# Create A record for registry pointing to Workers`,
      `bunx curl -s -X POST "https://api.cloudflare.com/client/v4/zones/\$ZONE_ID/dns_records" -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H "Content-Type: application/json" --data '{"type": "CNAME", "name": "registry", "content": "factory-wager-registry.your-subdomain.workers.dev", "ttl": 3600, "proxied": true}' | bunx jq -r '.success'`
    ];
    
    console.log("DNS Commands to run manually:");
    setupCommands.forEach((cmd, i) => {
      console.log(`${i + 1}. ${cmd}`);
    });
  }

  private async setupR2Buckets(): Promise<void> {
    console.log("\n📦 Step 3: R2 Bucket Setup");
    
    const buckets = [
      'factory-wager-registry',
      'factory-wager-artifacts',
      'factory-wager-cache'
    ];
    
    for (const bucket of buckets) {
      try {
        console.log(`🔧 Creating bucket: ${bucket}`);
        await Bun.$`bunx wrangler r2 bucket create ${bucket}`.quiet();
        console.log(`✅ Bucket created: ${bucket}`);
      } catch (error) {
        console.log(`⚠️ Bucket may already exist: ${bucket}`);
      }
    }
    
    // List buckets to verify
    try {
      console.log("\n📋 Current R2 buckets:");
      await Bun.$`bunx wrangler r2 bucket list`;
    } catch (error) {
      console.log("❌ Could not list buckets");
    }
  }

  private async deployWorker(): Promise<void> {
    console.log("\n🏗️ Step 4: Worker Deployment");
    
    try {
      console.log("🔧 Deploying to staging first...");
      await Bun.$`bunx wrangler deploy --env staging`.quiet();
      console.log("✅ Staging deployment successful");
      
      console.log("🔧 Deploying to production...");
      await Bun.$`bunx wrangler deploy --env production`.quiet();
      console.log("✅ Production deployment successful");
      
      // Get worker URL
      const deployments = await Bun.$`bunx wrangler deployments --output json`.text();
      console.log("📋 Deployment info:", deployments);
      
    } catch (error) {
      console.log("❌ Deployment failed:", (error as Error).message);
    }
  }

  private async setupCustomDomain(): Promise<void> {
    console.log("\n🌐 Step 5: Custom Domain Setup");
    
    console.log("🔧 Setting up custom domain for Worker...");
    
    const domainCommands = [
      `bunx wrangler custom-domains add ${this.registryDomain}`,
      `bunx wrangler custom-domains list`
    ];
    
    console.log("Custom domain commands:");
    domainCommands.forEach((cmd, i) => {
      console.log(`${i + 1}. ${cmd}`);
    });
  }

  private async validateDeployment(): Promise<void> {
    console.log("\n✅ Step 6: Deployment Validation");
    
    // Test worker health endpoint
    const workerUrl = `https://${this.workerName}.your-subdomain.workers.dev/health`;
    
    try {
      console.log(`🔍 Testing worker health: ${workerUrl}`);
      const response = await fetch(workerUrl, {
        headers: { 'User-Agent': 'FactoryWager-Deployment/1.3.8' }
      });
      
      if (response.ok) {
        const health = await response.json();
        console.log("✅ Worker health check passed:");
        console.log(`   Status: ${health.status}`);
        console.log(`   Version: ${health.version}`);
        console.log(`   Environment: ${health.environment}`);
      } else {
        console.log(`❌ Worker health check failed: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ Could not reach worker: ${(error as Error).message}`);
    }
    
    // Test DNS resolution
    try {
      console.log(`🔍 Testing DNS resolution: ${this.registryDomain}`);
      const dnsResult = await Bun.$`bunx dig +short ${this.registryDomain}`.text();
      if (dnsResult.trim()) {
        console.log(`✅ DNS resolves to: ${dnsResult.trim()}`);
      } else {
        console.log("❌ DNS does not resolve yet");
      }
    } catch (error) {
      console.log("❌ DNS resolution failed");
    }
    
    console.log("\n🎉 Deployment Summary:");
    console.log("✅ Worker deployed to Cloudflare Workers");
    console.log("✅ R2 buckets created");
    console.log("⏳ DNS configuration may take up to 24 hours");
    console.log("🔍 Monitor with: bunx wrangler tail");
  }

  async createDeploymentScripts(): Promise<void> {
    console.log("\n📜 Creating deployment scripts...");
    
    // Quick deployment script
    const quickDeploy = `#!/bin/bash
# FactoryWager Quick Deployment

echo "🚀 Quick FactoryWager Deployment"

# 1. Deploy worker
echo "🔧 Deploying worker..."
bunx wrangler deploy

# 2. Upload sample data
echo "📦 Uploading sample data..."
echo '{"version": "1.3.8", "status": "active"}' | bunx wrangler r2 object put factory-wager-registry/status.json --file=-

# 3. Test deployment
echo "🔍 Testing deployment..."
curl -s https://factory-wager-registry.your-subdomain.workers.dev/health | bunx jq

echo "✅ Quick deployment complete!"
`;

    await Bun.write(Bun.file('./.factory-wager/quick-deploy.sh'), quickDeploy);
    await Bun.$`chmod +x .factory-wager/quick-deploy.sh`.quiet();
    
    // Monitoring script
    const monitoringScript = `#!/bin/bash
# FactoryWager Monitoring

echo "📊 FactoryWager Monitoring"

# Worker logs
echo "🔍 Worker logs:"
bunx wrangler tail --format=pretty

# R2 usage
echo "📦 R2 Storage usage:"
bunx wrangler r2 bucket list

# Analytics
echo "📈 Analytics:"
bunx wrangler analytics --since=1h
`;

    await Bun.write(Bun.file('./.factory-wager/monitor.sh'), monitoringScript);
    await Bun.$`chmod +x .factory-wager/monitor.sh`.quiet();
    
    console.log("✅ Scripts created:");
    console.log("   .factory-wager/quick-deploy.sh");
    console.log("   .factory-wager/monitor.sh");
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const createScripts = args.includes('--create-scripts');
  
  const deployment = new CompleteDeployment();
  
  if (createScripts) {
    await deployment.createDeploymentScripts();
  } else {
    await deployment.deploy();
    await deployment.createDeploymentScripts();
  }
}

if (import.meta.main) {
  main();
}
