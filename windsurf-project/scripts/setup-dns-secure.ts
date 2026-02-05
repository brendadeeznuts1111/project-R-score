// scripts/setup-dns-secure.ts
/**
 * 🌐 SECURE DNS SETUP FOR EMPIRE PRO PRODUCTION
 * Uses Bun secrets CLI for secure credential management
 */

import { execSync } from 'child_process';

interface DNSRecord {
  name: string;
  type: 'A' | 'CNAME';
  content: string;
  ttl?: number;
}

class SecureDNSManager {
  private zoneName: string;

  constructor() {
    this.zoneName = 'apple.factory-wager.com';
  }

  private async getSecret(name: string): Promise<string> {
    try {
      const result = execSync(`bun run cli secrets get ${name}`, {
        encoding: 'utf8',
        cwd: process.cwd()
      }).trim();
      
      if (result.includes('❌') || result.includes('not found')) {
        throw new Error(`Secret ${name} not found`);
      }
      
      return result;
    } catch (error: any) {
      throw new Error(`❌ Failed to get secret ${name}: ${error?.message || error}`);
    }
  }

  private async makeCloudflareRequest(endpoint: string, options: RequestInit = {}) {
    const apiToken = await this.getSecret('CF_API_TOKEN');
    const zoneId = await this.getSecret('CF_ZONE_ID');
    
    const url = `https://api.cloudflare.com/client/v4/zones/${zoneId}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      ...options
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Cloudflare API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async setupSecrets(): Promise<void> {
    console.log('🔐 Setting up Cloudflare secrets...');
    console.log('');
    console.log('Please enter your Cloudflare credentials:');
    console.log('');

    try {
      // Check if secrets already exist
      const apiToken = await this.getSecret('CF_API_TOKEN').catch(() => null);
      const zoneId = await this.getSecret('CF_ZONE_ID').catch(() => null);

      if (apiToken && zoneId) {
        console.log('✅ Cloudflare secrets already configured');
        return;
      }

      // Set API Token
      if (!apiToken) {
        console.log('📝 Enter Cloudflare API Token:');
        console.log('   (Create at: https://dash.cloudflare.com/profile/api-tokens)');
        console.log('   Permissions needed: Zone:Edit, DNS:Edit for apple.factory-wager.com');
        console.log('');
        
        // Note: In a real scenario, you'd prompt for input
        console.log('Run: bun run cli secrets set CF_API_TOKEN "your-token-here"');
      }

      // Set Zone ID
      if (!zoneId) {
        console.log('📝 Enter Cloudflare Zone ID:');
        console.log('   (Find in Cloudflare Dashboard → Domain → API → Zone ID)');
        console.log('');
        
        console.log('Run: bun run cli secrets set CF_ZONE_ID "your-zone-id-here"');
      }

    } catch (error: any) {
      console.error('❌ Secret setup failed:', error?.message || error);
    }
  }

  async validateSecrets(): Promise<boolean> {
    try {
      console.log('🔍 Validating Cloudflare secrets...');
      
      const apiToken = await this.getSecret('CF_API_TOKEN');
      const zoneId = await this.getSecret('CF_ZONE_ID');
      
      // Test API connection
      const response = await this.makeCloudflareRequest('');
      if (response.success) {
        console.log('✅ Cloudflare API connection successful');
        console.log(`✅ Zone: ${response.result.name} (${response.result.id})`);
        return true;
      }
      
      return false;
    } catch (error: any) {
      console.error('❌ Secret validation failed:', error?.message || error);
      return false;
    }
  }

  async setupProductionDNS(): Promise<void> {
    console.log('🌐 Setting up Empire Pro Production DNS...');
    console.log('═'.repeat(50));

    const requiredRecords: DNSRecord[] = [
      {
        name: 'apple',
        type: 'A',
        content: '192.0.2.1', // Origin server IP
        ttl: 300
      },
      {
        name: 'api.apple',
        type: 'CNAME',
        content: 'apple.factory-wager.com',
        ttl: 300
      },
      {
        name: 'dashboard.apple',
        type: 'CNAME',
        content: 'apple.factory-wager.com',
        ttl: 300
      },
      {
        name: 'status.apple',
        type: 'CNAME',
        content: 'apple.factory-wager.com',
        ttl: 300
      },
      {
        name: 'metrics.apple',
        type: 'CNAME',
        content: 'apple.factory-wager.com',
        ttl: 300
      },
      {
        name: 'admin.apple',
        type: 'CNAME',
        content: 'apple.factory-wager.com',
        ttl: 300
      }
    ];

    try {
      // Validate secrets first
      const secretsValid = await this.validateSecrets();
      if (!secretsValid) {
        throw new Error('Invalid Cloudflare credentials');
      }

      // List existing records
      console.log('\n📋 Checking existing DNS records...');
      const existingData = await this.makeCloudflareRequest('/dns_records');
      const existingRecords = existingData.result || [];
      
      console.log(`Found ${existingRecords.length} existing records`);
      
      // Create or update records
      for (const record of requiredRecords) {
        const existing = existingRecords.find((r: any) => 
          r.name === record.name && r.type === record.type
        );

        if (existing) {
          if (existing.content !== record.content) {
            console.log(`🔄 Updating ${record.name} → ${record.content}`);
            await this.updateDNSRecord(existing.id, record);
          } else {
            console.log(`✅ Already exists: ${record.name} → ${record.content}`);
          }
        } else {
          console.log(`🔧 Creating ${record.name} → ${record.content}`);
          await this.createDNSRecord(record);
        }
      }

      console.log('\n🎉 DNS setup complete!');
      console.log('📡 DNS records configured for Empire Pro Production');
      
    } catch (error: any) {
      console.error('❌ DNS setup failed:', error?.message || error);
      throw error;
    }
  }

  private async createDNSRecord(record: DNSRecord): Promise<void> {
    const payload = {
      type: record.type,
      name: record.name,
      content: record.content,
      ttl: record.ttl || 300,
      proxied: true // Enable Cloudflare proxy
    };

    await this.makeCloudflareRequest('/dns_records', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  private async updateDNSRecord(recordId: string, record: DNSRecord): Promise<void> {
    const payload = {
      type: record.type,
      name: record.name,
      content: record.content,
      ttl: record.ttl || 300,
      proxied: true
    };

    await this.makeCloudflareRequest(`/dns_records/${recordId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  async validateDNS(): Promise<void> {
    console.log('\n🔍 Validating DNS configuration...');
    
    const endpoints = [
      { name: 'API', url: 'https://api.apple' },
      { name: 'Dashboard', url: 'https://dashboard.apple' },
      { name: 'Status', url: 'https://status.apple' }
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint.url, { 
          method: 'HEAD',
          signal: AbortSignal.timeout(5000)
        });
        
        console.log(`✅ ${endpoint.name}: ${response.status} (ACTIVE)`);
      } catch (error) {
        console.log(`⚠️  ${endpoint.name}: Pending DNS propagation`);
      }
    }
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  
  try {
    const dns = new SecureDNSManager();

    switch (command) {
      case 'setup-secrets':
        await dns.setupSecrets();
        break;
      
      case 'validate-secrets':
        const valid = await dns.validateSecrets();
        process.exit(valid ? 0 : 1);
        break;
      
      case 'setup':
        await dns.setupProductionDNS();
        await dns.validateDNS();
        break;
      
      default:
        console.log('🌐 Empire Pro SECURE DNS Manager');
        console.log('');
        console.log('Usage:');
        console.log('  bun run scripts/setup-dns-secure.ts setup-secrets   # Setup Cloudflare secrets');
        console.log('  bun run scripts/setup-dns-secure.ts validate-secrets # Validate secrets');
        console.log('  bun run scripts/setup-dns-secure.ts setup           # Setup production DNS');
        console.log('');
        console.log('Quick Start:');
        console.log('  1. bun run cli secrets set CF_API_TOKEN "your-token"');
        console.log('  2. bun run cli secrets set CF_ZONE_ID "your-zone-id"');
        console.log('  3. bun run scripts/setup-dns-secure.ts setup');
        break;
    }
  } catch (error: any) {
    console.error('❌ DNS operation failed:', error?.message || error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}

export { SecureDNSManager };
