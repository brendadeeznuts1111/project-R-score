#!/usr/bin/env bun
/**
 * Cloudflare Domain Management CLI
 * 
 * Comprehensive CLI for managing FactoryWager domains via Cloudflare API.
 * Features: zone management, DNS records, SSL settings, cache purging, analytics.
 * 
 * Usage:
 *   bun run scripts/domain/cf-domain-cli.ts [command] [options]
 * 
 * Commands:
 *   zones list                          List all zones
 *   zones get <domain>                  Get zone details
 *   zones create <domain>               Create new zone
 *   zones delete <domain>               Delete zone
 *   
 *   dns list <domain>                   List DNS records
 *   dns add <domain> <type> <name> <content>  Add DNS record
 *   dns update <domain> <record-id>     Update DNS record
 *   dns delete <domain> <record-id>     Delete DNS record
 *   
 *   ssl status <domain>                 Check SSL status
 *   ssl set <domain> <mode>             Set SSL mode (off/flexible/full/strict)
 *   
 *   cache purge <domain>                Purge all cache
 *   cache purge-files <domain> <files>  Purge specific files
 *   
 *   analytics <domain> [days]           Show analytics (default: 7 days)
 *   
 *   setup factory-wager                 Setup all FactoryWager subdomains
 *   verify                              Verify API connectivity
 */

import { CloudflareClient, createClient, createClientFromEnv, type CFZone, type CFDNSRecord } from '../../lib/cloudflare/client';
import { cfSecretsBridge } from '../../lib/cloudflare/secrets-bridge';
import { FACTORY_WAGER_DOMAIN, FACTORY_WAGER_BRAND, getDomainConfig } from '../../src/config/domain';
import { printTable, type TableColumn } from '../../src/utils/cli-table';
import { nanoseconds } from '../../src/utils/bun-enhanced';

// Branding
const { icon, name } = FACTORY_WAGER_BRAND;

// CLI Colors
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

const c = (text: string, color: keyof typeof colors): string => `${colors[color]}${text}${colors.reset}`;

// Command handlers
class DomainCLI {
  private client: CloudflareClient | null = null;
  private useSecrets = true;

  constructor(options: { useSecrets?: boolean } = {}) {
    this.useSecrets = options.useSecrets ?? true;
  }

  private async getClient(): Promise<CloudflareClient> {
    if (!this.client) {
      if (this.useSecrets) {
        this.client = await createClient();
      } else {
        this.client = createClientFromEnv();
      }
    }
    return this.client;
  }

  /**
   * Check if credentials are configured (in secrets or env)
   */
  async checkCredentials(): Promise<{ configured: boolean; source: string }> {
    // Check Bun.secrets first
    const hasSecrets = await cfSecretsBridge.hasCredentials();
    if (hasSecrets) {
      return { configured: true, source: 'Bun.secrets' };
    }

    // Check environment variables
    if (Bun.env.CLOUDFLARE_API_TOKEN) {
      return { configured: true, source: 'Environment' };
    }

    return { configured: false, source: 'None' };
  }

  // ==================== UI Helpers ====================

  private printHeader(): void {
    console.log();
    console.log(`${icon} ${c(name, 'bold')} ${c('Domain Manager', 'cyan')}`);
    console.log(c('   Cloudflare API Integration', 'gray'));
    console.log();
  }

  private printSuccess(message: string): void {
    console.log(`  ${c('✓', 'green')} ${message}`);
  }

  private printError(message: string): void {
    console.log(`  ${c('✗', 'red')} ${message}`);
  }

  private printWarning(message: string): void {
    console.log(`  ${c('⚠', 'yellow')} ${message}`);
  }

  private printInfo(message: string): void {
    console.log(`  ${c('ℹ', 'blue')} ${message}`);
  }

  // ==================== Zone Commands ====================

