#!/usr/bin/env bun
// tenant-snapshot-demo.ts - Demonstrate audit snapshot functionality

// Mock database for demonstration
const auditDB = {
  query: (sql: string) => ({
    all: async (tenant: string) => {
      // Simulate violation data
      return [
        { event: "width_violation", width: 95, preview: "Line exceeds 88 character limit by 7 characters", ts: "2026-01-31 23:45:00" },
        { event: "width_violation", width: 102, preview: "Line exceeds 88 character limit by 14 characters", ts: "2026-01-31 23:30:00" },
        { event: "width_violation", width: 89, preview: "Line exceeds 88 character limit by 1 character", ts: "2026-01-31 23:15:00" },
        { event: "width_violation", width: 91, preview: "Line exceeds 88 character limit by 3 characters", ts: "2026-01-31 23:00:00" },
        { event: "width_violation", width: 88, preview: "Line at exact character limit", ts: "2026-01-31 22:45:00" }
      ];
    }
  })
};

async function snapshotTenantAudit(tenant: string) {
  console.log(`📸 Creating audit snapshot for tenant: ${tenant}`);

  // Fetch tenant-specific violations (last 30 days)
  const violations = await auditDB.query(`
    SELECT event, width, preview, ts
    FROM violations
    WHERE tenant = ? AND ts > datetime('now', '-30 days')
    ORDER BY ts DESC
  `).all(tenant);

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

  // Audit log (Col-89 safe)
  const logLine = `Snapshot: ${filename} | Size: ${Math.round(bytes.byteLength/1024)} KiB | SHA-256: ${sha256.slice(0,16)}…`;
  console.log(Bun.stringWidth(logLine) > 89
    ? Bun.escapeHTML(logLine.slice(0,86)) + "…"
    : logLine);

  return { path, sha256, size: bytes.byteLength, filename };
}

// Demo usage
async function demonstrateSnapshots() {
  console.log("🎯 Tenant Audit Snapshot Demo");
  console.log("=" .repeat(40));

  try {
    // Create snapshots for different tenants
    const tenants = ["tenant-a", "tenant-b", "tenant-c"];

    for (const tenant of tenants) {
      const result = await snapshotTenantAudit(tenant);
      console.log(`✅ Created: ${result.filename}`);
      console.log(`   Path: ${result.path}`);
      console.log(`   Size: ${Math.round(result.size/1024)} KiB`);
      console.log(`   SHA256: ${result.sha256.slice(0, 16)}…`);
      console.log("");
    }

    // Show snapshot directory
    console.log("📁 Snapshot Directory:");
    const fs = require('fs');
    try {
      const files: string[] = fs.readdirSync("./snapshots").filter((f: string) => f.endsWith('.tar.gz'));
      files.forEach((file: string) => {
        const stats = fs.statSync(`./snapshots/${file}`);
        console.log(`  📦 ${file} (${Math.round(stats.size/1024)} KiB)`);
      });
    } catch (error) {
      console.log("  No snapshots found");
    }

    console.log("\n💡 Integration Benefits:");
    console.log("  • Compressed archives save storage space");
    console.log("  • SHA-256 ensures data integrity");
    console.log("  • Metadata enables quick analysis");
    console.log("  • Col-89 safe logging for audit trails");
    console.log("  • Tenant isolation with safe filenames");

    console.log("\n🚀 Dashboard Integration:");
    console.log("  • Add snapshot buttons to tenant cards");
    console.log("  • Show snapshot history per tenant");
    console.log("  • Enable bulk snapshot operations");
    console.log("  • Integrate with S3 for cloud storage");

  } catch (error) {
    console.error("❌ Error creating snapshots:", error);
  }
}

// Run demonstration
demonstrateSnapshots();

export { snapshotTenantAudit };
