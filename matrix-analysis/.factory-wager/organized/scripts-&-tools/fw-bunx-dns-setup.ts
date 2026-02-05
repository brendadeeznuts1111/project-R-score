#!/usr/bin/env bun
/**
 * FactoryWager DNS Setup with bunx v1.3.8
 * Complete DNS configuration using bunx tools
 */

import { execSync } from 'child_process';

class BunxDNSSetup {
  private registryDomain = 'registry.factory-wager.co';
  private mainDomain = 'factory-wager.com';

  async setupWithBunx(): Promise<void> {
    console.log("🌐 FactoryWager DNS Setup with bunx");
    console.log("===================================");

    // Check available tools
    await this.checkBunxTools();
    
    // Current DNS status
    await this.checkDNSStatus();
    
    // Generate setup commands
    await this.generateSetupCommands();
    
    // Create validation script
    await this.createValidationScript();
  }

  private async checkBunxTools(): Promise<void> {
    console.log("\n🔧 Checking bunx tools...");
    
    try {
      const jqVersion = execSync('bunx jq --version', { encoding: 'utf8' });
      console.log(`✅ jq: ${jqVersion.trim()}`);
    } catch {
      console.log("❌ jq not available via bunx");
    }
    
    try {
      const curlVersion = execSync('bunx curl --version | head -1', { encoding: 'utf8' });
      console.log(`✅ curl: ${curlVersion.trim()}`);
    } catch {
      console.log("❌ curl not available via bunx");
    }
    
    try {
      const digOutput = execSync('bunx dig +version | head -1', { encoding: 'utf8' });
      console.log(`✅ dig: ${digOutput.trim()}`);
    } catch {
      console.log("❌ dig not available via bunx");
    }
  }

  private async checkDNSStatus(): Promise<void> {
    console.log(`\n📋 Current DNS status for ${this.registryDomain}:`);
    
    // Check with multiple DNS servers
    const dnsServers = [
      { name: 'System', cmd: 'bunx dig +short' },
      { name: 'Google', cmd: 'bunx dig +short @8.8.8.8' },
      { name: 'Cloudflare', cmd: 'bunx dig +short @1.1.1.1' }
    ];
    
    for (const server of dnsServers) {
      try {
        const result = execSync(`${server.cmd} ${this.registryDomain}`, { 
          encoding: 'utf8', 
          timeout: 5000 
        }).trim();
        
        if (result) {
          console.log(`✅ ${server.name} DNS: ${result}`);
        } else {
          console.log(`❌ ${server.name} DNS: Not resolved`);
        }
      } catch (error) {
        console.log(`❌ ${server.name} DNS: Failed`);
      }
    }
    
    // Check HTTP connectivity
    console.log("\n🌐 HTTP connectivity test:");
    try {
      const result = execSync(`bunx curl -I --connect-timeout 5 https://${this.registryDomain}/health 2>&1 | head -1`, { 
        encoding: 'utf8',
        timeout: 10000
      }).trim();
      console.log(`✅ HTTP: ${result}`);
    } catch (error) {
      console.log(`❌ HTTP: Connection failed`);
    }
  }

  private async generateSetupCommands(): Promise<void> {
    console.log("\n🔧 DNS Setup Commands using bunx:");
    
    console.log("\n1. SET CLOUDFLARE API TOKEN:");
    console.log("   export CLOUDFLARE_API_TOKEN='your_api_token_here'");
    
    console.log("\n2. GET ZONE ID:");
    console.log(`   bunx curl -s -X GET "https://api.cloudflare.com/client/v4/zones?name=${this.mainDomain}" \\`);
    console.log("     -H \"Authorization: Bearer $CLOUDFLARE_API_TOKEN\" \\");
    console.log("     -H \"Content-Type: application/json\" \\");
    console.log("     | bunx jq -r '.result[0].id'");
    
    console.log("\n3. CREATE REGISTRY DNS RECORD:");
    console.log("   # Replace ZONE_ID with actual ID from step 2");
    console.log("   # Replace REGISTRY_IP with your load balancer IP");
    console.log("   bunx curl -s -X POST \"https://api.cloudflare.com/client/v4/zones/ZONE_ID/dns_records\" \\");
    console.log("     -H \"Authorization: Bearer $CLOUDFLARE_API_TOKEN\" \\");
    console.log("     -H \"Content-Type: application/json\" \\");
    console.log("     --data '{");
    console.log("       \"type\": \"A\",");
    console.log("       \"name\": \"registry\",");
    console.log("       \"content\": \"REGISTRY_IP\",");
    console.log("       \"ttl\": 3600,");
    console.log("       \"proxied\": true");
    console.log("     }' | bunx jq -r '.success'");
    
    console.log("\n4. VALIDATE DNS PROPAGATION:");
    console.log(`   bunx dig +short ${this.registryDomain}`);
    console.log(`   bunx curl -I https://${this.registryDomain}/health`);
  }

