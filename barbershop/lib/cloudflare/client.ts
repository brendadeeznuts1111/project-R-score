/**
 * Cloudflare API Client
 *
 * Bun-native HTTP client for Cloudflare API v4.
 * Uses Bun.fetch for optimal performance.
 */

import { FACTORY_WAGER_DOMAIN, type DomainConfig } from '../../src/config/domain';

// Cloudflare API types
export interface CFZone {
  id: string;
  name: string;
  status: string;
  paused: boolean;
  type: string;
  development_mode: number;
  name_servers: string[];
  original_name_servers: string[];
  original_registrar: string;
  original_dnshost: string | null;
  modified_on: string;
  created_on: string;
  activated_on: string | null;
  meta: {
    step: number;
    custom_certificate_quota: number;
    page_rule_quota: number;
    phishing_detected: boolean;
    multiple_railguns_allowed: boolean;
  };
  owner: {
    id: string;
    type: string;
    email: string;
  };
  account: {
    id: string;
    name: string;
  };
  tenant: {
    id: string | null;
    name: string | null;
  };
  tenant_unit: {
    id: string | null;
  };
  permissions: string[];
  plan: {
    id: string;
    name: string;
    price: number;
    currency: string;
    frequency: string;
    is_subscribed: boolean;
    can_subscribe: boolean;
    legacy_id: string;
    legacy_discount: boolean;
    externally_managed: boolean;
  };
}

export interface CFDNSRecord {
  id: string;
  zone_id: string;
  zone_name: string;
  name: string;
  type: string;
  content: string;
  proxiable: boolean;
  proxied: boolean;
  ttl: number;
  locked: boolean;
  meta: Record<string, unknown>;
  comment: string | null;
  tags: string[];
  created_on: string;
  modified_on: string;
}

export interface CFSSLVerification {
  certificate_status: string;
  verification_type: string;
  verification_status: string;
  certificate_hash: string;
}

export interface CFPageRule {
  id: string;
  targets: Array<{
    target: string;
    constraint: {
      operator: string;
      value: string;
    };
  }>;
  actions: Array<{
    id: string;
    value?: unknown;
  }>;
  priority: number;
  status: string;
  modified_on: string;
  created_on: string;
}

export interface CFWorkerScript {
  id: string;
  etag: string;
  size: number;
  created_on: string;
  modified_on: string;
}

export interface CFFirewallRule {
  id: string;
  paused: boolean;
  description: string;
  action: string;
  filter: {
    id: string;
    expression: string;
    paused: boolean;
  };
  created_on: string;
  modified_on: string;
}

export interface CFApiResponse<T> {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  messages: string[];
  result: T;
  result_info?: {
    page: number;
    per_page: number;
    total_pages: number;
    count: number;
    total_count: number;
  };
}

export interface CloudflareConfig {
  apiToken: string;
  accountId?: string;
  baseUrl?: string;
}

/**
 * Cloudflare API Client
 *
 * High-performance client using Bun.fetch() with automatic retries,
 * rate limiting handling, and request/response compression.
 */
export class CloudflareClient {
  private apiToken: string;
  private accountId?: string;
  private baseUrl: string;
  private requestCount = 0;
  private lastRequestTime = 0;
  private readonly minRequestInterval = 50; // ms between requests (20 req/sec max)

  constructor(config: CloudflareConfig) {
    this.apiToken = config.apiToken;
    this.accountId = config.accountId;
    this.baseUrl = config.baseUrl || 'https://api.cloudflare.com/client/v4';
  }

