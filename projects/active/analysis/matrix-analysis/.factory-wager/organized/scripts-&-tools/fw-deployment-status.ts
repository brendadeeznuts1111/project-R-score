#!/usr/bin/env bun
/**
 * FactoryWager Deployment Status Report v1.3.8
 * Complete infrastructure setup status and next steps
 */

class DeploymentStatusReport {
  private registryDomain = 'registry.factory-wager.co';
  private accountId = '7a470541a704caaf91e71efccc78fd36';
  private zoneId = 'a3b7ba4bb62cb1b177b04b8675250674';
  private apiToken = 'V1i357VeyPrHbrUEX0hQWNPQwbWMHqi9Tj06ApLC';

  async generateReport(): Promise<void> {
    console.info("📊 FactoryWager Deployment Status Report");
    console.info("=======================================");
    console.info(`Generated: ${new Date().toISOString()}`);
    console.info(`Account ID: ${this.accountId}`);
    console.info(`Zone ID: ${this.zoneId}`);

    // Check each component
    await this.checkDNSStatus();
    await this.checkAPIPermissions();
    await this.checkWorkerStatus();
    await this.checkR2Status();
    await this.generateNextSteps();
  }

  private async checkDNSStatus(): Promise<void> {
    console.info("\n🌐 DNS Configuration Status:");

    try {
      const dnsRecord = await Bun.$`curl -s -X GET "https://api.cloudflare.com/client/v4/zones/${this.zoneId}/dns_records/90c9452d7f472babec42fdc627c2ee06" -H "Authorization: Bearer ${this.apiToken}" -H "Content-Type: application/json" | bunx jq -r '.result | {name, type, content, proxied}'`.text();

      console.info("✅ DNS Record Configured:");
      console.info(`   ${dnsRecord}`);

      // Test resolution
      console.info("\n🔍 DNS Resolution Test:");
      const resolution = await Bun.$`bunx dig +short ${this.registryDomain} @8.8.8.8`.text().catch(() => '');

      if (resolution.trim()) {
        console.info(`✅ Resolves to: ${resolution.trim()}`);
      } else {
        console.info("⏳ DNS propagation in progress (may take 5-60 minutes)");
      }

    } catch (error) {
      console.info("❌ DNS check failed:", (error as Error).message);
    }
  }

  private async checkAPIPermissions(): Promise<void> {
    console.info("\n🔐 API Token Permissions:");

    const permissions = [
      { service: 'Zone:Read', endpoint: `/zones/${this.zoneId}` },
      { service: 'Zone:Edit', endpoint: `/zones/${this.zoneId}/dns_records` },
      { service: 'Account:Read', endpoint: '/accounts' },
      { service: 'Worker:Script:Edit', endpoint: '/workers/services' },
      { service: 'R2:Bucket:Edit', endpoint: '/r2/buckets' }
    ];

    for (const perm of permissions) {
      try {
        const result = await Bun.$`curl -s -X GET "https://api.cloudflare.com/client/v4${perm.endpoint}" -H "Authorization: Bearer ${this.apiToken}" -H "Content-Type: application/json" | bunx jq -r '.success'`.text();

        if (result.trim() === 'true') {
          console.info(`✅ ${perm.service}`);
        } else {
          console.info(`❌ ${perm.service} - Permission missing`);
        }
      } catch {
        console.info(`❌ ${perm.service} - Access denied`);
      }
    }
  }

  private async checkWorkerStatus(): Promise<void> {
    console.info("\n🏗️ Worker Status:");

    try {
      const workers = await Bun.$`curl -s -X GET "https://api.cloudflare.com/client/v4/accounts/${this.accountId}/workers/services" -H "Authorization: Bearer ${this.apiToken}" -H "Content-Type: application/json" | bunx jq '.result[] | {name, script_created_at}'`.text();

      if (workers.trim()) {
        console.info("✅ Workers found:");
        console.info(`   ${workers}`);
      } else {
        console.info("⏳ No workers deployed yet");
      }
    } catch {
      console.info("❌ Cannot access Workers API - permission needed");
    }
  }

