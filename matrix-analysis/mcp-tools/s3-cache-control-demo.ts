#!/usr/bin/env bun
// s3-cache-control-demo.ts - Demonstrate S3 cache control for audit logs

// Cache control strategies for different data types
const CACHE_STRATEGIES = {
  // Immutable audit snapshots - cache for 1 year
  auditSnapshot: {
    cacheControl: "max-age=31536000, immutable",
    description: "Historical audit data that never changes"
  },

  // Recent violations - cache for 1 hour
  recentViolations: {
    cacheControl: "max-age=3600",
    description: "Recent violations that update frequently"
  },

  // Compliance reports - cache for 24 hours
  complianceReport: {
    cacheControl: "max-age=86400",
    description: "Daily compliance reports"
  },

  // Tenant exports - cache for 1 week
  tenantExport: {
    cacheControl: "max-age=604800",
    description: "Weekly tenant data exports"
  },

  // Temporary exports - cache for 5 minutes
  tempExport: {
    cacheControl: "max-age=300",
    expires: () => new Date(Date.now() + 300000).toUTCString(),
    description: "Temporary export files"
  }
};

// Example functions for your dashboard (commented out until S3 is available)
/*
const s3 = new Bun.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  bucket: "tier1380-audit-logs",
  region: "us-east-1"
});

async function storeAuditSnapshot(tenantId: string, data: any) {
  const key = `tenants/${tenantId}/audit-snapshots/${new Date().toISOString().split('T')[0]}.jsonl`;
  const strategy = CACHE_STRATEGIES.auditSnapshot;

  await s3.write(key, JSON.stringify(data), {
    cacheControl: strategy.cacheControl
  });

  console.log(`✅ Stored audit snapshot for ${tenantId} with ${strategy.description}`);
}

async function storeRecentViolations(tenantId: string, violations: any[]) {
  const key = `tenants/${tenantId}/recent-violations.json`;
  const strategy = CACHE_STRATEGIES.recentViolations;

  await s3.write(key, JSON.stringify(violations), {
    cacheControl: strategy.cacheControl
  });

  console.log(`✅ Stored recent violations for ${tenantId} with ${strategy.description}`);
}
*/

// Demo usage
console.log("🗄️  S3 Cache Control Demo for Multi-Tenant Dashboard");
console.log("=" .repeat(55));

console.log("\n📋 Available Cache Strategies:");
Object.entries(CACHE_STRATEGIES).forEach(([key, strategy]) => {
  console.log(`  ${key}: ${strategy.cacheControl}`);
  console.log(`    → ${strategy.description}`);
});

console.log("\n🚀 Example Usage:");
console.log("// S3 client setup (requires AWS credentials)");
console.log("const s3 = new Bun.S3({");
console.log("  accessKeyId: process.env.AWS_ACCESS_KEY_ID,");
console.log("  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,");
console.log("  bucket: 'tier1380-audit-logs',");
console.log("  region: 'us-east-1'");
console.log("});");
console.log("");

console.log("// Store audit snapshot (immutable, 1 year cache)");
console.log(`await s3.write("tenants/tenant-a/audit-2026-01-01.jsonl", data, {`);
console.log(`  cacheControl: "${CACHE_STRATEGIES.auditSnapshot.cacheControl}"`);
console.log(`});`);
console.log("");

console.log("// Store recent violations (1 hour cache)");
console.log(`await s3.write("tenants/tenant-b/violations.json", violations, {`);
console.log(`  cacheControl: "${CACHE_STRATEGIES.recentViolations.cacheControl}"`);
console.log(`});`);
console.log("");

console.log("// Store compliance report (24 hours cache)");
console.log(`await s3.write("tenants/tenant-c/report-2026-01-01.json", report, {`);
console.log(`  cacheControl: "${CACHE_STRATEGIES.complianceReport.cacheControl}"`);
console.log(`});`);
console.log("");

console.log("// Export tenant data (1 week cache)");
console.log(`await s3.write("tenants/tenant-a/export-2026-01-01T12-00-00.json", data, {`);
console.log(`  cacheControl: "${CACHE_STRATEGIES.tenantExport.cacheControl}"`);
console.log(`});`);
console.log("");

console.log("// Create temporary export with expires header");
console.log(`await s3.write("temp/export-1234567890.json", data, {`);
console.log(`  cacheControl: "${CACHE_STRATEGIES.tempExport.cacheControl}",`);
console.log(`  expires: "${CACHE_STRATEGIES.tempExport.expires()}"`);
console.log(`});`);

console.log("\n💡 Benefits for Multi-Tenant Dashboard:");
console.log("  • Reduced S3 costs with intelligent caching");
console.log("  • Faster load times for cached audit data");
console.log("  • Better CDN performance for exported reports");
console.log("  • Immutable snapshots for historical data");

export { CACHE_STRATEGIES };
