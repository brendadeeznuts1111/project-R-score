#!/usr/bin/env bun

import { resolve4, resolveCname, resolveNs, Resolver } from 'node:dns/promises';

type Options = {
  domain: string;
  zoneId?: string;
  apply: boolean;
  verify: boolean;
  timeoutMs: number;
};

type SubdomainConfig = {
  subdomain: string;
  full_domain: string;
  type: string;
  content: string;
  ttl: number;
  proxied: boolean;
  purpose?: string;
};

type DnsCheck = {
  fullDomain: string;
  resolved: boolean;
  records: string[];
  source: 'A' | 'CNAME' | 'none' | 'timeout';
  error?: string;
};

type CloudflareRecord = {
  id: string;
  type: string;
  name: string;
  content: string;
  ttl: number;
  proxied: boolean;
};

function parseArgs(argv: string[]): Options {
  const out: Options = {
    domain: (Bun.env.SEARCH_BENCH_DOMAIN || 'factory-wager.com').trim().toLowerCase(),
    zoneId: (Bun.env.CLOUDFLARE_ZONE_ID || '').trim() || undefined,
    apply: false,
    verify: true,
    timeoutMs: Number.parseInt(Bun.env.DOMAIN_HEALTH_DNS_TIMEOUT_MS || '1200', 10) || 1200,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--domain') {
      const v = (argv[i + 1] || '').trim().toLowerCase();
      if (v) out.domain = v;
      i += 1;
      continue;
    }
    if (arg === '--zone-id') {
      const v = (argv[i + 1] || '').trim();
      if (v) out.zoneId = v;
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
    if (arg === '--no-verify') {
      out.verify = false;
      continue;
    }
    if (arg === '--timeout-ms') {
      const v = Number.parseInt(argv[i + 1] || '', 10);
      if (Number.isFinite(v) && v > 100) out.timeoutMs = v;
      i += 1;
      continue;
    }
  }

  return out;
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

async function checkDns(fullDomain: string, timeoutMs: number): Promise<DnsCheck> {
  try {
    const a = await withTimeout(resolve4(fullDomain), timeoutMs);
    return { fullDomain, resolved: a.length > 0, records: a.slice(0, 4), source: 'A' };
  } catch (aError) {
    try {
      const c = await withTimeout(resolveCname(fullDomain), timeoutMs);
      return { fullDomain, resolved: c.length > 0, records: c.slice(0, 4), source: 'CNAME' };
    } catch (cError) {
      const zoneParts = fullDomain.split('.').slice(-2);
      const zone = zoneParts.join('.');
      try {
        const ns = await withTimeout(resolveNs(zone), timeoutMs);
        for (const server of ns.slice(0, 2)) {
          let serverIp = server;
          try {
            const nsIps = await withTimeout(resolve4(server.replace(/\.$/, '')), timeoutMs);
            if (nsIps.length > 0) serverIp = nsIps[0];
          } catch {
            serverIp = server;
          }
          const resolver = new Resolver();
          resolver.setServers([serverIp]);
          try {
            const aAuth = await withTimeout(resolver.resolve4(fullDomain), timeoutMs);
            if (aAuth.length > 0) {
              return { fullDomain, resolved: true, records: aAuth.slice(0, 4), source: 'A' };
            }
          } catch {
            // continue
          }
          try {
            const cAuth = await withTimeout(resolver.resolveCname(fullDomain), timeoutMs);
            if (cAuth.length > 0) {
              return { fullDomain, resolved: true, records: cAuth.slice(0, 4), source: 'CNAME' };
            }
          } catch {
            // continue
          }
        }
      } catch {
        // continue with original error
      }
      const err = cError instanceof Error ? cError.message : (aError instanceof Error ? aError.message : String(aError));
      return {
        fullDomain,
        resolved: false,
        records: [],
        source: err.includes('timeout_after_') ? 'timeout' : 'none',
        error: err,
      };
    }
  }
}

async function loadKnownSubdomains(domain: string): Promise<SubdomainConfig[]> {
  try {
    if (domain === 'factory-wager.com') {
      const mod = await import('../lib/mcp/cloudflare-domain-manager');
      const mgr = new mod.CloudflareDomainManager();
      return mgr.getAllSubdomains().map((s: any) => ({
        subdomain: String(s.subdomain),
        full_domain: String(s.full_domain),
        type: String(s.type || 'CNAME'),
        content: String(s.content || ''),
        ttl: Number(s.ttl || 300),
        proxied: Boolean(s.proxied),
        purpose: String(s.purpose || ''),
      }));
    }
  } catch {
    // fallback below
  }

  const fallback: SubdomainConfig[] = [
    { subdomain: 'monitor', full_domain: `monitor.${domain}`, type: 'CNAME', content: `api.${domain}`, ttl: 300, proxied: true },
    { subdomain: 'config', full_domain: `config.${domain}`, type: 'CNAME', content: `api.${domain}`, ttl: 300, proxied: true },
    { subdomain: 'database', full_domain: `database.${domain}`, type: 'CNAME', content: `api.${domain}`, ttl: 300, proxied: false },
    { subdomain: 'vault', full_domain: `vault.${domain}`, type: 'CNAME', content: `api.${domain}`, ttl: 300, proxied: false },
    { subdomain: 'redis', full_domain: `redis.${domain}`, type: 'CNAME', content: `api.${domain}`, ttl: 300, proxied: false },
    { subdomain: 'support', full_domain: `support.${domain}`, type: 'CNAME', content: `www.${domain}`, ttl: 300, proxied: true },
  ];
  return fallback;
}

function requireCloudflareToken(): string {
  const token = (Bun.env.CLOUDFLARE_API_TOKEN || '').trim();
  if (!token) throw new Error('CLOUDFLARE_API_TOKEN is required when using --apply');
  return token;
}

async function cfFetch(path: string, init: RequestInit): Promise<any> {
  const token = requireCloudflareToken();
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const json = await res.json();
  if (!res.ok || json?.success === false) {
    throw new Error(`Cloudflare API error ${res.status}: ${JSON.stringify(json?.errors || json)}`);
  }
  return json;
}

async function resolveZoneId(domain: string, explicitZoneId?: string): Promise<string> {
  if (explicitZoneId) return explicitZoneId;
  const json = await cfFetch(`/zones?name=${encodeURIComponent(domain)}&status=active&per_page=1`, { method: 'GET' });
  const zone = Array.isArray(json?.result) ? json.result[0] : null;
  if (!zone?.id) throw new Error(`No active Cloudflare zone found for ${domain}`);
  return String(zone.id);
}

async function upsertDnsRecord(zoneId: string, cfg: SubdomainConfig): Promise<{ action: 'created' | 'updated'; id: string }> {
  const name = cfg.full_domain;
  const type = cfg.type.toUpperCase();
  const existing = await cfFetch(
    `/zones/${zoneId}/dns_records?type=${encodeURIComponent(type)}&name=${encodeURIComponent(name)}&per_page=1`,
    { method: 'GET' }
  );
  const current = Array.isArray(existing?.result) ? (existing.result[0] as CloudflareRecord | undefined) : undefined;

  const isPrivateIpv4 = (value: string): boolean => {
    const ip = String(value || '').trim();
    if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return false;
    const [a, b] = ip.split('.').map((n) => Number.parseInt(n, 10));
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 169 && b === 254) return true;
    return false;
  };

  const proxied = type === 'A' && isPrivateIpv4(cfg.content) ? false : Boolean(cfg.proxied);
  const payload = {
    type,
    name,
    content: cfg.content,
    ttl: Number(cfg.ttl || 300),
    proxied,
  };

  if (current?.id) {
    const updated = await cfFetch(`/zones/${zoneId}/dns_records/${current.id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return { action: 'updated', id: String(updated.result?.id || current.id) };
  }

  const created = await cfFetch(`/zones/${zoneId}/dns_records`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return { action: 'created', id: String(created.result?.id || '') };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const known = await loadKnownSubdomains(options.domain);
  const checks = await Promise.all(known.map((cfg) => checkDns(cfg.full_domain, options.timeoutMs)));

  const unresolved = checks.filter((d) => !d.resolved);
  const unresolvedConfigs = unresolved
    .map((u) => known.find((k) => k.full_domain === u.fullDomain))
    .filter((v): v is SubdomainConfig => Boolean(v));

  const summary: any = {
    domain: options.domain,
    lastCheckedAt: new Date().toISOString(),
    checked: checks.length,
    resolved: checks.length - unresolved.length,
    unresolved: unresolved.map((u) => ({ fullDomain: u.fullDomain, error: u.error || u.source, lastCheckedAt: new Date().toISOString() })),
    apply: options.apply,
    changes: [],
    verify: null,
  };

  if (options.apply && unresolvedConfigs.length > 0) {
    const zoneId = await resolveZoneId(options.domain, options.zoneId);
    for (const cfg of unresolvedConfigs) {
      const change = await upsertDnsRecord(zoneId, cfg);
      summary.changes.push({
        fullDomain: cfg.full_domain,
        type: cfg.type,
        content: cfg.content,
        ttl: cfg.ttl,
        proxied: cfg.proxied,
        action: change.action,
        recordId: change.id,
      });
    }

    if (options.verify) {
      await Bun.sleep(2000);
      const after = await Promise.all(unresolvedConfigs.map((cfg) => checkDns(cfg.full_domain, options.timeoutMs)));
      summary.verify = {
        checked: after.length,
        resolved: after.filter((a) => a.resolved).length,
        unresolved: after.filter((a) => !a.resolved).map((a) => a.fullDomain),
      };
    }
  } else {
    summary.proposed = unresolvedConfigs.map((cfg) => ({
      fullDomain: cfg.full_domain,
      type: cfg.type,
      content: cfg.content,
      ttl: cfg.ttl,
      proxied: cfg.proxied,
      purpose: cfg.purpose || null,
    }));
  }

  console.log(JSON.stringify(summary, null, 2));
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(`[domain-health-online] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
