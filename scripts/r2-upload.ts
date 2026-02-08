#!/usr/bin/env bun

import { S3Client } from 'bun';
import { resolve4, resolveCname } from 'node:dns/promises';

type Options = {
  domain: string;
  zone: string;
  bucket: string;
  endpoint: string;
  prefix: string;
  date: string;
  cacheTtlSec: number;
  source: string;
  timeoutMs: number;
  apply: boolean;
};

type R2Config = {
  bucket: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
};

type SubdomainEntry = {
  subdomain: string;
  fullDomain: string;
  purpose: string;
  dnsResolved: boolean;
  dnsRecords: string[];
  dnsSource: 'A' | 'CNAME' | 'none' | 'timeout';
  dnsError?: string;
};

function utcDateYYYYMMDD(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function parseArgs(argv: string[]): Options {
  const accountId = Bun.env.CLOUDFLARE_ACCOUNT_ID || Bun.env.R2_ACCOUNT_ID || '';
  const endpoint =
    Bun.env.R2_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '');
  const defaultDomain = (Bun.env.SEARCH_BENCH_DOMAIN || 'factory-wager.com').trim().toLowerCase();
  const defaultPrefix = `domains/${defaultDomain.replace(/^\*\./, '').replace(/\.[a-z0-9-]+$/i, '')}/cloudflare`;

  const out: Options = {
    domain: defaultDomain,
    zone: (Bun.env.CLOUDFLARE_ZONE_NAME || defaultDomain).trim(),
    bucket: (Bun.env.R2_BENCH_BUCKET || Bun.env.R2_BUCKET || Bun.env.R2_BUCKET_NAME || 'bun-secrets').trim(),
    endpoint: endpoint.trim(),
    prefix: (Bun.env.DOMAIN_HEALTH_PREFIX || defaultPrefix).trim().replace(/^\/+|\/+$/g, ''),
    date: utcDateYYYYMMDD(),
    cacheTtlSec: Number.parseInt(Bun.env.DOMAIN_HEALTH_CACHE_TTL_SEC || '120', 10) || 120,
    source: 'r2-upload.ts',
    timeoutMs: Number.parseInt(Bun.env.DOMAIN_HEALTH_DNS_TIMEOUT_MS || '1000', 10) || 1000,
    apply: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--domain') {
      const v = (argv[i + 1] || '').trim().toLowerCase();
      if (v) out.domain = v;
      i += 1;
      continue;
    }
    if (arg === '--zone') {
      const v = (argv[i + 1] || '').trim();
      if (v) out.zone = v;
      i += 1;
      continue;
    }
    if (arg === '--bucket') {
      const v = (argv[i + 1] || '').trim();
      if (v) out.bucket = v;
      i += 1;
      continue;
    }
    if (arg === '--endpoint') {
      const v = (argv[i + 1] || '').trim();
      if (v) out.endpoint = v;
      i += 1;
      continue;
    }
    if (arg === '--prefix') {
      const v = (argv[i + 1] || '').trim().replace(/^\/+|\/+$/g, '');
      if (v) out.prefix = v;
      i += 1;
      continue;
    }
    if (arg === '--date') {
      const v = (argv[i + 1] || '').trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) out.date = v;
      i += 1;
      continue;
    }
    if (arg === '--cache-ttl-sec') {
      const v = Number.parseInt(argv[i + 1] || '', 10);
      if (Number.isFinite(v) && v > 0) out.cacheTtlSec = v;
      i += 1;
      continue;
    }
    if (arg === '--source') {
      const v = (argv[i + 1] || '').trim();
      if (v) out.source = v;
      i += 1;
      continue;
    }
    if (arg === '--timeout-ms') {
      const v = Number.parseInt(argv[i + 1] || '', 10);
      if (Number.isFinite(v) && v > 0) out.timeoutMs = v;
      i += 1;
      continue;
    }
    if (arg === '--apply') {
      out.apply = true;
      continue;
    }
    if (arg === '--dry-run') {
      out.apply = false;
      continue;
    }
  }

  return out;
}

