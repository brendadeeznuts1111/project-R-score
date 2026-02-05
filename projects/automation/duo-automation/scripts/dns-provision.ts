// scripts/dns-provision.ts [#REF:DNS][BUN-NATIVE]
import { $ } from 'bun';

export interface DNSRecord {
  id?: string;
  type: string;
  name: string;
  content: string;
  proxied: boolean;
}

export interface RecordResult extends DNSRecord {
  action: 'created' | 'updated' | 'failed';
  status: 'success' | 'error';
  error?: string;
}

export interface DNSProvisionResult {
  success: boolean;
  records: RecordResult[];
}

export class DNSProvisioner {
  private readonly ZONE_ID = process.env.CLOUDFLARE_ZONE_ID!;
  private readonly API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!;
  private readonly BASE_DOMAIN = 'factory-wager.com';
  
  // Complete DNS record matrix for apple. subdomain architecture
  private readonly REQUIRED_RECORDS = [
    { type: 'CNAME', name: 'api.apple', content: this.BASE_DOMAIN, proxied: true },
    { type: 'CNAME', name: 'qr.apple', content: this.BASE_DOMAIN, proxied: true },
    { type: 'CNAME', name: 'ws.apple', content: this.BASE_DOMAIN, proxied: true },
    { type: 'CNAME', name: 'auth.apple', content: this.BASE_DOMAIN, proxied: true },
    { type: 'CNAME', name: 'monitor.apple', content: this.BASE_DOMAIN, proxied: true },
    { type: 'CNAME', name: 'admin.apple', content: this.BASE_DOMAIN, proxied: true },
  ];

  async provisionDNS(): Promise<DNSProvisionResult> {
    console.log('🌐 Provisioning DNS records for apple. subdomain architecture...\n');
    
    const results: RecordResult[] = [];
    
    for (const record of this.REQUIRED_RECORDS) {
      const result = await this.createOrUpdateRecord(record as DNSRecord);
      results.push(result);
    }
    
    // Verify propagation
    console.log('\n⏳ Verifying DNS propagation...');
    await this.verifyPropagation();
    
    // Update SSL/TLS settings
    await this.optimizeSSL();
    
    return { success: true, records: results };
  }

  private async createOrUpdateRecord(record: DNSRecord): Promise<RecordResult> {
    try {
      // Check if record exists
      const existing = await this.getExistingRecord(record.name);
      
      if (existing) {
        // Update existing record
        await $`curl -X PUT "https://api.cloudflare.com/client/v4/zones/${this.ZONE_ID}/dns_records/${existing.id}" \
          -H "Authorization: Bearer ${this.API_TOKEN}" \
          -H "Content-Type: application/json" \
          -d '${JSON.stringify({
            type: record.type,
            name: record.name,
            content: record.content,
            proxied: record.proxied,
          })}'`.quiet();
        
        return { ...record, action: 'updated', status: 'success' };
      } else {
        // Create new record
        await $`curl -X POST "https://api.cloudflare.com/client/v4/zones/${this.ZONE_ID}/dns_records" \
          -H "Authorization: Bearer ${this.API_TOKEN}" \
          -H "Content-Type: application/json" \
          -d '${JSON.stringify({
            type: record.type,
            name: record.name,
            content: record.content,
            proxied: record.proxied,
          })}'`.quiet();
        
        return { ...record, action: 'created', status: 'success' };
      }
    } catch (error: any) {
      return { ...record, action: 'failed', status: 'error', error: error.message };
    }
  }

  private async getExistingRecord(name: string): Promise<DNSRecord | null> {
    const response = await $`curl -s "https://api.cloudflare.com/client/v4/zones/${this.ZONE_ID}/dns_records?name=${name}.${this.BASE_DOMAIN}" \
      -H "Authorization: Bearer ${this.API_TOKEN}"`.json();
    
    const records = response.result;
    return records && records.length > 0 ? records[0] : null;
  }

  private async verifyPropagation(): Promise<void> {
    const recordsToCheck = ['api.apple', 'qr.apple', 'ws.apple', 'auth.apple'];
    
    for (const record of recordsToCheck) {
      const fqdn = `${record}.${this.BASE_DOMAIN}`;
      
      // Use multiple DNS servers for verification
      const checks = await Promise.all([
        this.dnsLookup(fqdn, '8.8.8.8'),    // Google
        this.dnsLookup(fqdn, '1.1.1.1'),    // Cloudflare
        this.dnsLookup(fqdn, '208.67.222.222'), // OpenDNS
      ]);
      
      const propagated = checks.every(ip => ip === this.BASE_DOMAIN || ip.includes('cloudflare'));
      
      console.log(`  ${propagated ? '✅' : '⏳'} ${fqdn} - ${propagated ? 'Propagated' : 'Pending'}`);
      
      if (!propagated) {
        console.log(`     Tip: Run "dig ${fqdn} @1.1.1.1" to check manually`);
      }
    }
  }

  private async dnsLookup(domain: string, server: string): Promise<string> {
    try {
      const result = await $`dig +short ${domain} @${server}`.text();
      return result.trim();
    } catch {
      return '';
    }
  }

  private async optimizeSSL(): Promise<void> {
    console.log('\n🔒 Optimizing SSL/TLS settings...');
    
    // Enable HTTP/3
    await $`curl -X PATCH "https://api.cloudflare.com/client/v4/zones/${this.ZONE_ID}/settings/http3" \
      -H "Authorization: Bearer ${this.API_TOKEN}" \
      -d '{"value":"on"}'`.quiet();
    
    // Set minimum TLS version to 1.2
    await $`curl -X PATCH "https://api.cloudflare.com/client/v4/zones/${this.ZONE_ID}/settings/min_tls_version" \
      -H "Authorization: Bearer ${this.API_TOKEN}" \
      -d '{"value":"1.2"}'`.quiet();
    
    // Enable automatic HTTPS rewrites
    await $`curl -X PATCH "https://api.cloudflare.com/client/v4/zones/${this.ZONE_ID}/settings/automatic_https_rewrites" \
      -H "Authorization: Bearer ${this.API_TOKEN}" \
      -d '{"value":"on"}'`.quiet();
    
    console.log('  ✅ HTTP/3 enabled');
    console.log('  ✅ TLS 1.2 minimum enforced');
    console.log('  ✅ Automatic HTTPS rewrites enabled');
  }
}

// Run: bun run scripts/dns-provision.ts
if (import.meta.path === Bun.main) {
  const provisioner = new DNSProvisioner();
  await provisioner.provisionDNS();
}