  private async checkR2Status(): Promise<void> {
    console.info("\n📦 R2 Storage Status:");

    try {
      const buckets = await Bun.$`curl -s -X GET "https://api.cloudflare.com/client/v4/accounts/${this.accountId}/r2/buckets" -H "Authorization: Bearer ${this.apiToken}" -H "Content-Type: application/json" | bunx jq '.result[] | .name'.text();

      if (buckets.trim()) {
        console.info("✅ R2 Buckets found:");
        console.info("   " + buckets.trim());
      } else {
        console.info("⏳ No R2 buckets created yet");
      }
    } catch {
      console.info("❌ Cannot access R2 API - permission needed");
    }
  }

  private async generateNextSteps(): Promise<void> {
    console.info("\n🚀 Next Steps:");

    console.info("\n1. 📋 Update API Token Permissions:");
    console.info("   Visit: https://dash.cloudflare.com/profile/api-tokens");
    console.info("   Add permissions:");
    console.info("   - Zone:Zone:Read");
    console.info("   - Zone:Zone:Edit");
    console.info("   - Zone:DNS:Edit");
    console.info("   - Account:Account:Read");
    console.info("   - User:User Details::Read");
    console.info("   - Worker:Script:Edit");
    console.info("   - Worker:Script:Read");
    console.info("   - R2:Bucket:Edit");
    console.info("   - R2:Bucket:Read");

    console.info("\n2. 🏗️ Deploy Worker:");
    console.info("   CLOUDFLARE_API_TOKEN=V1i357VeyPrHbrUEX0hQWNPQwbWMHqi9Tj06ApLC bunx wrangler deploy");

    console.info("\n3. 📦 Create R2 Buckets:");
    console.info("   CLOUDFLARE_API_TOKEN=V1i357VeyPrHbrUEX0hQWNPQwbWMHqi9Tj06ApLC bunx wrangler r2 bucket create factory-wager-registry");
    console.info("   CLOUDFLARE_API_TOKEN=V1i357VeyPrHbrUEX0hQWNPQwbWMHqi9Tj06ApLC bunx wrangler r2 bucket create factory-wager-artifacts");

    console.info("\n4. 🌐 Update DNS to Worker:");
    console.info("   After deployment, get worker URL and update CNAME");

    console.info("\n5. ✅ Validate Deployment:");
    console.info("   curl -I https://registry.factory-wager.co/health");
    console.info("   bun run fw-bunx-dns-setup.ts --validate");

    console.info("\n📜 Automation Scripts Ready:");
    console.info("   .factory-wager/quick-deploy.sh");
    console.info("   .factory-wager/monitor.sh");

    await this.createTokenUpdateScript();
  }

  private async createTokenUpdateScript(): Promise<void> {
    const script = '#!/bin/bash\n' +
      '# FactoryWager Token Update Script\n' +
      '# Use this after updating API token permissions\n\n' +
      'echo "🔧 Updating FactoryWager with new permissions..."\n\n' +
      '# Set the updated token\n' +
      'export CLOUDFLARE_API_TOKEN="V1i357VeyPrHbrUEX0hQWNPQwbWMHqi9Tj06ApLC"\n\n' +
      '# Test permissions\n' +
      'echo "🔍 Testing API permissions..."\n' +
      'curl -s -X GET "https://api.cloudflare.com/client/v4/accounts/7a470541a704caaf91e71efccc78fd36/workers/services" \\\n' +
      '  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \\\n' +
      '  -H "Content-Type: application/json" | jq -r ".success"\n\n' +
      '# Deploy worker\n' +
      'echo "🏗️ Deploying worker..."\n' +
      'bunx wrangler deploy\n\n' +
      '# Create R2 buckets\n' +
      'echo "📦 Creating R2 buckets..."\n' +
      'bunx wrangler r2 bucket create factory-wager-registry\n' +
      'bunx wrangler r2 bucket create factory-wager-artifacts\n\n' +
      '# Set secrets\n' +
      'echo "🔐 Setting secrets..."\n' +
      'echo "V1i357VeyPrHbrUEX0hQWNPQwbWMHqi9Tj06ApLC" | bunx wrangler secret put CLOUDFLARE_API_TOKEN\n\n' +
      'echo "✅ Setup complete!"\n' +
      'echo "🔍 Test with: curl -I https://registry.factory-wager.co/health"\n';

    await Bun.write(Bun.file('./.factory-wager/update-token-permissions.sh'), script);
    await Bun.$`chmod +x .factory-wager/update-token-permissions.sh`.quiet();

    console.info("💾 Created: .factory-wager/update-token-permissions.sh");
  }
}

// CLI interface
async function main() {
  const report = new DeploymentStatusReport();
  await report.generateReport();
}

if (import.meta.main) {
  main();
}