  private async createValidationScript(): Promise<void> {
    console.log("\n📜 Creating validation script...");
    
    const validationScript = `#!/bin/bash
# FactoryWager DNS Validation Script using bunx
# Usage: ./validate-dns.sh

REGISTRY_DOMAIN="registry.factory-wager.co"
MAIN_DOMAIN="factory-wager.com"

echo "🔍 FactoryWager DNS Validation"
echo "============================="

echo ""
echo "📋 DNS Resolution Tests:"
echo "System DNS:"
bunx dig +short $REGISTRY_DOMAIN || echo "❌ Not resolved"

echo "Google DNS:"
bunx dig +short $REGISTRY_DOMAIN @8.8.8.8 || echo "❌ Not resolved"

echo "Cloudflare DNS:"
bunx dig +short $REGISTRY_DOMAIN @1.1.1.1 || echo "❌ Not resolved"

echo ""
echo "🌐 HTTP Connectivity Tests:"
echo "HTTPS Test:"
bunx curl -I --connect-timeout 5 https://$REGISTRY_DOMAIN/health 2>&1 | head -1 || echo "❌ Connection failed"

echo "TLS Certificate Test:"
echo | bunx openssl s_client -connect $REGISTRY_DOMAIN:443 -servername $REGISTRY_DOMAIN 2>/dev/null | bunx openssl x509 -noout -dates -subject 2>/dev/null || echo "❌ TLS handshake failed"

echo ""
echo "📊 Cloudflare Edge Detection:"
bunx curl -I --connect-timeout 5 https://$REGISTRY_DOMAIN/health 2>&1 | grep -E "(cf-ray|x-cache|age)" || echo "❌ No edge headers found"

echo ""
echo "⏡ Regional Health Tests:"
REGIONS=("us-east-1" "eu-west-1" "ap-southeast-1")
for region in "\${REGIONS[@]}"; do
  echo "Testing $region:"
  bunx curl -I --connect-timeout 3 "https://$REGISTRY_DOMAIN/health?region=$region" 2>&1 | head -1 || echo "❌ $region failed"
done

echo ""
echo "✅ Validation complete!"
`;

    await Bun.write(Bun.file('./.factory-wager/validate-dns.sh'), validationScript);
    execSync('chmod +x .factory-wager/validate-dns.sh');
    
    console.log("💾 Validation script created: .factory-wager/validate-dns.sh");
    console.log("   Run after DNS setup: ./validate-dns.sh");
  }

  async runValidation(): Promise<void> {
    console.log("🔍 Running DNS validation...");
    
    try {
      execSync('./.factory-wager/validate-dns.sh', { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
    } catch (error) {
      console.log("❌ Validation failed - DNS not properly configured yet");
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const validate = args.includes('--validate');
  
  const dnsSetup = new BunxDNSSetup();
  
  if (validate) {
    await dnsSetup.runValidation();
  } else {
    await dnsSetup.setupWithBunx();
    
    console.log("\n🚀 Next Steps:");
    console.log("1. Set your Cloudflare API token: export CLOUDFLARE_API_TOKEN='your_token'");
    console.log("2. Run the setup commands shown above");
    console.log("3. Validate with: bun run fw-bunx-dns-setup.ts --validate");
  }
}

if (import.meta.main) {
  main();
}
