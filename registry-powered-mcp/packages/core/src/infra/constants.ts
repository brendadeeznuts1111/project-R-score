/**
 * Infrastructure Constants Registry
 * Single source of truth for all infrastructure identifiers
 */

// =============================================================================
// Cloudflare Account
// =============================================================================

export const CLOUDFLARE = {
  ACCOUNT_ID: "7a470541a704caaf91e71efccc78fd36",
  EMAIL: "utahj4754@gmail.com",
} as const;

// =============================================================================
// Zones
// =============================================================================

export const ZONES = {
  FACTORY_WAGER: {
    id: "a3b7ba4bb62cb1b177b04b8675250674",
    name: "factory-wager.com",
    status: "active",
  },
  MISSON_CONTROL: {
    id: "ba2906afe573e63c6b32f471d2fe01fe",
    name: "misson-control.com",
    status: "active",
  },
} as const;

// =============================================================================
// R2 Buckets
// =============================================================================

export const R2_BUCKETS = {
  REGISTRY_PROD: {
    name: "registry-mcp-prod",
    region: "WNAM",
    publicUrl: "https://pub-f1ef571b2410424580f370488fbad755.r2.dev",
    status: "active",
  },
} as const;

// =============================================================================
// Workers
// =============================================================================

export const WORKERS = {
  BLOG_GATEWAY: {
    name: "mcp-blog-gateway-ord01",
    workersDevUrl: "https://mcp-blog-gateway-ord01.utahj4754.workers.dev",
    binding: "R2_BUCKET",
    bucket: "registry-mcp-prod",
    status: "deployed",
  },
} as const;

// =============================================================================
// Domains & Routes
// =============================================================================

export const DOMAINS = {
  BLOG: {
    fqdn: "blog.factory-wager.com",
    zone: "factory-wager.com",
    zoneId: ZONES.FACTORY_WAGER.id,
    worker: WORKERS.BLOG_GATEWAY.name,
    route: "blog.factory-wager.com/*",
    dns: {
      type: "AAAA",
      name: "blog",
      content: "100::",
      proxied: true,
    },
    urls: {
      production: "https://blog.factory-wager.com",
      health: "https://blog.factory-wager.com/health",
      rss: "https://blog.factory-wager.com/blog/rss.xml",
    },
    status: "active",
  },
} as const;

// =============================================================================
// R2 Assets (Blog)
// =============================================================================

export const R2_ASSETS = {
  BLOG: {
    prefix: "blog/",
    files: [
      { key: "blog/index.html", type: "text/html", description: "Blog home" },
      { key: "blog/rss.xml", type: "application/xml", description: "RSS feed" },
      { key: "blog/performance/", type: "directory", description: "Performance posts" },
      { key: "blog/security/", type: "directory", description: "Security posts" },
      { key: "blog/categories/", type: "directory", description: "Category pages" },
      { key: "blog/assets/", type: "directory", description: "JS bundles" },
    ],
  },
  HEALTHCHECK: {
    prefix: "",
    files: [
      { key: "_healthcheck.txt", type: "text/plain", description: "Health check" },
    ],
  },
} as const;

// =============================================================================
// Infrastructure Matrix (Golden Record)
// =============================================================================

export const INFRA_MATRIX = {
  BLOG_GATEWAY: {
    id: "Blog-Gateway",
    tier: "Level 1: CDN",
    resourceTax: "CPU: <1ms",
    bunApi: "Bun.serve()",
    status: "ACTIVE",
  },
  R2_STORAGE: {
    id: "R2-Storage",
    tier: "Level 1: Storage",
    resourceTax: "I/O: Lazy",
    bunApi: "S3Client",
    status: "ACTIVE",
  },
  RSS_COMPILER: {
    id: "RSS-Compiler",
    tier: "Level 2: Syndication",
    resourceTax: "CPU: <5ms",
    bunApi: "Bun.file()",
    status: "ACTIVE",
  },
} as const;

// =============================================================================
// Type Exports
// =============================================================================

export type ZoneId = keyof typeof ZONES;
export type BucketId = keyof typeof R2_BUCKETS;
export type WorkerId = keyof typeof WORKERS;
export type DomainId = keyof typeof DOMAINS;
export type InfraId = keyof typeof INFRA_MATRIX;

// =============================================================================
// Helper Functions
// =============================================================================

export function getZoneById(id: string) {
  return Object.values(ZONES).find((z) => z.id === id);
}

export function getDomainsByZone(zoneName: string) {
  return Object.values(DOMAINS).filter((d) => d.zone === zoneName);
}

export function getWorkerUrl(workerId: WorkerId): string {
  return WORKERS[workerId].workersDevUrl;
}

export function getDomainUrl(domainId: DomainId): string {
  return DOMAINS[domainId].urls.production;
}

// =============================================================================
// Summary Tables (for documentation generation)
// =============================================================================

export function generateDomainTable(): string {
  const rows = Object.entries(DOMAINS).map(([key, domain]) => {
    return `| ${domain.fqdn} | ${domain.zone} | ${domain.worker} | ${domain.status.toUpperCase()} |`;
  });

  return `| Domain | Zone | Worker | Status |
|:-------|:-----|:-------|:-------|
${rows.join("\n")}`;
}

export function generateWorkerTable(): string {
  const rows = Object.entries(WORKERS).map(([key, worker]) => {
    return `| ${worker.name} | ${worker.bucket} | ${worker.status.toUpperCase()} |`;
  });

  return `| Worker | R2 Binding | Status |
|:-------|:-----------|:-------|
${rows.join("\n")}`;
}

export function generateR2Table(): string {
  const rows = Object.entries(R2_BUCKETS).map(([key, bucket]) => {
    return `| ${bucket.name} | ${bucket.region} | ${bucket.status.toUpperCase()} |`;
  });

  return `| Bucket | Region | Status |
|:-------|:-------|:-------|
${rows.join("\n")}`;
}

export function generateInfraMatrix(): string {
  const rows = Object.entries(INFRA_MATRIX).map(([key, infra]) => {
    return `| **${infra.id}** | ${infra.tier} | \`${infra.resourceTax}\` | \`${infra.bunApi}\` | ${infra.status} |`;
  });

  return `| Infrastructure ID | Logic Tier | Resource Tax | Bun API | Status |
|:------------------|:-----------|:-------------|:--------|:-------|
${rows.join("\n")}`;
}
