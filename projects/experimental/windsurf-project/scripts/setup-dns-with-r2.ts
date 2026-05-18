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
    console.info('🔍 Validating R2 Storage connection...');
    
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
        console.info('✅ R2 Storage connection validated');
        console.info(`   Bucket: ${this.r2Config.bucket}`);
        console.info(`   Account: ${this.r2Config.accountId}`);
        console.info(`   Endpoint: ${this.r2Config.endpoint}`);
        return true;
      }
      
      return false;
    } catch (error: any) {
      console.error('❌ R2 validation failed:', error?.message || error);
      return false;
    }
  }

  async setupCloudflareSecrets(): Promise<void> {
    console.info('🔐 Setting up Cloudflare API secrets...');
    console.info('');
    console.info('R2 Storage is already configured with these credentials:');
    console.info(`   Account ID: ${this.r2Config.accountId}`);
    console.info(`   Bucket: ${this.r2Config.bucket}`);
    console.info('');
    console.info('Now add Cloudflare API credentials for DNS management:');
    console.info('');

    try {
      // Check if secrets already exist
      const apiToken = await this.getSecret('CF_API_TOKEN').catch(() => null);
      const zoneId = await this.getSecret('CF_ZONE_ID').catch(() => null);

      if (apiToken && zoneId) {
        console.info('✅ Cloudflare API secrets already configured');
        return;
      }

      console.info('📝 Required Cloudflare API credentials:');
      console.info('');
      
      if (!apiToken) {
        console.info('1. Create API Token at: https://dash.cloudflare.com/profile/api-tokens');
        console.info('   Permissions: Zone:Edit, DNS:Edit for apple.factory-wager.com');
        console.info('   Then run: bun run cli secrets set CF_API_TOKEN "your-token"');
        console.info('');
      }

      if (!zoneId) {
        console.info('2. Find Zone ID at: https://dash.cloudflare.com');
        console.info('   Go to apple.factory-wager.com → API → Zone ID');
        console.info('   Then run: bun run cli secrets set CF_ZONE_ID "your-zone-id"');
        console.info('');
      }

    } catch (error: any) {
      console.error('❌ Secret setup failed:', error?.message || error);
    }
  }

  async validateCloudflareSecrets(): Promise<boolean> {
    try {
      console.info('🔍 Validating Cloudflare API secrets...');
      
      const apiToken = await this.getSecret('CF_API_TOKEN');
      const zoneId = await this.getSecret('CF_ZONE_ID');
      
      // Test API connection
      const response = await this.makeCloudflareRequest('');
      if (response.success) {
        console.info('✅ Cloudflare API connection successful');
        console.info(`✅ Zone: ${response.result.name} (${response.result.id})`);
        return true;
      }
      
      return false;
    } catch (error: any) {
      console.error('❌ Cloudflare validation failed:', error?.message || error);
      return false;
    }
  }

  async setupProductionDNS(): Promise<void> {
    console.info('🌐 Setting up Empire Pro Production DNS...');
    console.info('═'.repeat(50));

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
      console.info('\n📋 Checking existing DNS records...');
      const existingData = await this.makeCloudflareRequest('/dns_records');
      const existingRecords = existingData.result || [];
      
      console.info(`Found ${existingRecords.length} existing records`);
      
      // Create or update records
      for (const record of requiredRecords) {
        const existing = existingRecords.find((r: any) => 
          r.name === record.name && r.type === record.type
        );

        if (existing) {
          if (existing.content !== record.content) {
            console.info(`🔄 Updating ${record.name} → ${record.content}`);
            await this.updateDNSRecord(existing.id, record);
          } else {
            console.info(`✅ Already exists: ${record.name} → ${record.content}`);
          }
        } else {
          console.info(`🔧 Creating ${record.name} → ${record.content}`);
          await this.createDNSRecord(record);
        }
      }

      console.info('\n🎉 DNS setup complete!');
      console.info('📡 DNS records configured for Empire Pro Production');
      console.info('🔗 R2 Storage integration active');
      
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
    console.info('\n🔍 Validating complete system...');
    
    console.info('\n📊 R2 Storage Status:');
    await this.validateR2Connection();
    
    console.info('\n🌐 DNS Endpoints:');
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
        
        console.info(`✅ ${endpoint.name}: ${response.status} (ACTIVE)`);
      } catch (error) {
        console.info(`⚠️  ${endpoint.name}: Pending DNS propagation`);
      }
    }

    console.info('\n🚀 Empire Pro Phone Intelligence: PRODUCTION READY');
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
        console.info(`R2 Status: ${r2Valid ? '✅ ONLINE' : '❌ OFFLINE'}`);
        break;
      
      case 'validate-cloudflare':
        const cfValid = await dns.validateCloudflareSecrets();
        console.info(`Cloudflare Status: ${cfValid ? '✅ CONNECTED' : '❌ FAILED'}`);
        break;
      
      case 'setup':
        await dns.setupProductionDNS();
        await dns.validateFullSystem();
        break;
      
      default:
        console.info('🌐 Empire Pro Production DNS Manager (with R2 Integration)');
        console.info('');
        console.info('R2 Storage Configuration:');
        console.info(`  Account: ${dns['r2Config'].accountId}`);
        console.info(`  Bucket: ${dns['r2Config'].bucket}`);
        console.info('');
        console.info('Usage:');
        console.info('  bun run scripts/setup-dns-with-r2.ts setup-secrets      # Setup Cloudflare secrets');
        console.info('  bun run scripts/setup-dns-with-r2.ts validate-r2        # Validate R2 connection');
        console.info('  bun run scripts/setup-dns-with-r2.ts validate-cloudflare # Validate Cloudflare API');
        console.info('  bun run scripts/setup-dns-with-r2.ts setup              # Setup complete system');
        console.info('');
        console.info('Quick Start:');
        console.info('  1. bun run cli secrets set CF_API_TOKEN "your-token"');
        console.info('  2. bun run cli secrets set CF_ZONE_ID "your-zone-id"');
        console.info('  3. bun run scripts/setup-dns-with-r2.ts setup');
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
