#!/usr/bin/env bun
// tenant-archiver.ts - Tenant audit snapshot archiving system

// Mock database for demonstration
const auditDB = {
  query: (sql: string) => ({
    all: async (tenant?: string) => {
      if (sql.includes("SELECT DISTINCT tenant")) {
        return [
          { tenant: "tenant-a" },
          { tenant: "tenant-b" },
          { tenant: "tenant-c" },
          { tenant: "tenant-d" },
          { tenant: "tenant-e" },
        ];
      }

      // Simulate violations data for specific tenant
      return Array.from({ length: Math.floor(Math.random() * 10) + 5 }, (_, i) => ({
        event: "width_violation",
        width: 88 + Math.floor(Math.random() * 20),
        preview: `Line exceeds 88 character limit by ${i + 1} characters`,
        ts: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        tenant: tenant || "tenant-a"
      })) as Array<{
        event: string;
        width: number;
        preview: string;
        ts: string;
        tenant: string;
      }>;
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
  `).all(tenant) as Array<{
    event: string;
    width: number;
    preview: string;
    ts: string;
    tenant: string;
  }>;

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

  return { path, sha256, size: bytes.byteLength, filename, tenant };
}

// Bulk snapshot function
async function snapshotAllTenants() {
  const tenantResult = await auditDB.query("SELECT DISTINCT tenant FROM violations").all();
  const tenants = tenantResult.map((r: any) => r.tenant);

  const results = [];
  for (const tenant of tenants) {
    try {
      const result = await snapshotTenantAudit(tenant);
      results.push(result);
    } catch (err) {
      console.error(`Snapshot failed for ${tenant}:`, err instanceof Error ? err.message : String(err));
    }
  }

  // Summary log (Col-89 safe)
  const summary = `Bulk snapshot complete: ${results.length} tenants`;
  console.log(summary);

  return results;
}

// Safe extraction function
async function safeExtractSnapshot(path: string, targetDir: string) {
  if (!path.startsWith("./snapshots/") || !path.endsWith(".tar.gz")) {
    throw new Error("Invalid snapshot path");
  }

  const bytes = await Bun.file(path).arrayBuffer();
  const archive = new Bun.Archive(bytes);

  // Security: reject dangerous paths
  const files = await archive.files();
  for (const [p] of files) {
    if (p.includes("..") || p.startsWith("/") || p.startsWith("\\")) {
      throw new Error(`Unsafe path in archive: ${p}`);
    }
  }

  const count = await archive.extract(targetDir, { glob: "**/*.{json,jsonl}" }); // only data files

  // Audit extraction
  console.log(`Extracted ${count} files from ${path} to ${targetDir}`);

  return count;
}

// CLI interface
if (import.meta.main) {
  const command = process.argv[2];
  const tenant = process.argv[3];

  if (command === "snapshot" && tenant) {
    await snapshotTenantAudit(tenant);
  } else if (command === "bulk") {
    await snapshotAllTenants();
  } else {
    console.log("Usage:");
    console.log("  bun tenant-archiver.ts snapshot <tenant>");
    console.log("  bun tenant-archiver.ts bulk");
  }
}

export {
  snapshotTenantAudit,
  snapshotAllTenants,
  safeExtractSnapshot,
  auditDB
};
