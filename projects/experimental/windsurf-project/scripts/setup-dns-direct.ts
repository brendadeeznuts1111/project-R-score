// scripts/setup-dns-direct.ts
/**
 * 🌐 DIRECT DNS SETUP FOR EMPIRE PRO PRODUCTION
 * Uses actual Cloudflare credentials from config-enhanced.json
 */

import config from '../config/config-enhanced.json';

interface DNSRecord {
  name: string;
  type: 'A' | 'CNAME';
  content: string;
  ttl?: number;
}

class DirectDNSManager {
  private apiToken: string;
  private zoneId: string;
  private zoneName: string;

  constructor() {
    // Extract credentials from config
    this.apiToken = config.original.domain.dnsApiKey;
    this.zoneId = config.original.domain.zoneId;
    this.zoneName = config.original.domain.name;

    console.info('🔐 Using Cloudflare credentials from config-enhanced.json');
    console.info(`   Zone: ${config.original.domain.subdomain}.${this.zoneName}`);
    console.info(`   Zone ID: ${this.zoneId}`);
  }

  private async makeCloudflareRequest(endpoint: string, options: RequestInit = {}) {
    const url = `https://api.cloudflare.com/client/v4/zones/${this.zoneId}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
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

  async validateCredentials(): Promise<boolean> {
    try {
      console.info('🔍 Validating Cloudflare credentials...');
      
      const response = await this.makeCloudflareRequest('');
      if (response.success) {
        console.info('✅ Cloudflare API connection successful');
        console.info(`✅ Zone: ${response.result.name} (${response.result.id})`);
        return true;
      }
      
      return false;
    } catch (error: any) {
      console.error('❌ Credential validation failed:', error?.message || error);
      return false;
    }
  }

  async listDNSRecords(): Promise<any[]> {
    try {
      const data = await this.makeCloudflareRequest('/dns_records');
      return data.result || [];
    } catch (error: any) {
      console.error('❌ Failed to list DNS records:', error?.message || error);
      return [];
    }
  }

  async createDNSRecord(record: DNSRecord): Promise<void> {
    console.info(`🔧 Creating DNS record: ${record.name} (${record.type}) → ${record.content}`);
    
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

    console.info(`✅ Created: ${record.name} → ${record.content}`);
  }

  async updateDNSRecord(recordId: string, record: DNSRecord): Promise<void> {
    console.info(`🔄 Updating DNS record: ${record.name} → ${record.content}`);
    
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

    console.info(`✅ Updated: ${record.name} → ${record.content}`);
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
      // Validate credentials first
      const credentialsValid = await this.validateCredentials();
      if (!credentialsValid) {
        throw new Error('Invalid Cloudflare credentials');
      }

      // List existing records
      console.info('\n📋 Checking existing DNS records...');
      const existingRecords = await this.listDNSRecords();
      
      console.info(`Found ${existingRecords.length} existing records`);
      
      // Create or update records
      for (const record of requiredRecords) {
        const existing = existingRecords.find((r: any) => 
          r.name === record.name && r.type === record.type
        );

        if (existing) {
          if (existing.content !== record.content) {
            await this.updateDNSRecord(existing.id, record);
          } else {
            console.info(`✅ Already exists: ${record.name} → ${record.content}`);
          }
        } else {
          await this.createDNSRecord(record);
        }
      }

      console.info('\n🎉 DNS setup complete!');
      console.info('📡 DNS records configured for Empire Pro Production');
      
    } catch (error: any) {
      console.error('❌ DNS setup failed:', error?.message || error);
      throw error;
    }
  }

  async validateDNS(): Promise<void> {
    console.info('\n🔍 Validating DNS configuration...');
    
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
  }

  async showCurrentStatus(): Promise<void> {
    console.info('📊 CURRENT DNS STATUS');
    console.info('═'.repeat(40));
    
    console.info(`Domain: ${config.original.domain.subdomain}.${this.zoneName}`);
    console.info(`Zone ID: ${this.zoneId}`);
    console.info(`API Token: ${this.apiToken.substring(0, 10)}...`);
    
    const records = await this.listDNSRecords();
    console.info(`\nExisting DNS Records (${records.length}):`);
    
    const relevantRecords = records.filter((r: any) => 
      r.name.includes('apple') || r.name === 'apple'
    );
    
    if (relevantRecords.length === 0) {
      console.info('   No apple.* records found - ready for setup');
    } else {
      relevantRecords.forEach((record: any) => {
        console.info(`   ${record.type} ${record.name} → ${record.content}`);
      });
    }
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  
  try {
    const dns = new DirectDNSManager();

    switch (command) {
      case 'status':
        await dns.showCurrentStatus();
        break;
      
      case 'validate':
        const valid = await dns.validateCredentials();
        console.info(`\nCredentials: ${valid ? '✅ VALID' : '❌ INVALID'}`);
        break;
      
      case 'list':
        const records = await dns.listDNSRecords();
        console.info('📋 All DNS Records:');
        records.forEach((record: any) => {
          console.info(`  ${record.type} ${record.name} → ${record.content}`);
        });
        break;
      
      case 'setup':
        await dns.setupProductionDNS();
        await dns.validateDNS();
        break;
      
      default:
        console.info('🌐 Empire Pro DIRECT DNS Manager');
        console.info('');
        console.info('Configuration: config-enhanced.json');
        console.info(`Domain: ${config.original.domain.subdomain}.${config.original.domain.name}`);
        console.info('');
        console.info('Usage:');
        console.info('  bun run scripts/setup-dns-direct.ts status   # Show current status');
        console.info('  bun run scripts/setup-dns-direct.ts validate # Validate credentials');
        console.info('  bun run scripts/setup-dns-direct.ts list     # List all records');
        console.info('  bun run scripts/setup-dns-direct.ts setup    # Setup production DNS');
        console.info('');
        console.info('🚀 Quick Start: bun run scripts/setup-dns-direct.ts setup');
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

export { DirectDNSManager };