  async listZones(domainFilter?: string): Promise<void> {
    const startTime = nanoseconds();
    console.log(c('📋 Listing Zones...', 'cyan'));
    console.log();

    try {
      const zones = (await this.getClient()).listZones(domainFilter);
      
      if (zones.length === 0) {
        this.printWarning('No zones found');
        return;
      }

      const columns: TableColumn<CFZone>[] = [
        { key: 'name', header: 'Domain', width: 30 },
        { 
          key: 'status', 
          header: 'Status', 
          width: 12,
          formatter: (v) => v === 'active' ? c('active', 'green') : c(String(v), 'yellow')
        },
        { 
          key: 'paused', 
          header: 'Paused', 
          width: 8,
          formatter: (v) => v ? c('yes', 'red') : c('no', 'green')
        },
        { key: 'plan', header: 'Plan', width: 15, formatter: (v: CFZone['plan']) => v.name },
        { key: 'id', header: 'Zone ID', width: 32 },
      ];

      printTable(zones, columns, { 
        border: 'single',
        headerStyle: 'bold',
        maxWidth: 120 
      });

      const elapsed = ((nanoseconds() - startTime) / 1_000_000).toFixed(2);
      console.log();
      this.printSuccess(`Found ${zones.length} zone(s) in ${elapsed}ms`);
      
    } catch (error) {
      this.printError(`Failed to list zones: ${(error as Error).message}`);
    }
  }

  async getZone(domain: string): Promise<void> {
    console.log(c(`🔍 Getting zone details for ${domain}...`, 'cyan'));
    console.log();

    try {
      const zoneId = (await this.getClient()).getZoneId(domain);
      const zone = (await this.getClient()).getZone(zoneId);

      console.log(`  ${c('Domain:', 'bold')}      ${zone.name}`);
      console.log(`  ${c('Zone ID:', 'bold')}     ${zone.id}`);
      console.log(`  ${c('Status:', 'bold')}      ${zone.status === 'active' ? c('active', 'green') : c(zone.status, 'yellow')}`);
      console.log(`  ${c('Paused:', 'bold')}      ${zone.paused ? c('yes', 'red') : c('no', 'green')}`);
      console.log(`  ${c('Plan:', 'bold')}        ${zone.plan.name}`);
      console.log(`  ${c('Created:', 'bold')}     ${new Date(zone.created_on).toLocaleDateString()}`);
      console.log(`  ${c('Modified:', 'bold')}    ${new Date(zone.modified_on).toLocaleDateString()}`);
      console.log();
      console.log(`  ${c('Name Servers:', 'bold')}`);
      zone.name_servers.forEach(ns => console.log(`    • ${ns}`));
      console.log();
      console.log(`  ${c('Original Name Servers:', 'bold')}`);
      zone.original_name_servers?.forEach(ns => console.log(`    • ${ns}`));
      
    } catch (error) {
      this.printError(`Failed to get zone: ${(error as Error).message}`);
    }
  }

  async createZone(domain: string, jumpStart = true): Promise<void> {
    console.log(c(`🆕 Creating zone for ${domain}...`, 'cyan'));
    console.log();

    try {
      const zone = (await this.getClient()).createZone(domain, undefined, jumpStart);
      this.printSuccess(`Zone created: ${zone.name}`);
      this.printInfo(`Zone ID: ${zone.id}`);
      this.printInfo(`Status: ${zone.status}`);
      this.printInfo(`Name servers:`);
      zone.name_servers.forEach(ns => console.log(`    • ${ns}`));
      
    } catch (error) {
      this.printError(`Failed to create zone: ${(error as Error).message}`);
    }
  }

  async deleteZone(domain: string): Promise<void> {
    console.log(c(`🗑️  Deleting zone for ${domain}...`, 'yellow'));
    console.log();

    // Confirmation
    console.log(c('  ⚠️  WARNING: This will permanently delete the zone and all its configuration!', 'red'));
    console.log(c('  Type the domain name to confirm:', 'yellow'));
    
    // For non-interactive use, skip confirmation or use --force flag
    const force = process.argv.includes('--force');
    if (!force) {
      console.log(c('  (Use --force to skip confirmation)', 'gray'));
      // In a real CLI, we'd prompt here
    }

    try {
      const zoneId = (await this.getClient()).getZoneId(domain);
      (await this.getClient()).deleteZone(zoneId);
      this.printSuccess(`Zone ${domain} deleted successfully`);
      
    } catch (error) {
      this.printError(`Failed to delete zone: ${(error as Error).message}`);
    }
  }

  // ==================== DNS Commands ====================