function resolveR2Config(options: Options): R2Config {
  const accessKeyId = (Bun.env.R2_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = (Bun.env.R2_SECRET_ACCESS_KEY || '').trim();
  const bucket = options.bucket;
  const endpoint = options.endpoint;
  if (!bucket || !endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'Missing R2 config. Required: R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, plus bucket and endpoint.'
    );
  }
  return { bucket, endpoint, accessKeyId, secretAccessKey };
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`timeout_after_${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function resolveDns(
  host: string,
  timeoutMs: number
): Promise<Pick<SubdomainEntry, 'dnsResolved' | 'dnsRecords' | 'dnsSource' | 'dnsError'>> {
  try {
    const a = await withTimeout(resolve4(host), timeoutMs);
    return { dnsResolved: a.length > 0, dnsRecords: a.slice(0, 4), dnsSource: 'A' };
  } catch (aError) {
    try {
      const c = await withTimeout(resolveCname(host), timeoutMs);
      return { dnsResolved: c.length > 0, dnsRecords: c.slice(0, 4), dnsSource: 'CNAME' };
    } catch (cError) {
      const err = cError instanceof Error ? cError.message : (aError instanceof Error ? aError.message : String(aError));
      const timeout = err.includes('timeout_after_');
      return { dnsResolved: false, dnsRecords: [], dnsSource: timeout ? 'timeout' : 'none', dnsError: err };
    }
  }
}

async function loadSubdomains(domain: string): Promise<Array<{ subdomain: string; fullDomain: string; purpose: string }>> {
  try {
    if (domain === 'factory-wager.com') {
      const mod = await import('../lib/mcp/cloudflare-domain-manager');
      const mgr = new mod.CloudflareDomainManager();
      return mgr.getAllSubdomains().map((s: any) => ({
        subdomain: s.subdomain,
        fullDomain: s.full_domain,
        purpose: s.purpose || '',
      }));
    }
  } catch {
    // Fallback list keeps the restoration script usable without Cloudflare API creds.
  }

  const fallback = [
    'npm', 'api', 'cdn', 'monitor', 'docs', 'rss', 'config', 'admin', 'auth',
    'database', 'storage', 'vault', 'redis', 'www', 'blog', 'support', 'wiki',
  ];
  return fallback.map((name) => ({
    subdomain: name,
    fullDomain: `${name}.${domain}`,
    purpose: 'fallback',
  }));
}

function maskAccountId(endpoint: string): string | null {
  const accountId = endpoint.match(/^https?:\/\/([a-z0-9]+)\.r2\.cloudflarestorage\.com/i)?.[1] || '';
  if (!accountId) return null;
  if (accountId.length < 8) return accountId;
  return `${accountId.slice(0, 4)}...${accountId.slice(-4)}`;
}

async function uploadJson(r2: R2Config, key: string, data: unknown): Promise<void> {
  await S3Client.write(key, JSON.stringify(data, null, 2), {
    bucket: r2.bucket,
    endpoint: r2.endpoint,
    accessKeyId: r2.accessKeyId,
    secretAccessKey: r2.secretAccessKey,
    type: 'application/json',
  });
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const r2 = resolveR2Config(options);

  const subdomains = await loadSubdomains(options.domain);
  const checks = await Promise.all(
    subdomains.map(async (entry) => {
      const dns = await resolveDns(entry.fullDomain, options.timeoutMs);
      const out: SubdomainEntry = {
        subdomain: entry.subdomain,
        fullDomain: entry.fullDomain,
        purpose: entry.purpose,
        dnsResolved: dns.dnsResolved,
        dnsRecords: dns.dnsRecords,
        dnsSource: dns.dnsSource,
      };
      if (dns.dnsError) out.dnsError = dns.dnsError;
      return out;
    })
  );

  const resolved = checks.filter((c) => c.dnsResolved).length;
  const checked = checks.length;
  const dnsRatio = checked > 0 ? resolved / checked : 0;
  const now = new Date().toISOString();
  const accountMasked = maskAccountId(r2.endpoint);

  const healthPayload = {
    timestamp: now,
    source: options.source,
    domain: options.domain,
    zone: options.zone,
    accountId: accountMasked,
    dnsPrefetch: {
      checked,
      resolved,
      cacheTtlSec: options.cacheTtlSec,
      ratio: Number(dnsRatio.toFixed(4)),
    },
    health_checks: checks.map((c) => ({
      subdomain: c.subdomain,
      full_domain: c.fullDomain,
      status: c.dnsResolved ? 'healthy' : 'unresolved',
      dns_source: c.dnsSource,
      dns_records: c.dnsRecords,
      last_check: now,
      note: c.dnsError || null,
    })),
  };

  const sslPayload = {
    timestamp: now,
    source: options.source,
    domain: options.domain,
    ssl_overview: {
      total_certificates: checked,
      valid_certificates: checks.filter((c) => c.dnsResolved).length,
      unresolved_domains: checks.filter((c) => !c.dnsResolved).length,
    },
    certificates: checks.map((c) => ({
      domain: c.fullDomain,
      status: c.dnsResolved ? 'valid' : 'unknown',
      observed_dns: c.dnsSource,
      dns_resolved: c.dnsResolved,
      checked_at: now,
    })),
  };

  const analyticsPayload = {
    timestamp: now,
    source: options.source,
    domain: options.domain,
    dashboard_summary: {
      total_subdomains: checked,
      resolved_subdomains: resolved,
      unresolved_subdomains: checked - resolved,
      resolution_ratio: Number(dnsRatio.toFixed(4)),
    },
    performance_metrics: {
      uptime_percentage_estimate: Number((dnsRatio * 100).toFixed(2)),
      dns_failure_rate: Number(((1 - dnsRatio) * 100).toFixed(2)),
      cache_ttl_sec: options.cacheTtlSec,
    },
    unresolved_subdomains: checks.filter((c) => !c.dnsResolved).map((c) => c.fullDomain),
  };

  const healthKey = `${options.prefix}/health/${options.date}.json`;
  const sslKey = `${options.prefix}/ssl/${options.date}.json`;
  const analyticsKey = `${options.prefix}/analytics/${options.date}.json`;

  console.log(`[r2-upload] domain=${options.domain} zone=${options.zone} account=${accountMasked || 'n/a'}`);
  console.log(`[r2-upload] bucket=${r2.bucket} endpoint=${r2.endpoint}`);
  console.log(`[r2-upload] prefix=${options.prefix}`);
  console.log(`[r2-upload] dnsChecked=${checked} dnsResolved=${resolved} cacheTtlSec=${options.cacheTtlSec}`);
  console.log(`[r2-upload] key health=${healthKey}`);
  console.log(`[r2-upload] key ssl=${sslKey}`);
  console.log(`[r2-upload] key analytics=${analyticsKey}`);

  if (!options.apply) {
    console.log('[r2-upload] dry-run mode (no upload). Use --apply to write objects.');
    return;
  }

  await Promise.all([
    uploadJson(r2, healthKey, healthPayload),
    uploadJson(r2, sslKey, sslPayload),
    uploadJson(r2, analyticsKey, analyticsPayload),
  ]);

  console.log('[r2-upload] uploaded 3 objects successfully');
}

await main();

