#!/usr/bin/env bun
// bulk-snapshot-demo.ts - Demonstrate bulk tenant snapshot functionality

// Mock database for demonstration
const auditDB = {
  query: (sql: string) => ({
    all: () => {
      if (sql.includes("SELECT DISTINCT tenant")) {
        return [
          { tenant: "tenant-a" },
          { tenant: "tenant-b" },
          { tenant: "tenant-c" },
          { tenant: "tenant-d" }, // New tenant
          { tenant: "tenant-e" }  // Another new tenant
        ];
      }
      return [];
    }
  })
};

// Reuse the snapshot function from previous demo
async function snapshotTenantAudit(tenant: string) {
  console.log(`📸 Creating audit snapshot for tenant: ${tenant}`);
  
  // Simulate some processing time
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Simulate violations data
  const violations = Array.from({ length: Math.floor(Math.random() * 10) + 1 }, (_, i) => ({
    event: "width_violation",
    width: 88 + Math.floor(Math.random() * 20),
    preview: `Violation ${i + 1} preview`,
    ts: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
  }));

  const metadata = {
    tenant,
    snapshot_at: new Date().toISOString(),
    total_violations: violations.length,
    max_width: Math.max(...violations.map(v => v.width || 0), 0),
    bun_version: Bun.version,
  };

  const files: Record<string, string> = {
    "metadata.json": JSON.stringify(metadata, null, 2),
    "violations.jsonl": violations.map(v => JSON.stringify(v)).join("\n"),
  };

  const archive = new Bun.Archive(files, { compress: "gzip", level: 7 });

  const safeTenant = tenant.replace(/[^a-z0-9_-]/gi, "_");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `audit-snapshot-${safeTenant}-${timestamp}.tar.gz`;
  const path = `./snapshots/${filename}`;

  // Ensure snapshots directory exists
  await Bun.write("./snapshots/.gitkeep", "");
  
  await Bun.write(path, archive);

  const bytes = await Bun.file(path).arrayBuffer();
  const hash = Bun.hash.wyhash(bytes);
  const sha256 = hash.toString(16);

  // Simulate occasional failures for demo
  if (Math.random() < 0.1) {
    throw new Error(`Simulated network error for ${tenant}`);
  }

  return { path, sha256, size: bytes.byteLength, filename, tenant };
}

async function snapshotAllTenants() {
  console.log("🚀 Starting bulk tenant snapshot process...");
  console.log("=" .repeat(50));
  
  const tenants = auditDB.query("SELECT DISTINCT tenant FROM violations").all().map(r => r.tenant);
  console.log(`📋 Found ${tenants.length} tenants to process: ${tenants.join(', ')}`);
  console.log("");

  const results = [];
  const failures = [];
  
  for (const tenant of tenants) {
    try {
      const result = await snapshotTenantAudit(tenant);
      results.push(result);
      console.log(`✅ Success: ${result.filename} (${Math.round(result.size/1024)} KiB)`);
    } catch (err) {
      const errorMsg = `Snapshot failed for ${tenant}: ${err instanceof Error ? err.message : String(err)}`;
      console.error(`❌ ${errorMsg}`);
      failures.push({ tenant, error: errorMsg });
    }
  }

  // Summary log (Col-89 safe)
  const summary = `Bulk snapshot complete: ${results.length}/${tenants.length} tenants successful`;
  console.log("");
  console.log("📊 " + summary);
  
  if (failures.length > 0) {
    console.log(`⚠️  Failures: ${failures.length} tenants`);
    failures.forEach(f => console.log(`   • ${f.tenant}: ${f.error}`));
  }

  // Statistics
  const totalSize = results.reduce((sum, r) => sum + r.size, 0);
  console.log(`📈 Statistics:`);
  console.log(`   • Total snapshots: ${results.length}`);
  console.log(`   • Total size: ${Math.round(totalSize/1024)} KiB`);
  console.log(`   • Average size: ${Math.round(totalSize/results.length/1024)} KiB`);
  console.log(`   • Success rate: ${Math.round(results.length/tenants.length*100)}%`);

  return { results, failures, summary, stats: { totalSize, successRate: results.length/tenants.length } };
}

// Enhanced scheduling function
function scheduleNightlySnapshots() {
  console.log("⏰ Scheduling nightly snapshots at 2:00 AM local time");
  
  const scheduleNextRun = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(2, 0, 0, 0); // 2:00 AM
    
    const msUntilNext = tomorrow.getTime() - now.getTime();
    
    console.log(`📅 Next snapshot scheduled for: ${tomorrow.toISOString()}`);
    console.log(`⏱️  Time until next run: ${Math.round(msUntilNext/(1000*60*60))} hours`);
    
    setTimeout(async () => {
      console.log("🌙 Running scheduled nightly snapshot...");
      await snapshotAllTenants();
      scheduleNextRun(); // Schedule next day
    }, msUntilNext);
  };
  
  scheduleNextRun();
}

// Dashboard integration helper
function createSnapshotAPI() {
  return {
    // POST /api/snapshots/bulk
    async createBulkSnapshots() {
      return await snapshotAllTenants();
    },
    
    // GET /api/snapshots/status
    async getSnapshotStatus() {
      const fs = require('fs');
      try {
        const files = fs.readdirSync("./snapshots").filter((f: string) => f.endsWith('.tar.gz'));
        const tenantStats: Record<string, number> = {};
        
        files.forEach((file: string) => {
          const match = file.match(/audit-snapshot-(.+)-\d{4}-\d{2}-\d{2}T/);
          if (match) {
            const tenant = match[1];
            tenantStats[tenant] = (tenantStats[tenant] || 0) + 1;
          }
        });
        
        return {
          totalSnapshots: files.length,
          tenantBreakdown: tenantStats,
          lastUpdated: new Date().toISOString()
        };
      } catch (error) {
        return { error: "No snapshots found" };
      }
    }
  };
}

// Demo usage
async function demonstrateBulkSnapshots() {
  console.log("🎯 Bulk Tenant Snapshot Demo");
  console.log("=" .repeat(40));
  
  try {
    // Run bulk snapshot
    const result = await snapshotAllTenants();
    
    console.log("\n🔗 Dashboard Integration:");
    console.log("  • POST /api/snapshots/bulk - Trigger bulk snapshots");
    console.log("  • GET /api/snapshots/status - View snapshot status");
    console.log("  • WebSocket events for real-time progress");
    
    console.log("\n⏰ Scheduling Options:");
    console.log("  • Nightly at 2:00 AM (recommended)");
    console.log("  • Weekly on Sundays");
    console.log("  • On-demand via dashboard");
    console.log("  • CI/CD pipeline integration");
    
    // Show API status
    const api = createSnapshotAPI();
    const status = await api.getSnapshotStatus();
    console.log("\n📊 Current Snapshot Status:");
    console.log(`  • Total snapshots: ${status.totalSnapshots || 0}`);
    if (status.tenantBreakdown) {
      Object.entries(status.tenantBreakdown).forEach(([tenant, count]) => {
        console.log(`  • ${tenant}: ${count} snapshots`);
      });
    }
    
  } catch (error) {
    console.error("❌ Demo failed:", error);
  }
}

// Run demonstration
demonstrateBulkSnapshots();

// Uncomment to enable scheduling
// scheduleNightlySnapshots();

export { snapshotAllTenants, scheduleNightlySnapshots, createSnapshotAPI };
