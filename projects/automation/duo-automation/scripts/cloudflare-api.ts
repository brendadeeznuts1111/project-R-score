#!/usr/bin/env bun
// [DUOPLUS][CLOUDFLARE][TS][META:{dns,r2,cdn}][API][#REF:CF-API-46][BUN:4.6]

import { urlLink } from './tty-hyperlink';

/**
 * Cloudflare API Client v4.6
 *
 * Bun-native client for Cloudflare DNS, R2, and CDN management.
 * Zone: factory-wager.com
 *
 * IMPORTANT: Requires CF_API_TOKEN environment variable.
 * Get your API token: https://dash.cloudflare.com/profile/api-tokens
 */

const CF_API_BASE = 'https://api.cloudflare.com/client/v4';

// Default configuration from plan
export const DEFAULT_ZONE_ID = 'a3b7ba4bb62cb1b177b04b8675250674';
export const DEFAULT_ACCOUNT_ID = '7a470541a704caaf91e71efccc78fd36';
export const DEFAULT_DOMAIN = 'factory-wager.com';

interface CloudflareConfig {
  zoneId: string;
  accountId: string;
  apiToken: string;
  domain?: string;
}

interface DNSRecord {
  id: string;
  type: string;
  name: string;
  content: string;
  ttl: number;
  proxied: boolean;
  created_on: string;
  modified_on: string;
}

interface DNSRecordInput {
  type: 'A' | 'AAAA' | 'CNAME' | 'TXT' | 'MX' | 'NS' | 'SRV';
  name: string;
  content: string;
  ttl?: number;
  proxied?: boolean;
  priority?: number;
}

interface ZoneInfo {
  id: string;
  name: string;
  status: string;
  paused: boolean;
  type: string;
  development_mode: number;
  name_servers: string[];
  original_name_servers: string[];
  modified_on: string;
}

interface SSLStatus {
  id: string;
  status: string;
  validation_method: string;
  certificate_authority: string;
  hosts: string[];
  certificates: Array<{
    id: string;
    hosts: string[];
    issuer: string;
    signature: string;
    status: string;
    expires_on: string;
  }>;
}

interface CachePurgeResult {
  id: string;
}

interface CloudflareResponse<T> {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  messages: string[];
  result: T;
  result_info?: {
    page: number;
    per_page: number;
    total_count: number;
    total_pages: number;
  };
}

/**
 * Cloudflare API Client
 */
export class CloudflareClient {
  private config: CloudflareConfig;

