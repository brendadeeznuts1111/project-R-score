// scripts/setup-dns.ts
/**
 * 🌐 DNS SETUP FOR EMPIRE PRO PRODUCTION
 * Configures DNS records using Cloudflare API
 */

interface DNSRecord {
  name: string;
  type: 'A' | 'CNAME';
  content: string;
  ttl?: number;
}

class DNSManager {
  private apiToken: string;
  private zoneId: string;
  private zoneName: string;

  constructor() {
    this.apiToken = process.env.CF_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN || '';
    this.zoneId = process.env.CF_ZONE_ID || process.env.CLOUDFLARE_ZONE_ID || '';
    this.zoneName = 'apple.factory-wager.com'; // Target zone

    if (!this.apiToken || !this.zoneId) {
      throw new Error('❌ Cloudflare credentials not found. Set CF_API_TOKEN and CF_ZONE_ID in .env');
    }
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
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

  async listDNSRecords(): Promise<any[]> {
    const data = await this.makeRequest('/dns_records');
    return data.result || [];
  }

  async createDNSRecord(record: DNSRecord): Promise<void> {
    console.log(`🔧 Creating DNS record: ${record.name} (${record.type}) → ${record.content}`);
    
    const payload = {
      type: record.type,
      name: record.name,
      content: record.content,
      ttl: record.ttl || 300, // 5 minutes default
      proxied: true // Enable Cloudflare proxy
    };

    await this.makeRequest('/dns_records', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    console.log(`✅ Created: ${record.name} → ${record.content}`);
  }

  async updateDNSRecord(recordId: string, record: DNSRecord): Promise<void> {
    console.log(`🔄 Updating DNS record: ${record.name} → ${record.content}`);
    
    const payload = {
      type: record.type,
      name: record.name,
      content: record.content,
      ttl: record.ttl || 300,
      proxied: true
    };

    await this.makeRequest(`/dns_records/${recordId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });

    console.log(`✅ Updated: ${record.name} → ${record.content}`);
  }

  async deleteDNSRecord(recordId: string, name: string): Promise<void> {
    console.log(`🗑️  Deleting DNS record: ${name}`);
    
    await this.makeRequest(`/dns_records/${recordId}`, {
      method: 'DELETE'
    });

    console.log(`✅ Deleted: ${name}`);
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
      // List existing records
      console.log('\n📋 Checking existing DNS records...');
      const existingRecords = await this.listDNSRecords();
      
      // Create or update records
      for (const record of requiredRecords) {
        const existing = existingRecords.find(r => 
          r.name === record.name && r.type === record.type
        );

        if (existing) {
          if (existing.content !== record.content) {
            await this.updateDNSRecord(existing.id, record);
          } else {
            console.log(`✅ Already exists: ${record.name} → ${record.content}`);
          }
        } else {
          await this.createDNSRecord(record);
        }
      }

      console.log('\n🎉 DNS setup complete!');
      console.log('📡 DNS records configured for Empire Pro Production');
      
    } catch (error) {
      console.error('❌ DNS setup failed:', error);
      throw error;
    }
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
    const dns = new DNSManager();

    switch (command) {
      case 'setup':
        await dns.setupProductionDNS();
        await dns.validateDNS();
        break;
      
      case 'list':
        const records = await dns.listDNSRecords();
        console.log('📋 Current DNS Records:');
        records.forEach((record: any) => {
          console.log(`  ${record.type} ${record.name} → ${record.content}`);
        });
        break;
      
      case 'validate':
        await dns.validateDNS();
        break;
      
      default:
        console.log('🌐 Empire Pro DNS Manager');
        console.log('');
        console.log('Usage:');
        console.log('  bun run scripts/setup-dns.ts setup     # Setup production DNS');
        console.log('  bun run scripts/setup-dns.ts list      # List current records');
        console.log('  bun run scripts/setup-dns.ts validate  # Validate endpoints');
        console.log('');
        console.log('Required environment variables:');
        console.log('  CF_API_TOKEN or CLOUDFLARE_API_TOKEN');
        console.log('  CF_ZONE_ID or CLOUDFLARE_ZONE_ID');
        break;
    }
  } catch (error) {
    console.error('❌ DNS operation failed:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}

export { DNSManager };
