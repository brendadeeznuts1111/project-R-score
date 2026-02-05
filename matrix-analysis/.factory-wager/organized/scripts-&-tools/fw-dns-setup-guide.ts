#!/usr/bin/env bun
/**
 * FactoryWager DNS Setup Guide v1.3.8
 * Complete DNS configuration instructions and validation
 */

class DNSSetupGuide {
  private registryDomain = 'registry.factory-wager.co';

  async generateSetupInstructions(): Promise<void> {
    console.log("🌐 FactoryWager DNS Setup Guide");
    console.log("===============================");

    console.log("\n📋 CURRENT STATUS:");
    await this.checkCurrentDNS();

    console.log("\n🔧 STEP-BY-STEP SETUP:");
    console.log("1. DOMAIN REGISTRATION");
    console.log("   - Ensure factory-wager.com is registered");
    console.log("   - Verify domain ownership");
    console.log("   - Configure nameservers to Cloudflare:");
    console.log("     * ns1.cloudflare.com");
    console.log("     * ns2.cloudflare.com");

    console.log("\n2. CLOUDFLARE SETUP");
    console.log("   - Login to Cloudflare dashboard");
    console.log("   - Add site: factory-wager.com");
    console.log("   - Wait for DNS scan (2-5 minutes)");
    console.log("   - Select FREE plan");
    console.log("   - Confirm nameservers");

    console.log("\n3. DNS RECORDS CREATION");
    console.log("   - Go to DNS > Records");
    console.log("   - Add the following records:");

    const records = [
      {
        type: 'A',
        name: 'registry',
        content: '1.2.3.4', // Placeholder - replace with actual IP
        ttl: 'Auto',
        proxy: 'Enabled'
      },
      {
        type: 'CNAME',
        name: 'cdn',
        content: 'factory-wager.com',
        ttl: 'Auto',
        proxy: 'Enabled'
      },
      {
        type: 'A',
        name: '@',
        content: '1.2.3.4', // Placeholder - replace with actual IP
        ttl: 'Auto',
        proxy: 'Enabled'
      }
    ];

    records.forEach(record => {
      console.log(`   - ${record.type} ${record.name} → ${record.content} (Proxy: ${record.proxy})`);
    });

    console.log("\n4. SSL/TLS CONFIGURATION");
    console.log("   - Go to SSL/TLS > Overview");
    console.log("   - Select 'Full (strict)' mode");
    console.log("   - Wait for certificate issuance");

    console.log("\n5. REGISTRY SERVICE CONFIGURATION");
    console.log("   - Deploy registry service to load balancer IP");
    console.log("   - Configure health check endpoint: /health");
    console.log("   - Set up firewall rules for port 443");
    console.log("   - Install SSL certificate on load balancer");

    console.log("\n⏳ PROPAGATION TIME:");
    console.log("   - DNS changes: 5-60 minutes");
    console.log("   - SSL certificate: 5-15 minutes");
    console.log("   - Global propagation: up to 24 hours");

    console.log("\n🧪 VALIDATION COMMANDS:");
    console.log("   # DNS resolution test");
    console.log(`   dig ${this.registryDomain}`);
    console.log("   # HTTP connectivity test");
    console.log(`   curl -I https://${this.registryDomain}/health`);
    console.log("   # TLS certificate test");
    console.log(`   openssl s_client -connect ${this.registryDomain}:443 -servername ${this.registryDomain}`);

    console.log("\n🚨 TROUBLESHOOTING:");
    console.log("   - If DNS doesn't resolve: Check nameservers");
    console.log("   - If connection fails: Check firewall/proxy settings");
    console.log("   - If SSL errors: Wait for certificate issuance");
    console.log("   - If still failing: Check Cloudflare orange cloud status");

    await this.generateAutomatedScript();
  }

  private async checkCurrentDNS(): Promise<void> {
    console.log(`   Testing DNS resolution for ${this.registryDomain}...`);

    try {
      // Try multiple DNS resolution methods
      const dns = require('dns');

      // Method 1: System DNS
      try {
        const addresses = await new Promise((resolve, reject) => {
          dns.resolve4(this.registryDomain, (err: Error | null, addresses: string[]) => {
            if (err) reject(err);
            else resolve(addresses);
          });
        });
        console.log(`   ✅ System DNS: ${addresses}`);
      } catch (error) {
        console.log(`   ❌ System DNS: ${(error as Error).message}`);
      }

      // Method 2: Google DNS
      try {
        const response = await fetch(`https://dns.google/resolve?name=${this.registryDomain}&type=A`);
        const data = await response.json();
        if (data.Status === 0 && data.Answer) {
          console.log(`   ✅ Google DNS: ${data.Answer[0].data}`);
        } else {
          console.log(`   ❌ Google DNS: ${data.Status || 'No answer'}`);
        }
      } catch (error) {
        console.log(`   ❌ Google DNS: ${(error as Error).message}`);
      }

      // Method 3: Cloudflare DNS
      try {
        const response = await fetch(`https://cloudflare-dns.com/dns-query?name=${this.registryDomain}&type=A`, {
          headers: { 'Accept': 'application/dns-json' }
        });
        const data = await response.json();
        if (data.Answer) {
          console.log(`   ✅ Cloudflare DNS: ${data.Answer[0].data}`);
        } else {
          console.log(`   ❌ Cloudflare DNS: No answer`);
        }
      } catch (error) {
        console.log(`   ❌ Cloudflare DNS: ${(error as Error).message}`);
      }

    } catch (error) {
      console.log(`   ❌ DNS check failed: ${(error as Error).message}`);
    }
  }

  private async generateAutomatedScript(): Promise<void> {
    console.log("\n🔧 AUTOMATED SETUP SCRIPT:");
    console.log("Save this as 'setup-dns.sh' and run with your actual API token:");

    const script = `#!/bin/bash
# FactoryWager DNS Setup Script
# Replace with your actual values

CLOUDFLARE_API_TOKEN="your_api_token_here"
DOMAIN="factory-wager.com"
REGISTRY_IP="1.2.3.4"  # Replace with actual load balancer IP

echo "🌐 Setting up DNS for $DOMAIN..."

# Get Zone ID
ZONE_ID=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones?name=$DOMAIN" \\
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \\
  -H "Content-Type: application/json" | jq -r '.result[0].id')

if [ "$ZONE_ID" = "null" ]; then
  echo "❌ Zone not found. Add $DOMAIN to Cloudflare first."
  exit 1
fi

echo "✅ Zone ID: $ZONE_ID"

# Create registry A record
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \\
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \\
  -H "Content-Type: application/json" \\
  --data '{
    "type": "A",
    "name": "registry",
    "content": "'$REGISTRY_IP'",
    "ttl": 3600,
    "proxied": true
  }' | jq -r '.success'

echo "🔧 DNS setup complete!"
echo "⏳ Wait for propagation, then test with:"
echo "   dig registry.$DOMAIN"
echo "   curl -I https://registry.$DOMAIN/health"
`;

    console.log(script);

    // Save the script
    await Bun.write(Bun.file('./.factory-wager/setup-dns.sh'), script);
    console.log("\n💾 Script saved to: .factory-wager/setup-dns.sh");
    console.log("   chmod +x .factory-wager/setup-dns.sh");
    console.log("   # Set your API_TOKEN and REGISTRY_IP");
    console.log("   ./setup-dns.sh");
  }
}

// CLI interface
async function main() {
  const guide = new DNSSetupGuide();
  await guide.generateSetupInstructions();
}

if (import.meta.main) {
  main();
}