  constructor(config?: Partial<CloudflareConfig>) {
    const apiToken = config?.apiToken || process.env.CF_API_TOKEN;

    if (!apiToken) {
      throw new Error(
        'CF_API_TOKEN is required. Get your token at https://dash.cloudflare.com/profile/api-tokens'
      );
    }

    this.config = {
      zoneId: config?.zoneId || process.env.CF_ZONE_ID || DEFAULT_ZONE_ID,
      accountId: config?.accountId || process.env.CF_ACCOUNT_ID || DEFAULT_ACCOUNT_ID,
      apiToken,
      domain: config?.domain || process.env.CF_DOMAIN || DEFAULT_DOMAIN,
    };
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<CloudflareResponse<T>> {
    const url = `${CF_API_BASE}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.config.apiToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json() as CloudflareResponse<T>;

    if (!data.success) {
      const errorMsg = data.errors.map(e => `${e.code}: ${e.message}`).join(', ');
      throw new Error(`Cloudflare API Error: ${errorMsg}`);
    }

    return data;
  }

  // ═══════════════════════════════════════════════════════════
  // ZONE MANAGEMENT
  // ═══════════════════════════════════════════════════════════

  /**
   * Get zone details
   */
  async getZone(): Promise<ZoneInfo> {
    const response = await this.request<ZoneInfo>(`/zones/${this.config.zoneId}`);
    return response.result;
  }

  /**
   * List all zones in account
   */
  async listZones(): Promise<ZoneInfo[]> {
    const response = await this.request<ZoneInfo[]>(
      `/zones?account.id=${this.config.accountId}`
    );
    return response.result;
  }

  // ═══════════════════════════════════════════════════════════
  // DNS RECORDS
  // ═══════════════════════════════════════════════════════════

  /**
   * List all DNS records for zone
   */
  async listDNSRecords(type?: string): Promise<DNSRecord[]> {
    let endpoint = `/zones/${this.config.zoneId}/dns_records?per_page=100`;
    if (type) {
      endpoint += `&type=${type}`;
    }
    const response = await this.request<DNSRecord[]>(endpoint);
    return response.result;
  }

  /**
   * Get single DNS record
   */
  async getDNSRecord(recordId: string): Promise<DNSRecord> {
    const response = await this.request<DNSRecord>(
      `/zones/${this.config.zoneId}/dns_records/${recordId}`
    );
    return response.result;
  }

  /**
   * Create DNS record
   */
  async createDNSRecord(record: DNSRecordInput): Promise<DNSRecord> {
    const response = await this.request<DNSRecord>(
      `/zones/${this.config.zoneId}/dns_records`,
      {
        method: 'POST',
        body: JSON.stringify({
          type: record.type,
          name: record.name,
          content: record.content,
          ttl: record.ttl || 1, // 1 = auto
          proxied: record.proxied ?? true,
          priority: record.priority,
        }),
      }
    );
    return response.result;
  }

  /**
   * Update DNS record
   */
  async updateDNSRecord(recordId: string, record: DNSRecordInput): Promise<DNSRecord> {
    const response = await this.request<DNSRecord>(
      `/zones/${this.config.zoneId}/dns_records/${recordId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          type: record.type,
          name: record.name,
          content: record.content,
          ttl: record.ttl || 1,
          proxied: record.proxied ?? true,
          priority: record.priority,
        }),
      }
    );
    return response.result;
  }

  /**
   * Delete DNS record
   */
  async deleteDNSRecord(recordId: string): Promise<void> {
    await this.request(`/zones/${this.config.zoneId}/dns_records/${recordId}`, {
      method: 'DELETE',
    });
  }

  // ═══════════════════════════════════════════════════════════
  // CACHE MANAGEMENT
  // ═══════════════════════════════════════════════════════════

  /**
   * Purge specific files from cache
   */
  async purgeCache(files: string[]): Promise<CachePurgeResult> {
    const response = await this.request<CachePurgeResult>(
      `/zones/${this.config.zoneId}/purge_cache`,
      {
        method: 'POST',
        body: JSON.stringify({ files }),
      }
    );
    return response.result;
  }

  /**
   * Purge all cached content
   */
  async purgeEverything(): Promise<CachePurgeResult> {
    const response = await this.request<CachePurgeResult>(
      `/zones/${this.config.zoneId}/purge_cache`,
      {
        method: 'POST',
        body: JSON.stringify({ purge_everything: true }),
      }
    );
    return response.result;
  }

  /**
   * Purge cache by tags (Enterprise only)
   */
  async purgeCacheByTags(tags: string[]): Promise<CachePurgeResult> {
    const response = await this.request<CachePurgeResult>(
      `/zones/${this.config.zoneId}/purge_cache`,
      {
        method: 'POST',
        body: JSON.stringify({ tags }),
      }
    );
    return response.result;
  }

  /**
   * Purge cache by prefixes
   */
  async purgeCacheByPrefixes(prefixes: string[]): Promise<CachePurgeResult> {
    const response = await this.request<CachePurgeResult>(
      `/zones/${this.config.zoneId}/purge_cache`,
      {
        method: 'POST',
        body: JSON.stringify({ prefixes }),
      }
    );
    return response.result;
  }

  // ═══════════════════════════════════════════════════════════
  // SSL/TLS
  // ═══════════════════════════════════════════════════════════

  /**
   * Get SSL verification status
   */
  async getSSLVerification(): Promise<SSLStatus[]> {
    const response = await this.request<SSLStatus[]>(
      `/zones/${this.config.zoneId}/ssl/verification`
    );
    return response.result;
  }

  /**
   * Get SSL settings
   */
  async getSSLSettings(): Promise<{ value: string }> {
    const response = await this.request<{ value: string }>(
      `/zones/${this.config.zoneId}/settings/ssl`
    );
    return response.result;
  }

  /**
   * Update SSL mode (off, flexible, full, strict)
   */
  async setSSLMode(mode: 'off' | 'flexible' | 'full' | 'strict'): Promise<void> {
    await this.request(`/zones/${this.config.zoneId}/settings/ssl`, {
      method: 'PATCH',
      body: JSON.stringify({ value: mode }),
    });
  }

  /**
   * Get SSL certificate packs (works with SSL:Edit permission)
   */
  async getSSLCertificatePacks(): Promise<any[]> {
    const response = await this.request<any[]>(
      `/zones/${this.config.zoneId}/ssl/certificate_packs`
    );
    return response.result;
  }

  // ═══════════════════════════════════════════════════════════
  // ANALYTICS
  // ═══════════════════════════════════════════════════════════

  /**
   * Get zone analytics
   */
  async getAnalytics(since?: string, until?: string): Promise<any> {
    let endpoint = `/zones/${this.config.zoneId}/analytics/dashboard`;
    const params = new URLSearchParams();
    if (since) params.append('since', since);
    if (until) params.append('until', until);
    if (params.toString()) endpoint += `?${params}`;

    const response = await this.request<any>(endpoint);
    return response.result;
  }

  // ═══════════════════════════════════════════════════════════
  // R2 BUCKET OPERATIONS
  // ═══════════════════════════════════════════════════════════

  /**
   * List R2 buckets
   */
  async listR2Buckets(): Promise<any[]> {
    const response = await this.request<any[]>(
      `/accounts/${this.config.accountId}/r2/buckets`
    );
    return response.result;
  }

  /**
   * Get R2 bucket details
   */
  async getR2Bucket(bucketName: string): Promise<any> {
    const response = await this.request<any>(
      `/accounts/${this.config.accountId}/r2/buckets/${bucketName}`
    );
    return response.result;
  }

  // ═══════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════

  /**
   * Validate DNS propagation
   */
  async validateDNS(subdomain: string, expectedContent?: string): Promise<{
    valid: boolean;
    record?: DNSRecord;
    message: string;
  }> {
    const records = await this.listDNSRecords();
    const fullName = subdomain.includes('.')
      ? subdomain
      : `${subdomain}.${this.config.domain}`;

    const record = records.find(r => r.name === fullName);

    if (!record) {
      return {
        valid: false,
        message: `DNS record not found for ${fullName}`,
      };
    }

    if (expectedContent && record.content !== expectedContent) {
      return {
        valid: false,
        record,
        message: `DNS content mismatch. Expected: ${expectedContent}, Got: ${record.content}`,
      };
    }

    return {
      valid: true,
      record,
      message: `DNS record validated: ${record.name} -> ${record.content}`,
    };
  }

  /**
   * Get dashboard URL for zone
   */
  getDashboardUrl(): string {
    return `https://dash.cloudflare.com/${this.config.accountId}/${this.config.domain}`;
  }
}