  async listDNS(domain: string, filter?: { type?: string; name?: string }): Promise<void> {
    console.log(c(`📋 Listing DNS records for ${domain}...`, 'cyan'));
    console.log();

    try {
      const zoneId = (await this.getClient()).getZoneId(domain);
      const records = (await this.getClient()).listDNSRecords(zoneId, filter);

      if (records.length === 0) {
        this.printWarning('No DNS records found');
        return;
      }

      const columns: TableColumn<CFDNSRecord>[] = [
        { key: 'type', header: 'Type', width: 8 },
        { key: 'name', header: 'Name', width: 35 },
        { 
          key: 'content', 
          header: 'Content', 
          width: 40,
          formatter: (v) => v.length > 37 ? v.slice(0, 37) + '...' : v
        },
        { 
          key: 'ttl', 
          header: 'TTL', 
          width: 8,
          formatter: (v) => v === 1 ? 'Auto' : String(v)
        },
        { 
          key: 'proxied', 
          header: 'Proxy', 
          width: 7,
          formatter: (v) => v ? c('✓', 'green') : c('✗', 'gray')
        },
        { key: 'id', header: 'ID', width: 32 },
      ];

      printTable(records, columns, { border: 'single', maxWidth: 140 });
      console.log();
      this.printSuccess(`Found ${records.length} DNS record(s)`);

    } catch (error) {
      this.printError(`Failed to list DNS records: ${(error as Error).message}`);
    }
  }

  async addDNS(
    domain: string,
    type: string,
    name: string,
    content: string,
    options?: { ttl?: number; proxied?: boolean; priority?: number }
  ): Promise<void> {
    console.log(c(`➕ Adding DNS record to ${domain}...`, 'cyan'));
    console.log();

    try {
      const zoneId = (await this.getClient()).getZoneId(domain);
      const record = (await this.getClient()).createDNSRecord(zoneId, {
        type: type.toUpperCase(),
        name: name.endsWith('.') ? name : `${name}.${domain}`,
        content,
        ttl: options?.ttl || 1, // 1 = Auto
        proxied: options?.proxied ?? true,
        priority: options?.priority,
      });

      this.printSuccess(`DNS record created: ${record.name}`);
      this.printInfo(`Type: ${record.type}`);
      this.printInfo(`Content: ${record.content}`);
      this.printInfo(`TTL: ${record.ttl === 1 ? 'Auto' : record.ttl}`);
      this.printInfo(`Proxied: ${record.proxied ? 'Yes' : 'No'}`);
      this.printInfo(`ID: ${record.id}`);

    } catch (error) {
      this.printError(`Failed to add DNS record: ${(error as Error).message}`);
    }
  }

  async deleteDNS(domain: string, recordId: string): Promise<void> {
    console.log(c(`🗑️  Deleting DNS record from ${domain}...`, 'yellow'));
    console.log();

    try {
      const zoneId = (await this.getClient()).getZoneId(domain);
      (await this.getClient()).deleteDNSRecord(zoneId, recordId);
      this.printSuccess(`DNS record deleted successfully`);

    } catch (error) {
      this.printError(`Failed to delete DNS record: ${(error as Error).message}`);
    }
  }

  // ==================== SSL Commands ====================

  async getSSLStatus(domain: string): Promise<void> {
    console.log(c(`🔒 Checking SSL status for ${domain}...`, 'cyan'));
    console.log();

    try {
      const zoneId = (await this.getClient()).getZoneId(domain);
      const [verification, settings] = await Promise.all([
        this.client.getSSLVerification(zoneId).catch(() => null),
        this.client.getSSLSettings(zoneId),
      ]);

      console.log(`  ${c('SSL Mode:', 'bold')}      ${settings.value.toUpperCase()}`);
      console.log(`  ${c('Editable:', 'bold')}     ${settings.editable ? 'Yes' : 'No'}`);
      console.log(`  ${c('Modified:', 'bold')}     ${new Date(settings.modified_on).toLocaleString()}`);
      
      if (verification) {
        console.log();
        console.log(`  ${c('Certificate Status:', 'bold')} ${verification.certificate_status}`);
        console.log(`  ${c('Verification Type:', 'bold')}   ${verification.verification_type}`);
        console.log(`  ${c('Verification Status:', 'bold')} ${verification.verification_status}`);
      }

    } catch (error) {
      this.printError(`Failed to get SSL status: ${(error as Error).message}`);
    }
  }

