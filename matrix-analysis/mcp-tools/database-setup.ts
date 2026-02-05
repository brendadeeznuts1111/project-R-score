#!/usr/bin/env bun
// mcp-tools/database-setup.ts - Database initialization for historical compliance data

import { Database } from "bun:sqlite";

export function setupDatabase(): Database {
  const db = new Database("./data/tier1380.db");

  // Create monthly compliance table (matching OMEGA schema)
  db.run(`
    CREATE TABLE IF NOT EXISTS monthly_compliance (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))) ),
      tenant TEXT NOT NULL,
      month TEXT NOT NULL,              -- YYYY-MM format
      compliance_score REAL NOT NULL,   -- % lines ≤89
      total_lines INTEGER NOT NULL,
      violation_count INTEGER NOT NULL,
      max_width INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(tenant, month)
    )
  `);

  // Create index for performance
  db.run("CREATE INDEX IF NOT EXISTS idx_monthly_compliance_tenant_month ON monthly_compliance(tenant, month)");

  // Create daily violations table for detailed tracking
  db.run(`
    CREATE TABLE IF NOT EXISTS daily_violations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant TEXT NOT NULL,
      date TEXT NOT NULL,
      file TEXT NOT NULL,
      line_number INTEGER NOT NULL,
      column_number INTEGER NOT NULL,
      severity TEXT NOT NULL,
      preview TEXT NOT NULL,
      width INTEGER NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  // Create tenant metrics table
  db.run(`
    CREATE TABLE IF NOT EXISTS tenant_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant TEXT NOT NULL,
      metric_date TEXT NOT NULL,
      total_files INTEGER DEFAULT 0,
      total_lines INTEGER DEFAULT 0,
      critical_violations INTEGER DEFAULT 0,
      warning_violations INTEGER DEFAULT 0,
      compliance_score REAL DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      UNIQUE(tenant, metric_date)
    )
  `);

  // Create indexes for performance
  db.run("CREATE INDEX IF NOT EXISTS idx_daily_tenant_date ON daily_violations(tenant, date)");
  db.run("CREATE INDEX IF NOT EXISTS idx_metrics_tenant_date ON tenant_metrics(tenant, metric_date)");

  console.log("✅ Database initialized successfully");
  return db;
}

export function insertHistoricalData(db: Database, tenant: string, months: number = 12): void {
  console.log(`📊 Inserting historical data for ${tenant} (${months} months)`);

  const now = new Date();

  for (let i = 0; i < months; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = date.toISOString().slice(0, 7); // YYYY-MM format

    // Generate realistic compliance data with some variance
    const baseScore = 85 + Math.random() * 12; // 85-97% range
    const totalLines = 150 + Math.floor(Math.random() * 100); // 150-250 lines
    const violationCount = Math.floor((100 - baseScore) * totalLines / 100);

    try {
      db.run(`
        INSERT OR REPLACE INTO monthly_compliance (tenant, month, compliance_score, total_lines, violation_count)
        VALUES (?, ?, ?, ?, ?)
      `, [tenant, monthStr, parseFloat(baseScore.toFixed(2)), totalLines, violationCount]);

      console.log(`  ✅ ${monthStr}: ${baseScore.toFixed(2)}% compliance, ${violationCount} violations`);
    } catch (error) {
      console.error(`  ❌ Failed to insert ${monthStr}:`, error);
    }
  }
}

export function insertSampleViolations(db: Database, tenant: string, days: number = 30): void {
  console.log(`🚨 Inserting sample violations for ${tenant} (${days} days)`);

  const files = [
    "src/components/Header.tsx",
    "src/utils/validation.ts",
    "src/api/routes.ts",
    "src/config/database.ts",
    "src/pages/Dashboard.tsx"
  ];

  const severities = ["warning", "critical"];

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().slice(0, 10); // YYYY-MM-DD format

    // Random number of violations per day (0-5)
    const dailyViolations = Math.floor(Math.random() * 6);

    for (let j = 0; j < dailyViolations; j++) {
      const file = files[Math.floor(Math.random() * files.length)];
      const lineNum = 10 + Math.floor(Math.random() * 200);
      const columnNum = 85 + Math.floor(Math.random() * 40);
      const severity = severities[Math.floor(Math.random() * severities.length)];
      const preview = `const longVariableName${j} = 'this line exceeds the 89 character limit for demonstration';`;

      try {
        db.run(`
          INSERT INTO daily_violations (tenant, date, file, line_number, column_number, severity, preview)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [tenant, dateStr, file, lineNum, columnNum, severity, preview]);
      } catch (error) {
        console.error(`  ❌ Failed to insert violation for ${dateStr}:`, error);
      }
    }
  }

  console.log(`  ✅ Generated sample violations for ${days} days`);
}

export function calculateTenantMetrics(db: Database, tenant: string): void {
  console.log(`📈 Calculating metrics for ${tenant}`);

  // Get last 30 days of data
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dateStr = thirtyDaysAgo.toISOString().slice(0, 10);

  try {
    const query = db.query(`
      SELECT
        COUNT(*) as total_files,
        SUM(line_number) as total_lines,
        SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical_violations,
        SUM(CASE WHEN severity = 'warning' THEN 1 ELSE 0 END) as warning_violations
      FROM daily_violations
      WHERE tenant = ? AND date >= ?
    `);

    const result = query.get(tenant, dateStr) as {
      total_files: number;
      total_lines: number;
      critical_violations: number;
      warning_violations: number;
    } | null;

    if (result) {
      const totalViolations = result.critical_violations + result.warning_violations;
      const totalLines = result.total_lines || 1000; // Default if no data
      const complianceScore = Math.max(0, 100 - (totalViolations / totalLines * 100));

      const today = new Date().toISOString().slice(0, 10);

      db.run(`
        INSERT OR REPLACE INTO tenant_metrics (tenant, metric_date, total_files, total_lines, critical_violations, warning_violations, compliance_score)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [tenant, today, result.total_files || 0, totalLines, result.critical_violations || 0, result.warning_violations || 0, parseFloat(complianceScore.toFixed(2))]);

      console.log(`  ✅ Metrics calculated: ${complianceScore.toFixed(2)}% compliance`);
    }
  } catch (error) {
    console.error(`  ❌ Failed to calculate metrics:`, error);
  }
}

// Main setup function
if (import.meta.main) {
  console.log("🚀 Setting up Tier-1380 Database");
  console.log("=" .repeat(50));

  const db = setupDatabase();

  // Insert data for multiple tenants
  const tenants = ["tenant-a", "tenant-b", "tenant-c"];

  tenants.forEach(tenant => {
    console.log(`\n📊 Processing ${tenant}`);
    insertHistoricalData(db, tenant, 12);
    insertSampleViolations(db, tenant, 30);
    calculateTenantMetrics(db, tenant);
  });

  console.log("\n🎉 Database setup complete!");
  console.log("\n📋 Available tables:");
  const tables = db.query("SELECT name FROM sqlite_master WHERE type='table'").all();
  tables.forEach((table: any) => console.log(`  - ${table.name}`));

  db.close();
}
