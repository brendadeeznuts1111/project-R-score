#!/usr/bin/env bun
/**
 * FactoryWager DNS Setup Guide v1.3.8
 * Complete DNS configuration instructions and validation
 */

class DNSSetupGuide {
  private registryDomain = 'registry.factory-wager.co';

  async generateSetupInstructions(): Promise<void> {
    console.info("🌐 FactoryWager DNS Setup Guide");
    console.info("===============================");

    console.info("\n📋 CURRENT STATUS:");
    await this.checkCurrentDNS();

    console.info("\n🔧 STEP-BY-STEP SETUP:");
    console.info("1. DOMAIN REGISTRATION");
    console.info("   - Ensure factory-wager.com is registered");
    console.info("   - Verify domain ownership");
    console.info("   - Configure nameservers to Cloudflare:");
    console.info("     * ns1.cloudflare.com");
    console.info("     * ns2.cloudflare.com");

    console.info("\n2. CLOUDFLARE SETUP");
    console.info("   - Login to Cloudflare dashboard");
    console.info("   - Add site: factory-wager.com");
    console.info("   - Wait for DNS scan (2-5 minutes)");
    console.info("   - Select FREE plan");
    console.info("   - Confirm nameservers");

    console.info("\n3. DNS RECORDS CREATION");
    console.info("   - Go to DNS > Records");
    console.info("   - Add the following records:");

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
      console.info(`   - ${record.type} ${record.name} → ${record.content} (Proxy: ${record.proxy})`);
    });

    console.info("\n4. SSL/TLS CONFIGURATION");
    console.info("   - Go to SSL/TLS > Overview");
    console.info("   - Select 'Full (strict)' mode");
    console.info("   - Wait for certificate issuance");

    console.info("\n5. REGISTRY SERVICE CONFIGURATION");
    console.info("   - Deploy registry service to load balancer IP");
    console.info("   - Configure health check endpoint: /health");
    console.info("   - Set up firewall rules for port 443");
    console.info("   - Install SSL certificate on load balancer");

    console.info("\n⏳ PROPAGATION TIME:");
    console.info("   - DNS changes: 5-60 minutes");
    console.info("   - SSL certificate: 5-15 minutes");
    console.info("   - Global propagation: up to 24 hours");

    console.info("\n🧪 VALIDATION COMMANDS:");
    console.info("   # DNS resolution test");
    console.info(`   dig ${this.registryDomain}`);
    console.info("   # HTTP connectivity test");
    console.info(`   curl -I https://${this.registryDomain}/health`);
    console.info("   # TLS certificate test");
    console.info(`   openssl s_client -connect ${this.registryDomain}:443 -servername ${this.registryDomain}`);

    console.info("\n🚨 TROUBLESHOOTING:");
    console.info("   - If DNS doesn't resolve: Check nameservers");
    console.info("   - If connection fails: Check firewall/proxy settings");
    console.info("   - If SSL errors: Wait for certificate issuance");
    console.info("   - If still failing: Check Cloudflare orange cloud status");

    await this.generateAutomatedScript();
  }

  private async checkCurrentDNS(): Promise<void> {
    console.info(`   Testing DNS resolution for ${this.registryDomain}...`);

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
        console.info(`   ✅ System DNS: ${addresses}`);
      } catch (error) {
        console.info(`   ❌ System DNS: ${(error as Error).message}`);
      }

      // Method 2: Google DNS
      try {
        const response = await fetch(`https://dns.google/resolve?name=${this.registryDomain}&type=A`);
        const data = await response.json();
        if (data.Status === 0 && data.Answer) {
          console.info(`   ✅ Google DNS: ${data.Answer[0].data}`);
        } else {
          console.info(`   ❌ Google DNS: ${data.Status || 'No answer'}`);
        }
      } catch (error) {
        console.info(`   ❌ Google DNS: ${(error as Error).message}`);
      }

      // Method 3: Cloudflare DNS
      try {
        const response = await fetch(`https://cloudflare-dns.com/dns-query?name=${this.registryDomain}&type=A`, {
          headers: { 'Accept': 'application/dns-json' }
        });
        const data = await response.json();
        if (data.Answer) {
          console.info(`   ✅ Cloudflare DNS: ${data.Answer[0].data}`);
        } else {
          console.info(`   ❌ Cloudflare DNS: No answer`);
        }
      } catch (error) {
        console.info(`   ❌ Cloudflare DNS: ${(error as Error).message}`);
      }

    } catch (error) {
      console.info(`   ❌ DNS check failed: ${(error as Error).message}`);
    }
  }

  private async generateAutomatedScript(): Promise<void> {
    console.info("\n🔧 AUTOMATED SETUP SCRIPT:");
    console.info("Save this as 'setup-dns.sh' and run with your actual API token:");

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

    console.info(script);

    // Save the script
    await Bun.write(Bun.file('./.factory-wager/setup-dns.sh'), script);
    console.info("\n💾 Script saved to: .factory-wager/setup-dns.sh");
    console.info("   chmod +x .factory-wager/setup-dns.sh");
    console.info("   # Set your API_TOKEN and REGISTRY_IP");
    console.info("   ./setup-dns.sh");
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
