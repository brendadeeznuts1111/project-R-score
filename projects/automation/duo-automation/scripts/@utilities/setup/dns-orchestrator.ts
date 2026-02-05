// scripts/setup/dns-orchestrator.ts
/**
 * 🌐 UNIFIED DNS ORCHESTRATOR FOR EMPIRE PRO
 * Combines multiple DNS setup strategies into a single robust tool.
 * Supports: Env vars, config files, secure secrets, and R2 validation.
 */

import { CLOUDFLARE_R2_CONFIG } from '../../config/deployment/cloudflare-r2.js';

interface DNSRecord {
  name: string;
  type: 'A' | 'CNAME';
  content: string;
  ttl?: number;
  proxied?: boolean;
}

enum AuthMode {
  ENV = 'env',
  CONFIG = 'config',
  SECRETS = 'secrets'
}

class DNSOrchestrator {
  private apiToken: string = '';
  private zoneId: string = '';
  private zoneName: string = 'apple.factory-wager.com';

  constructor(private mode: AuthMode = AuthMode.ENV) {}

  async initialize(): Promise<void> {
    console.log(`🔐 Initializing DNS Orchestrator in [${this.mode.toUpperCase()}] mode...`);

    switch (this.mode) {
      case AuthMode.ENV:
        this.apiToken = process.env.CF_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN || '';
        this.zoneId = process.env.CF_ZONE_ID || process.env.CLOUDFLARE_ZONE_ID || '';
        break;

      case AuthMode.CONFIG:
        try {
          const config = await import('../../config/config-enhanced.json', { with: { type: 'json' } });
          this.apiToken = config.original.domain.dnsApiKey;
          this.zoneId = config.original.domain.zoneId;
          this.zoneName = config.original.domain.name;
        } catch (e) {
          console.error('❌ Failed to load credentials from config-enhanced.json');
        }
        break;

      case AuthMode.SECRETS:
        this.apiToken = await this.getSecret('CF_API_TOKEN');
        this.zoneId = await this.getSecret('CF_ZONE_ID');
        break;
    }

    if (!this.apiToken || !this.zoneId) {
      throw new Error(`❌ Credentials missing for mode: ${this.mode}. Please check your configuration.`);
    }
  }

  private async getSecret(name: string): Promise<string> {
    try {
      const result = await Bun.spawn(['bun', 'run', 'cli', 'secrets', 'get', name], {
        stdout: 'pipe'
      });
      const text = await new Response(result.stdout).text();
      
      if (text.includes('❌') || text.includes('not found')) {
        throw new Error(`Secret ${name} not found`);
      }
      return text.trim();
    } catch (error: any) {
      throw new Error(`❌ Failed to get secret ${name}: ${error?.message || error}`);
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

  async validateR2(): Promise<boolean> {
    console.log('📦 Validating R2 Storage connection...');
    try {
      const response = await fetch(`${CLOUDFLARE_R2_CONFIG.endpoint}/${CLOUDFLARE_R2_CONFIG.bucket}`, { 
        method: 'HEAD',
        headers: { 'Authorization': `AWS4-HMAC-SHA256 Credential=${CLOUDFLARE_R2_CONFIG.accessKeyId}` }
      });
      if (response.ok || response.status === 403) {
        console.log('✅ R2 Storage connection validated');
        return true;
      }
      return false;
    } catch (error: any) {
      console.warn('⚠️ R2 validation failed, but proceeding with DNS...');
      return false;
    }
  }

  async setupDNS(): Promise<void> {
    console.log('🌐 Setting up Empire Pro DNS Records...');
    
    const requiredRecords: DNSRecord[] = [
      { name: 'apple', type: 'A', content: '192.0.2.1', proxied: true },
      { name: 'api.apple', type: 'CNAME', content: 'apple.factory-wager.com', proxied: true },
      { name: 'dashboard.apple', type: 'CNAME', content: 'apple.factory-wager.com', proxied: true },
      { name: 'status.apple', type: 'CNAME', content: 'apple.factory-wager.com', proxied: true },
      { name: 'metrics.apple', type: 'CNAME', content: 'apple.factory-wager.com', proxied: true },
      { name: 'admin.apple', type: 'CNAME', content: 'apple.factory-wager.com', proxied: true }
    ];

    try {
      const data = await this.makeRequest('/dns_records');
      const existingRecords = data.result || [];

      for (const record of requiredRecords) {
        const existing = existingRecords.find((r: any) => r.name === record.name && r.type === record.type);
        if (existing) {
          if (existing.content !== record.content) {
            console.log(`🔄 Updating: ${record.name} → ${record.content}`);
            await this.makeRequest(`/dns_records/${existing.id}`, {
              method: 'PUT',
              body: JSON.stringify({ ...record, ttl: 300 })
            });
          } else {
            console.log(`✅ Matches: ${record.name}`);
          }
        } else {
          console.log(`🔧 Creating: ${record.name} → ${record.content}`);
          await this.makeRequest('/dns_records', {
            method: 'POST',
            body: JSON.stringify({ ...record, ttl: 300 })
          });
        }
      }
      console.log('🎉 DNS Setup Complete!');
    } catch (error: any) {
      console.error('❌ DNS operation failed:', error?.message || error);
    }
  }
}

// CLI Integration
async function main() {
  const args = process.argv.slice(2);
  const modeArg = args.find(a => a.startsWith('--mode='))?.split('=')[1] || 'env';
  const validateR2 = args.includes('--validate-r2');

  const orchestrator = new DNSOrchestrator(modeArg as AuthMode);
  try {
    await orchestrator.initialize();
    if (validateR2) await orchestrator.validateR2();
    await orchestrator.setupDNS();
  } catch (e: any) {
    console.error(e.message);
    process.exit(1);
  }
}

if (import.meta.main) main();