// ═══════════════════════════════════════════════════════════
// CLI INTERFACE
// ═══════════════════════════════════════════════════════════

async function main() {
  const command = process.argv[2];

  // Check for API token
  if (!process.env.CF_API_TOKEN && command !== '--help') {
    console.log('⚠️  CF_API_TOKEN environment variable is required');
    console.log(`   Get your token: ${urlLink('https://dash.cloudflare.com/profile/api-tokens', 'Cloudflare API Tokens')}`);
    console.log('\n   Example: CF_API_TOKEN=your_token bun run cf:zones');
    process.exit(1);
  }

  try {
    const client = command !== '--help' ? new CloudflareClient() : null;

    switch (command) {
      case '--zones':
      case 'zones':
        console.log('☁️  Cloudflare Zones');
        console.log('═'.repeat(60));
        const zones = await client!.listZones();
        for (const zone of zones) {
          const status = zone.status === 'active' ? '🟢' : '🟡';
          console.log(`${status} ${zone.name} (${zone.id.slice(0, 8)}...)`);
          console.log(`   Status: ${zone.status} | Type: ${zone.type}`);
          console.log(`   Nameservers: ${zone.name_servers.join(', ')}`);
        }
        break;

      case '--dns':
      case 'dns':
        console.log('🌐 DNS Records');
        console.log('═'.repeat(70));
        const records = await client!.listDNSRecords();
        console.log(`| ${'Type'.padEnd(6)} | ${'Name'.padEnd(30)} | ${'Content'.padEnd(25)} |`);
        console.log(`|${'-'.repeat(8)}|${'-'.repeat(32)}|${'-'.repeat(27)}|`);
        for (const record of records) {
          const name = record.name.length > 30
            ? record.name.slice(0, 27) + '...'
            : record.name;
          const content = record.content.length > 25
            ? record.content.slice(0, 22) + '...'
            : record.content;
          const proxied = record.proxied ? '🟠' : '⚪';
          console.log(`| ${proxied} ${record.type.padEnd(4)} | ${name.padEnd(30)} | ${content.padEnd(25)} |`);
        }
        console.log('═'.repeat(70));
        console.log(`Total: ${records.length} records | 🟠 = Proxied | ⚪ = DNS Only`);
        break;

      case '--ssl':
      case 'ssl':
        console.log('🔐 SSL/TLS Status');
        console.log('═'.repeat(50));
        // Use SSL-specific token if available
        const sslToken = process.env.CF_SSL_TOKEN;
        const sslClient = sslToken ? new CloudflareClient({ apiToken: sslToken }) : client!;
        try {
          // Try certificate_packs first (SSL:Edit permission)
          const certPacks = await sslClient.getSSLCertificatePacks();
          console.log(`Certificate Packs: ${certPacks.length}`);
          for (const pack of certPacks) {
            console.log(`\n  ${pack.status === 'active' ? '✅' : '⏳'} ${pack.type.toUpperCase()}`);
            console.log(`     Hosts: ${pack.hosts?.join(', ') || 'N/A'}`);
            if (pack.certificates) {
              for (const c of pack.certificates) {
                console.log(`     Issuer: ${c.issuer} | Expires: ${c.expires_on?.slice(0, 10)}`);
                console.log(`     Status: ${c.status} | Signature: ${c.signature}`);
              }
            }
          }
          // Also try SSL settings (may fail without Zone Settings:Read)
          try {
            const sslSettings = await sslClient.getSSLSettings();
            console.log(`\nSSL Mode: ${sslSettings.value.toUpperCase()}`);
          } catch {
            // Settings require Zone Settings permission
          }
        } catch (err) {
          console.log(`❌ SSL Error: ${(err as Error).message}`);
          console.log(`   Hint: Set CF_SSL_TOKEN with SSL:Edit permission`);
        }
        break;

      case '--r2':
      case 'r2':
        console.log('📦 R2 Storage Status');
        console.log('═'.repeat(50));
        // Test R2 via S3-compatible API (Bun.s3)
        const s3 = Bun.s3;
        const bucket = process.env.R2_BUCKET || process.env.S3_BUCKET || 'factory-wager-packages';
        const testKey = `.test-connection-${Date.now()}`;
        try {
          const file = s3.file(testKey);
          await file.write('R2 connection test');
          await file.delete();
          console.log(`✅ R2 S3-Compatible API: Connected`);
          console.log(`   Bucket: ${bucket}`);
          console.log(`   Endpoint: ${process.env.R2_ENDPOINT || process.env.S3_ENDPOINT}`);
          console.log(`   Status: Healthy`);
        } catch (err) {
          console.log(`❌ R2 Error: ${(err as Error).message}`);
        }
        // Also try Cloudflare R2 API if token available
        try {
          const buckets = await client!.listR2Buckets();
          const bucketList = Array.isArray(buckets) ? buckets : (buckets as any)?.buckets || [];
          if (bucketList.length > 0) {
            console.log(`\n📦 Cloudflare R2 API Buckets:`);
            for (const b of bucketList) {
              console.log(`   📦 ${b.name}`);
            }
          }
        } catch {
          // CF API not available, S3-compatible still works
        }
        break;

      case '--validate':
      case 'validate':
        const subdomain = process.argv[3];
        if (!subdomain) {
          console.log('Usage: bun run cf:dns:validate <subdomain>');
          process.exit(1);
        }
        console.log(`🔍 Validating DNS for: ${subdomain}`);
        const validation = await client!.validateDNS(subdomain);
        console.log(validation.valid ? '✅' : '❌', validation.message);
        if (validation.record) {
          console.log(`   Type: ${validation.record.type}`);
          console.log(`   Content: ${validation.record.content}`);
          console.log(`   Proxied: ${validation.record.proxied}`);
        }
        break;

      case '--help':
      default:
        console.log(`
☁️  Cloudflare API Client v4.6

Bun-native client for Cloudflare DNS, R2, and CDN management.
Zone: ${DEFAULT_DOMAIN} (${DEFAULT_ZONE_ID.slice(0, 8)}...)

Usage:
  bun run scripts/cloudflare-api.ts --zones         # List all zones
  bun run scripts/cloudflare-api.ts --dns           # List DNS records
  bun run scripts/cloudflare-api.ts --ssl           # Show SSL status
  bun run scripts/cloudflare-api.ts --r2            # List R2 buckets
  bun run scripts/cloudflare-api.ts --validate api  # Validate DNS record

npm scripts:
  bun run cf:zones                                  # List zones
  bun run cf:dns:list                               # List DNS records
  bun run cf:dns:validate <subdomain>               # Validate DNS
  bun run cf:ssl:status                             # SSL status
  bun run r2:status                                 # R2 buckets

Environment:
  CF_API_TOKEN   - Cloudflare API Token (required)
  CF_ZONE_ID     - Zone ID (default: ${DEFAULT_ZONE_ID})
  CF_ACCOUNT_ID  - Account ID (default: ${DEFAULT_ACCOUNT_ID})
  CF_DOMAIN      - Domain (default: ${DEFAULT_DOMAIN})

Dashboard: ${urlLink(`https://dash.cloudflare.com/${DEFAULT_ACCOUNT_ID}/${DEFAULT_DOMAIN}`, 'Open Cloudflare Dashboard')}
        `);
    }
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
    process.exit(1);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}