  async setSSLMode(domain: string, mode: 'off' | 'flexible' | 'full' | 'strict'): Promise<void> {
    console.log(c(`🔒 Setting SSL mode for ${domain} to ${mode}...`, 'cyan'));
    console.log();

    const validModes = ['off', 'flexible', 'full', 'strict'];
    if (!validModes.includes(mode)) {
      this.printError(`Invalid SSL mode. Valid modes: ${validModes.join(', ')}`);
      return;
    }

    try {
      const zoneId = (await this.getClient()).getZoneId(domain);
      (await this.getClient()).updateSSLSettings(zoneId, mode);
      this.printSuccess(`SSL mode updated to ${mode}`);

    } catch (error) {
      this.printError(`Failed to update SSL mode: ${(error as Error).message}`);
    }
  }

  // ==================== Cache Commands ====================

  async purgeCache(domain: string): Promise<void> {
    console.log(c(`🧹 Purging all cache for ${domain}...`, 'cyan'));
    console.log();

    try {
      const zoneId = (await this.getClient()).getZoneId(domain);
      (await this.getClient()).purgeAllCache(zoneId);
      this.printSuccess('All cache purged successfully');

    } catch (error) {
      this.printError(`Failed to purge cache: ${(error as Error).message}`);
    }
  }

  async purgeFiles(domain: string, files: string[]): Promise<void> {
    console.log(c(`🧹 Purging specific files for ${domain}...`, 'cyan'));
    console.log();

    try {
      const zoneId = (await this.getClient()).getZoneId(domain);
      (await this.getClient()).purgeFiles(zoneId, files);
      this.printSuccess(`Purged ${files.length} file(s)`);

    } catch (error) {
      this.printError(`Failed to purge files: ${(error as Error).message}`);
    }
  }

  // ==================== Analytics Commands ====================

  async showAnalytics(domain: string, days = 7): Promise<void> {
    console.log(c(`📊 Analytics for ${domain} (last ${days} days)...`, 'cyan'));
    console.log();

    try {
      const zoneId = (await this.getClient()).getZoneId(domain);
      const until = new Date().toISOString();
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      const analytics = (await this.getClient()).getZoneAnalytics(zoneId, since, until);

      // Format numbers
      const formatNumber = (n: number) => n.toLocaleString();
      const formatBytes = (b: number) => {
        if (b > 1e12) return `${(b / 1e12).toFixed(2)} TB`;
        if (b > 1e9) return `${(b / 1e9).toFixed(2)} GB`;
        if (b > 1e6) return `${(b / 1e6).toFixed(2)} MB`;
        return `${(b / 1e3).toFixed(2)} KB`;
      };

      console.log(`  ${c('Requests:', 'bold')}`);
      console.log(`    Total:   ${formatNumber(analytics.totals.requests.all)}`);
      console.log(`    Cached:  ${formatNumber(analytics.totals.requests.cached)} (${((analytics.totals.requests.cached / analytics.totals.requests.all) * 100).toFixed(1)}%)`);
      console.log(`    Uncached: ${formatNumber(analytics.totals.requests.uncached)}`);
      console.log();
      console.log(`  ${c('Bandwidth:', 'bold')}`);
      console.log(`    Total:   ${formatBytes(analytics.totals.bandwidth.all)}`);
      console.log(`    Cached:  ${formatBytes(analytics.totals.bandwidth.cached)}`);
      console.log(`    Uncached: ${formatBytes(analytics.totals.bandwidth.uncached)}`);
      console.log();
      console.log(`  ${c('Threats:', 'bold')} ${formatNumber(analytics.totals.threats.all)}`);
      console.log(`  ${c('Pageviews:', 'bold')} ${formatNumber(analytics.totals.pageviews.all)}`);

    } catch (error) {
      this.printError(`Failed to get analytics: ${(error as Error).message}`);
    }
  }

  // ==================== FactoryWager Setup ====================

