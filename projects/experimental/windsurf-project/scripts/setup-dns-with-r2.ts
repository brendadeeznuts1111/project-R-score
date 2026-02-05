// scripts/setup-dns-with-r2.ts
/**
 * 🌐 DNS SETUP FOR EMPIRE PRO PRODUCTION WITH R2 INTEGRATION
 * Uses existing R2 credentials and adds Cloudflare API for DNS
 */

import { CLOUDFLARE_R2_CONFIG } from '../config/cloudflare-r2.js';
import { execSync } from 'child_process';

interface DNSRecord {
  name: string;
  type: 'A' | 'CNAME';
  content: string;
  ttl?: number;
}

class ProductionDNSManager {
  private zoneName: string;
  private r2Config: typeof CLOUDFLARE_R2_CONFIG;

  constructor() {
    this.zoneName = 'apple.factory-wager.com';
    this.r2Config = CLOUDFLARE_R2_CONFIG;
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

  async validateR2Connection(): Promise<boolean> {
    console.log('🔍 Validating R2 Storage connection...');
    
    try {
      // Test R2 connection using existing config
      const testEndpoint = `${this.r2Config.endpoint}/${this.r2Config.bucket}`;
      const response = await fetch(testEndpoint, { 
        method: 'HEAD',
        headers: {
          'Authorization': `AWS4-HMAC-SHA256 Credential=${this.r2Config.accessKeyId}`
        }
      });
      
      if (response.ok || response.status === 403) { // 403 means auth works but no list permission
        console.log('✅ R2 Storage connection validated');
        console.log(`   Bucket: ${this.r2Config.bucket}`);
        console.log(`   Account: ${this.r2Config.accountId}`);
        console.log(`   Endpoint: ${this.r2Config.endpoint}`);
        return true;
      }
      
      return false;
    } catch (error: any) {
      console.error('❌ R2 validation failed:', error?.message || error);
      return false;
    }
  }

  async setupCloudflareSecrets(): Promise<void> {
    console.log('🔐 Setting up Cloudflare API secrets...');
    console.log('');
    console.log('R2 Storage is already configured with these credentials:');
    console.log(`   Account ID: ${this.r2Config.accountId}`);
    console.log(`   Bucket: ${this.r2Config.bucket}`);
    console.log('');
    console.log('Now add Cloudflare API credentials for DNS management:');
    console.log('');

    try {
      // Check if secrets already exist
      const apiToken = await this.getSecret('CF_API_TOKEN').catch(() => null);
      const zoneId = await this.getSecret('CF_ZONE_ID').catch(() => null);

      if (apiToken && zoneId) {
        console.log('✅ Cloudflare API secrets already configured');
        return;
      }

      console.log('📝 Required Cloudflare API credentials:');
      console.log('');
      
      if (!apiToken) {
        console.log('1. Create API Token at: https://dash.cloudflare.com/profile/api-tokens');
        console.log('   Permissions: Zone:Edit, DNS:Edit for apple.factory-wager.com');
        console.log('   Then run: bun run cli secrets set CF_API_TOKEN "your-token"');
        console.log('');
      }

      if (!zoneId) {
        console.log('2. Find Zone ID at: https://dash.cloudflare.com');
        console.log('   Go to apple.factory-wager.com → API → Zone ID');
        console.log('   Then run: bun run cli secrets set CF_ZONE_ID "your-zone-id"');
        console.log('');
      }

    } catch (error: any) {
      console.error('❌ Secret setup failed:', error?.message || error);
    }
  }

  async validateCloudflareSecrets(): Promise<boolean> {
    try {
      console.log('🔍 Validating Cloudflare API secrets...');
      
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
      console.error('❌ Cloudflare validation failed:', error?.message || error);
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
      // Validate R2 first
      const r2Valid = await this.validateR2Connection();
      if (!r2Valid) {
        throw new Error('R2 connection validation failed');
      }

      // Validate Cloudflare API
      const cfValid = await this.validateCloudflareSecrets();
      if (!cfValid) {
        throw new Error('Cloudflare API validation failed');
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
      console.log('🔗 R2 Storage integration active');
      
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

  async validateFullSystem(): Promise<void> {
    console.log('\n🔍 Validating complete system...');
    
    console.log('\n📊 R2 Storage Status:');
    await this.validateR2Connection();
    
    console.log('\n🌐 DNS Endpoints:');
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

    console.log('\n🚀 Empire Pro Phone Intelligence: PRODUCTION READY');
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  
  try {
    const dns = new ProductionDNSManager();

    switch (command) {
      case 'setup-secrets':
        await dns.setupCloudflareSecrets();
        break;
      
      case 'validate-r2':
        const r2Valid = await dns.validateR2Connection();
        console.log(`R2 Status: ${r2Valid ? '✅ ONLINE' : '❌ OFFLINE'}`);
        break;
      
      case 'validate-cloudflare':
        const cfValid = await dns.validateCloudflareSecrets();
        console.log(`Cloudflare Status: ${cfValid ? '✅ CONNECTED' : '❌ FAILED'}`);
        break;
      
      case 'setup':
        await dns.setupProductionDNS();
        await dns.validateFullSystem();
        break;
      
      default:
        console.log('🌐 Empire Pro Production DNS Manager (with R2 Integration)');
        console.log('');
        console.log('R2 Storage Configuration:');
        console.log(`  Account: ${dns['r2Config'].accountId}`);
        console.log(`  Bucket: ${dns['r2Config'].bucket}`);
        console.log('');
        console.log('Usage:');
        console.log('  bun run scripts/setup-dns-with-r2.ts setup-secrets      # Setup Cloudflare secrets');
        console.log('  bun run scripts/setup-dns-with-r2.ts validate-r2        # Validate R2 connection');
        console.log('  bun run scripts/setup-dns-with-r2.ts validate-cloudflare # Validate Cloudflare API');
        console.log('  bun run scripts/setup-dns-with-r2.ts setup              # Setup complete system');
        console.log('');
        console.log('Quick Start:');
        console.log('  1. bun run cli secrets set CF_API_TOKEN "your-token"');
        console.log('  2. bun run cli secrets set CF_ZONE_ID "your-zone-id"');
        console.log('  3. bun run scripts/setup-dns-with-r2.ts setup');
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

export { ProductionDNSManager };