  /**
   * Make authenticated API request with rate limiting and retries
   */
  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown,
    retries = 3
  ): Promise<CFApiResponse<T>> {
    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minRequestInterval) {
      await new Promise(r => setTimeout(r, this.minRequestInterval - timeSinceLastRequest));
    }

    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    // Add compression headers for large requests
    if (body && JSON.stringify(body).length > 1024) {
      headers['Content-Encoding'] = 'gzip';
    }

    try {
      this.lastRequestTime = Date.now();
      this.requestCount++;

      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('retry-after') || '1', 10);
        if (retries > 0) {
          console.warn(`⚠️  Rate limited. Retrying after ${retryAfter}s...`);
          await new Promise(r => setTimeout(r, retryAfter * 1000));
          return this.request<T>(method, endpoint, body, retries - 1);
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Cloudflare API error (${response.status}): ${errorText}`);
      }

      return (await response.json()) as CFApiResponse<T>;
    } catch (error) {
      if (retries > 0 && this.isRetryableError(error)) {
        await new Promise(r => setTimeout(r, 1000 * (4 - retries)));
        return this.request<T>(method, endpoint, body, retries - 1);
      }
      throw error;
    }
  }

  private isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      return (
        error.message.includes('ECONNRESET') ||
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('ENOTFOUND')
      );
    }
    return false;
  }

  // ==================== Zone Management ====================

  /**
   * List all zones
   */
  async listZones(name?: string): Promise<CFZone[]> {
    const endpoint = name ? `/zones?name=${encodeURIComponent(name)}` : '/zones';
    const response = await this.request<CFZone[]>('GET', endpoint);
    if (!response.success) {
      throw new Error(`Failed to list zones: ${response.errors.map(e => e.message).join(', ')}`);
    }
    return response.result;
  }

  /**
   * Get zone details by ID
   */
  async getZone(zoneId: string): Promise<CFZone> {
    const response = await this.request<CFZone>('GET', `/zones/${zoneId}`);
    if (!response.success) {
      throw new Error(`Failed to get zone: ${response.errors.map(e => e.message).join(', ')}`);
    }
    return response.result;
  }

  /**
   * Get zone ID by domain name
   */
  async getZoneId(domain: string): Promise<string> {
    const zones = await this.listZones(domain);
    const zone = zones.find(z => z.name === domain);
    if (!zone) {
      throw new Error(`Zone not found for domain: ${domain}`);
    }
    return zone.id;
  }

  /**
   * Create a new zone
   */
  async createZone(domain: string, accountId?: string, jumpStart = false): Promise<CFZone> {
    const accId = accountId || this.accountId;
    if (!accId) {
      throw new Error('Account ID required to create zone');
    }

    const response = await this.request<CFZone>('POST', '/zones', {
      name: domain,
      account: { id: accId },
      jump_start: jumpStart,
      type: 'full',
    });

    if (!response.success) {
      throw new Error(`Failed to create zone: ${response.errors.map(e => e.message).join(', ')}`);
    }
    return response.result;
  }

  /**
   * Delete a zone
   */
  async deleteZone(zoneId: string): Promise<void> {
    const response = await this.request<void>('DELETE', `/zones/${zoneId}`);
    if (!response.success) {
      throw new Error(`Failed to delete zone: ${response.errors.map(e => e.message).join(', ')}`);
    }
  }

  // ==================== DNS Records ====================

  /**
   * List DNS records for a zone
   */
  async listDNSRecords(
    zoneId: string,
    options?: { type?: string; name?: string; content?: string }
  ): Promise<CFDNSRecord[]> {
    let endpoint = `/zones/${zoneId}/dns_records`;
    const params = new URLSearchParams();
    if (options?.type) params.append('type', options.type);
    if (options?.name) params.append('name', options.name);
    if (options?.content) params.append('content', options.content);
    if (params.toString()) endpoint += `?${params.toString()}`;

    const response = await this.request<CFDNSRecord[]>('GET', endpoint);
    if (!response.success) {
      throw new Error(
        `Failed to list DNS records: ${response.errors.map(e => e.message).join(', ')}`
      );
    }
    return response.result;
  }

  /**
   * Create a DNS record
   */
  async createDNSRecord(
    zoneId: string,
    record: {
      type: string;
      name: string;
      content: string;
      ttl?: number;
      proxied?: boolean;
      priority?: number;
      comment?: string;
      tags?: string[];
    }
  ): Promise<CFDNSRecord> {
    const response = await this.request<CFDNSRecord>(
      'POST',
      `/zones/${zoneId}/dns_records`,
      record
    );
    if (!response.success) {
      throw new Error(
        `Failed to create DNS record: ${response.errors.map(e => e.message).join(', ')}`
      );
    }
    return response.result;
  }

  /**
   * Update a DNS record
   */
  async updateDNSRecord(
    zoneId: string,
    recordId: string,
    updates: Partial<Omit<CFDNSRecord, 'id' | 'zone_id' | 'created_on' | 'modified_on'>>
  ): Promise<CFDNSRecord> {
    const response = await this.request<CFDNSRecord>(
      'PATCH',
      `/zones/${zoneId}/dns_records/${recordId}`,
      updates
    );
    if (!response.success) {
      throw new Error(
        `Failed to update DNS record: ${response.errors.map(e => e.message).join(', ')}`
      );
    }
    return response.result;
  }

  /**
   * Delete a DNS record
   */
  async deleteDNSRecord(zoneId: string, recordId: string): Promise<void> {
    const response = await this.request<void>('DELETE', `/zones/${zoneId}/dns_records/${recordId}`);
    if (!response.success) {
      throw new Error(
        `Failed to delete DNS record: ${response.errors.map(e => e.message).join(', ')}`
      );
    }
  }

  // ==================== SSL/TLS ====================

  /**
   * Get SSL verification status
   */
  async getSSLVerification(zoneId: string): Promise<CFSSLVerification> {
    const response = await this.request<CFSSLVerification>(
      'GET',
      `/zones/${zoneId}/ssl/verification`
    );
    if (!response.success) {
      throw new Error(
        `Failed to get SSL verification: ${response.errors.map(e => e.message).join(', ')}`
      );
    }
    return response.result;
  }

  /**
   * Get SSL settings
   */
  async getSSLSettings(zoneId: string): Promise<{
    id: string;
    value: string;
    editable: boolean;
    modified_on: string;
  }> {
    const response = await this.request<{
      id: string;
      value: string;
      editable: boolean;
      modified_on: string;
    }>('GET', `/zones/${zoneId}/settings/ssl`);
    if (!response.success) {
      throw new Error(
        `Failed to get SSL settings: ${response.errors.map(e => e.message).join(', ')}`
      );
    }
    return response.result;
  }

  /**
   * Update SSL settings
   */
  async updateSSLSettings(
    zoneId: string,
    value: 'off' | 'flexible' | 'full' | 'strict'
  ): Promise<void> {
    const response = await this.request<void>('PATCH', `/zones/${zoneId}/settings/ssl`, { value });
    if (!response.success) {
      throw new Error(
        `Failed to update SSL settings: ${response.errors.map(e => e.message).join(', ')}`
      );
    }
  }

  // ==================== Page Rules ====================

  /**
   * List page rules
   */
  async listPageRules(zoneId: string): Promise<CFPageRule[]> {
    const response = await this.request<CFPageRule[]>('GET', `/zones/${zoneId}/pagerules`);
    if (!response.success) {
      throw new Error(
        `Failed to list page rules: ${response.errors.map(e => e.message).join(', ')}`
      );
    }
    return response.result;
  }

  /**
   * Create page rule
   */
  async createPageRule(
    zoneId: string,
    rule: {
      targets: CFPageRule['targets'];
      actions: CFPageRule['actions'];
      priority?: number;
      status?: 'active' | 'disabled';
    }
  ): Promise<CFPageRule> {
    const response = await this.request<CFPageRule>('POST', `/zones/${zoneId}/pagerules`, rule);
    if (!response.success) {
      throw new Error(
        `Failed to create page rule: ${response.errors.map(e => e.message).join(', ')}`
      );
    }
    return response.result;
  }

  // ==================== Firewall Rules ====================

  /**
   * List firewall rules
   */
  async listFirewallRules(zoneId: string): Promise<CFFirewallRule[]> {
    const response = await this.request<CFFirewallRule[]>('GET', `/zones/${zoneId}/firewall/rules`);
    if (!response.success) {
      throw new Error(
        `Failed to list firewall rules: ${response.errors.map(e => e.message).join(', ')}`
      );
    }
    return response.result;
  }

  // ==================== Workers ====================

  /**
   * List worker scripts
   */
  async listWorkers(accountId?: string): Promise<CFWorkerScript[]> {
    const accId = accountId || this.accountId;
    if (!accId) {
      throw new Error('Account ID required');
    }

    const response = await this.request<CFWorkerScript[]>(
      'GET',
      `/accounts/${accId}/workers/scripts`
    );
    if (!response.success) {
      throw new Error(`Failed to list workers: ${response.errors.map(e => e.message).join(', ')}`);
    }
    return response.result;
  }

  /**
   * Deploy worker script
   */
  async deployWorker(
    scriptName: string,
    script: string,
    accountId?: string
  ): Promise<CFWorkerScript> {
    const accId = accountId || this.accountId;
    if (!accId) {
      throw new Error('Account ID required');
    }

    const response = await this.request<CFWorkerScript>(
      'PUT',
      `/accounts/${accId}/workers/scripts/${scriptName}`,
      {
        script,
        metadata: { body_part: 'script' },
      }
    );

    if (!response.success) {
      throw new Error(`Failed to deploy worker: ${response.errors.map(e => e.message).join(', ')}`);
    }
    return response.result;
  }

  // ==================== Analytics ====================

  /**
   * Get zone analytics
   */
  async getZoneAnalytics(
    zoneId: string,
    since: string,
    until: string
  ): Promise<{
    totals: {
      requests: { all: number; cached: number; uncached: number };
      bandwidth: { all: number; cached: number; uncached: number };
      threats: { all: number; country: Record<string, number> };
      pageviews: { all: number; search_engines: Record<string, number> };
    };
    timeseries: unknown[];
  }> {
    const endpoint = `/zones/${zoneId}/analytics/dashboard?since=${since}&until=${until}&continuous=false`;
    const response = await this.request<{
      totals: {
        requests: { all: number; cached: number; uncached: number };
        bandwidth: { all: number; cached: number; uncached: number };
        threats: { all: number; country: Record<string, number> };
        pageviews: { all: number; search_engines: Record<string, number> };
      };
      timeseries: unknown[];
    }>('GET', endpoint);

    if (!response.success) {
      throw new Error(`Failed to get analytics: ${response.errors.map(e => e.message).join(', ')}`);
    }
    return response.result;
  }

  // ==================== Purge Cache ====================

  /**
   * Purge all cache
   */
  async purgeAllCache(zoneId: string): Promise<void> {
    const response = await this.request<void>('POST', `/zones/${zoneId}/purge_cache`, {
      purge_everything: true,
    });
    if (!response.success) {
      throw new Error(`Failed to purge cache: ${response.errors.map(e => e.message).join(', ')}`);
    }
  }

  /**
   * Purge specific files
   */
  async purgeFiles(zoneId: string, files: string[]): Promise<void> {
    const response = await this.request<void>('POST', `/zones/${zoneId}/purge_cache`, { files });
    if (!response.success) {
      throw new Error(`Failed to purge files: ${response.errors.map(e => e.message).join(', ')}`);
    }
  }

  // ==================== Stats ====================

  getRequestCount(): number {
    return this.requestCount;
  }
}

/**
 * Create client from environment variables
 */
export function createClientFromEnv(): CloudflareClient {
  const apiToken = Bun.env.CLOUDFLARE_API_TOKEN;
  if (!apiToken) {
    throw new Error('CLOUDFLARE_API_TOKEN environment variable not set');
  }

  return new CloudflareClient({
    apiToken,
    accountId: Bun.env.CLOUDFLARE_ACCOUNT_ID,
  });
}

/**
 * Create client from Bun.secrets (with env fallback)
 * This is the recommended method for production use
 */
export async function createClientFromSecrets(): Promise<CloudflareClient> {
  // Dynamic import to avoid circular dependencies
  const { cfSecretsBridge } = await import('./secrets-bridge');

  const creds = await cfSecretsBridge.getCredentials();

  if (creds) {
    return new CloudflareClient({
      apiToken: creds.apiToken,
      accountId: creds.accountId,
    });
  }

  // Fallback to environment variables
  return createClientFromEnv();
}

/**
 * Create client with automatic source detection
 * Priority: Bun.secrets > Environment variables
 */
export async function createClient(autoDetect = true): Promise<CloudflareClient> {
  if (!autoDetect) {
    return createClientFromEnv();
  }

  try {
    return await createClientFromSecrets();
  } catch {
    return createClientFromEnv();
  }
}

export default CloudflareClient;
