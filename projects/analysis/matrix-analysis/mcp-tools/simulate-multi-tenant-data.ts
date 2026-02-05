#!/usr/bin/env bun
// simulate-multi-tenant-data.ts - Create sample multi-tenant data for testing

const SIM_API_BASE = "http://localhost:3333";

// Sample compliance data for different tenants
const sampleData = [
  {
    tenant: "tenant-a",
    month: "2026-01",
    compliance_score: 95,
    total_lines: 178,
    violation_count: 8,
    max_width: 88
  },
  {
    tenant: "tenant-b",
    month: "2026-01",
    compliance_score: 87,
    total_lines: 245,
    violation_count: 32,
    max_width: 95
  },
  {
    tenant: "tenant-c",
    month: "2026-01",
    compliance_score: 92,
    total_lines: 156,
    violation_count: 12,
    max_width: 82
  }
];

// Sample violation data
const sampleViolations = [
  {
    tenant: "tenant-a",
    date: "2026-01-31",
    file: "src/components/Header.tsx",
    line_number: 45,
    column_number: 12,
    severity: "warning",
    preview: "Line exceeds 88 character limit by 5 characters"
  },
  {
    tenant: "tenant-b",
    date: "2026-01-31",
    file: "src/utils/helpers.ts",
    line_number: 78,
    column_number: 8,
    severity: "critical",
    preview: "Line exceeds 88 character limit by 15 characters"
  },
  {
    tenant: "tenant-c",
    date: "2026-01-31",
    file: "src/pages/Dashboard.tsx",
    line_number: 23,
    column_number: 15,
    severity: "warning",
    preview: "Line exceeds 88 character limit by 3 characters"
  }
];

async function insertSampleData() {
  console.log("🔧 Inserting sample multi-tenant data...");

  try {
    // Insert compliance data
    for (const data of sampleData) {
      const response = await fetch(`${SIM_API_BASE}/api/insert-compliance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": data.tenant
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        console.log(`   ✅ Inserted compliance data for ${data.tenant}`);
      } else {
        console.log(`   ❌ Failed to insert compliance data for ${data.tenant}`);
      }
    }

    // Insert violation data
    for (const violation of sampleViolations) {
      const response = await fetch(`${SIM_API_BASE}/api/log-violation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": violation.tenant
        },
        body: JSON.stringify({
          line: violation.preview,
          file: violation.file,
          line_number: violation.line_number,
          column_number: violation.column_number,
          severity: violation.severity
        })
      });

      if (response.ok) {
        console.log(`   ✅ Inserted violation data for ${violation.tenant}`);
      } else {
        console.log(`   ❌ Failed to insert violation data for ${violation.tenant}`);
      }
    }

    console.log("\n🎯 Sample data insertion complete!");
    console.log("🌐 View the dashboard: http://localhost:3001/multi-tenant-dashboard.html");
    console.log("🔍 Test different tenant filters to see the data isolation!");

  } catch (error) {
    console.error("❌ Error inserting sample data:", error);
  }
}

insertSampleData();