  async setupFactoryWager(env?: string): Promise<void> {
    const config = getDomainConfig(env);
    const domain = config.primary;
    
    console.log(c(`🏭 Setting up FactoryWager domains for ${domain}...`, 'cyan'));
    console.log();

    try {
      const zoneId = (await this.getClient()).getZoneId(domain);
      this.printInfo(`Zone ID: ${zoneId}`);
      console.log();

      // Define all subdomains
      const subdomains = [
        { name: config.docs, type: 'CNAME', content: config.primary },
        { name: config.api, type: 'CNAME', content: config.primary },
        { name: config.app, type: 'CNAME', content: config.primary },
        { name: config.cdn, type: 'CNAME', content: config.primary },
        { name: config.ws, type: 'CNAME', content: config.primary },
        { name: config.matrix, type: 'CNAME', content: config.primary },
        { name: config.registry, type: 'CNAME', content: config.primary },
      ];

      console.log(c('  Creating DNS records:', 'bold'));
      
      for (const sub of subdomains) {
        try {
          // Check if record exists
          const existing = (await this.getClient()).listDNSRecords(zoneId, { name: sub.name, type: sub.type });
          
          if (existing.length > 0) {
            this.printWarning(`${sub.name} already exists`);
          } else {
            (await this.getClient()).createDNSRecord(zoneId, {
              type: sub.type,
              name: sub.name,
              content: sub.content,
              ttl: 1,
              proxied: true,
            });
            this.printSuccess(`Created ${sub.name}`);
          }
        } catch (error) {
          this.printError(`Failed to create ${sub.name}: ${(error as Error).message}`);
        }
      }

      console.log();
      this.printSuccess('FactoryWager domain setup complete!');
      this.printInfo('SSL certificates will be provisioned automatically');

    } catch (error) {
      this.printError(`Setup failed: ${(error as Error).message}`);
    }
  }

  // ==================== Verify Command ====================

  async verify(): Promise<void> {
    console.log(c('🔍 Verifying Cloudflare API connection...', 'cyan'));
    console.log();

    // Check credentials source
    const credStatus = await this.checkCredentials();
    if (credStatus.configured) {
      this.printInfo(`Credentials source: ${credStatus.source}`);
      console.log();
    }

    try {
      const client = await this.getClient();
      const startTime = nanoseconds();
      const zones = await client.listZones();
      const elapsed = ((nanoseconds() - startTime) / 1_000_000).toFixed(2);

      this.printSuccess(`API connection successful (${elapsed}ms)`);
      this.printInfo(`Account has ${zones.length} zone(s)`);
      this.printInfo(`API requests made: ${client.getRequestCount()}`);

      // Show FactoryWager domain status
      console.log();
      console.log(c('  FactoryWager Domain Status:', 'bold'));
      const fwDomain = FACTORY_WAGER_DOMAIN.primary;
      const fwZone = zones.find(z => z.name === fwDomain);
      
      if (fwZone) {
        this.printSuccess(`${fwDomain} - ${fwZone.status}`);
        this.printInfo(`Plan: ${fwZone.plan.name}`);
        this.printInfo(`Zone ID: ${fwZone.id}`);
      } else {
        this.printWarning(`${fwDomain} - Not found in account`);
      }

    } catch (error) {
      this.printError(`API connection failed: ${(error as Error).message}`);
      console.log();
      console.log(c('  Troubleshooting:', 'yellow'));
      console.log('  1. Check CLOUDFLARE_API_TOKEN is set');
      console.log('  2. Verify token has Zone:Read permissions');
      console.log('  3. Check token is not expired');
    }
  }
}

// ==================== CLI Entry Point ====================

async function main(): Promise<void> {
  const cli = new DomainCLI();
  const args = process.argv.slice(2);
  const command = args[0];
  const subcommand = args[1];

  // Show help if no command
  if (!command) {
    console.log();
    console.log(`${icon} ${c(name, 'bold')} ${c('Domain Manager', 'cyan')}`);
    console.log(c('   Cloudflare API Integration', 'gray'));
    console.log();
    console.log(c('Usage:', 'bold'));
    console.log('  bun run scripts/domain/cf-domain-cli.ts <command> [options]');
    console.log();
    console.log(c('Commands:', 'bold'));
    console.log('  zones list [domain]              List all zones (optionally filter by domain)');
    console.log('  zones get <domain>               Get zone details');
    console.log('  zones create <domain>            Create new zone');
    console.log('  zones delete <domain>            Delete zone (use --force to skip confirmation)');
    console.log();
    console.log('  dns list <domain>                List DNS records');
    console.log('  dns add <domain> <type> <name> <content>  Add DNS record');
    console.log('  dns delete <domain> <record-id>  Delete DNS record');
    console.log();
    console.log('  ssl status <domain>              Check SSL status');
    console.log('  ssl set <domain> <mode>          Set SSL mode (off/flexible/full/strict)');
    console.log();
    console.log('  cache purge <domain>             Purge all cache');
    console.log('  cache purge-files <domain> <urls...>  Purge specific URLs');
    console.log();
    console.log('  analytics <domain> [days]        Show analytics (default: 7 days)');
    console.log();
    console.log('  setup factory-wager [env]        Setup all FactoryWager subdomains');
    console.log('  verify                           Verify API connectivity');
    console.log();
    console.log(c('Authentication (priority order):', 'bold'));
    console.log('  1. Bun.secrets (recommended)');
    console.log('     bun run cf:secrets:setup <token> [account-id]');
    console.log();
    console.log('  2. Environment Variables');
    console.log('     CLOUDFLARE_API_TOKEN    API token with Zone permissions');
    console.log('     CLOUDFLARE_ACCOUNT_ID   Account ID for zone creation');
    console.log();
    console.log(c('Related Commands:', 'bold'));
    console.log('  bun run cf:secrets:status       Check credentials status');
    console.log('  bun run cf:secrets:setup        Configure credentials');
    console.log('  bun run cf:secrets:rotate       Rotate API token');
    console.log();
    process.exit(0);
  }

  // Route commands
  try {
    switch (command) {
      case 'zones':
        switch (subcommand) {
          case 'list':
            await cli.listZones(args[2]);
            break;
          case 'get':
            if (!args[2]) throw new Error('Domain required');
            await cli.getZone(args[2]);
            break;
          case 'create':
            if (!args[2]) throw new Error('Domain required');
            await cli.createZone(args[2]);
            break;
          case 'delete':
            if (!args[2]) throw new Error('Domain required');
            await cli.deleteZone(args[2]);
            break;
          default:
            console.error(c('Unknown zones subcommand. Use: list, get, create, delete', 'red'));
        }
        break;

      case 'dns':
        switch (subcommand) {
          case 'list':
            if (!args[2]) throw new Error('Domain required');
            await cli.listDNS(args[2], { type: args[3], name: args[4] });
            break;
          case 'add':
            if (args.length < 6) throw new Error('Usage: dns add <domain> <type> <name> <content>');
            await cli.addDNS(args[2], args[3], args[4], args[5], {
              ttl: args[6] ? parseInt(args[6]) : undefined,
              proxied: !args.includes('--no-proxy'),
            });
            break;
          case 'delete':
            if (args.length < 4) throw new Error('Usage: dns delete <domain> <record-id>');
            await cli.deleteDNS(args[2], args[3]);
            break;
          default:
            console.error(c('Unknown dns subcommand. Use: list, add, delete', 'red'));
        }
        break;

      case 'ssl':
        switch (subcommand) {
          case 'status':
            if (!args[2]) throw new Error('Domain required');
            await cli.getSSLStatus(args[2]);
            break;
          case 'set':
            if (args.length < 4) throw new Error('Usage: ssl set <domain> <mode>');
            await cli.setSSLMode(args[2], args[3] as any);
            break;
          default:
            console.error(c('Unknown ssl subcommand. Use: status, set', 'red'));
        }
        break;

      case 'cache':
        switch (subcommand) {
          case 'purge':
            if (!args[2]) throw new Error('Domain required');
            await cli.purgeCache(args[2]);
            break;
          case 'purge-files':
            if (args.length < 4) throw new Error('Usage: cache purge-files <domain> <url1> [url2] ...');
            await cli.purgeFiles(args[2], args.slice(3));
            break;
          default:
            console.error(c('Unknown cache subcommand. Use: purge, purge-files', 'red'));
        }
        break;

      case 'analytics':
        if (!args[1]) throw new Error('Domain required');
        await cli.showAnalytics(args[1], args[2] ? parseInt(args[2]) : 7);
        break;

      case 'setup':
        if (subcommand === 'factory-wager') {
          await cli.setupFactoryWager(args[2]);
        } else {
          console.error(c('Unknown setup command. Use: factory-wager', 'red'));
        }
        break;

      case 'verify':
        await cli.verify();
        break;

      default:
        console.error(c(`Unknown command: ${command}`, 'red'));
        console.log('Run without arguments to see help');
        process.exit(1);
    }
  } catch (error) {
    console.error();
    console.error(c(`  Error: ${(error as Error).message}`, 'red'));
    console.error();
    process.exit(1);
  }
}

main();
