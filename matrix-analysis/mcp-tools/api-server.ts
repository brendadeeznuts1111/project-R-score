#!/usr/bin/env bun
// mcp-tools/api-server.ts - Historical compliance API server

import { Database } from "bun:sqlite";

const API_PORT = process.env.API_PORT || 3333;

// Database connection manager to prevent leaks
class DatabaseManager {
  private static instance: Database | null = null;

  static getInstance(): Database {
    if (!this.instance) {
      this.instance = new Database("./data/tier1380.db");
      console.log("📊 Database connection established");
    }
    return this.instance;
  }

  static close(): void {
    if (this.instance) {
      this.instance.close();
      this.instance = null;
      console.log("📊 Database connection closed");
    }
  }
}

const db = DatabaseManager.getInstance();

// CORS middleware
function addCorsHeaders(response: Response): Response {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, x-tenant-id, Authorization");
  return response;
}

// Validate tenant from headers (supports multi-tenant)
function getTenantFromRequest(request: Request): string | null {
  const tenantId = request.headers.get("x-tenant-id");
  if (!tenantId) {
    return null;
  }

  // Handle special cases
  if (tenantId === "*" || tenantId === "all") {
    return "*"; // Global admin access
  }

  return tenantId;
}

// API Routes
const server = Bun.serve({
  port: API_PORT,
  async fetch(request) {
    const url = new URL(request.url);
    const method = request.method;

    // Handle CORS preflight
    if (method === "OPTIONS") {
      return addCorsHeaders(new Response(null, { status: 200 }));
    }

    try {
      // Route: GET /api/tenants (for dashboard dropdown) - no tenant validation required
      if (url.pathname === "/api/tenants" && method === "GET") {
        try {
          // Get distinct tenants from violations table
          const tenantQuery = db.query("SELECT DISTINCT tenant FROM violations ORDER BY tenant ASC");
          const tenantRows = tenantQuery.all() as Array<{ tenant: string }>;

          const tenants = tenantRows.map(row => row.tenant);

          return addCorsHeaders(
            Response.json({
              tenants: ["all", ...tenants], // "all" = global view
              default: "all"
            })
          );
        } catch (error) {
          // Fallback if table doesn't exist yet
          return addCorsHeaders(
            Response.json({
              tenants: ["all", "tenant-a", "tenant-b", "tenant-c"],
              default: "all"
            })
          );
        }
      }

      // Get tenant from headers (for all other endpoints)
      const tenant = getTenantFromRequest(request);
      if (!tenant) {
        return addCorsHeaders(
          Response.json({ error: "Missing x-tenant-id header" }, { status: 400 })
        );
      }

      // Route: GET /api/historical-compliance (OMEGA compliant)
      if (url.pathname === "/api/historical-compliance" && method === "GET") {
        // Simulate admin context check (in production, use proper auth)
        const isGlobalAdmin = url.searchParams.get("admin") === "true";

        let query = "SELECT * FROM monthly_compliance";
        let params: any[] = [];

        if (tenant !== "*" && !isGlobalAdmin) {
          // Handle comma-separated multiple tenants
          if (tenant.includes(',')) {
            const tenantList = tenant.split(',').map(t => t.trim());
            const placeholders = tenantList.map(() => '?').join(',');
            query += ` WHERE tenant IN (${placeholders})`;
            params.push(...tenantList);
          } else {
            query += " WHERE tenant = ?";
            params.push(tenant);
          }
        }

        query += " ORDER BY month ASC LIMIT 12";

        const dbQuery = db.query(query);
        const rows = dbQuery.all(...params) as Array<{
          id: string;
          tenant: string;
          month: string;
          compliance_score: number;
          total_lines: number;
          violation_count: number;
          max_width: number;
          created_at: string;
        }>;

        const history = rows.map(r => ({
          month: r.month,
          score: Math.round(r.compliance_score),
          violations: r.violation_count,
          total: r.total_lines,
          maxWidth: r.max_width,
        }));

        return addCorsHeaders(
          Response.json({
            tenant,
            isGlobalAdmin,
            history,
            summary: {
              averageCompliance: history.length > 0 ?
                Math.round(history.reduce((sum, h) => sum + h.score, 0) / history.length) : 0,
              totalViolations: history.reduce((sum, h) => sum + h.violations, 0),
              monthsTracked: history.length,
              trend: history.length >= 2 ?
                Math.round(((history[history.length - 1].score - history[0].score) / history[0].score) * 100) : 0
            }
          })
        );
      }

      // Route: GET /api/recent-violations
      if (url.pathname === "/api/recent-violations" && method === "GET") {
        const days = parseInt(url.searchParams.get("days") || "7");
        const severity = url.searchParams.get("severity"); // optional filter

        let queryStr = `
          SELECT date, file, line_number, column_number, severity, preview
          FROM daily_violations
          WHERE date >= date('now', '-${days} days')
        `;
        let params: any[] = [];

        // Handle tenant filtering
        if (tenant !== "*") {
          if (tenant.includes(',')) {
            const tenantList = tenant.split(',').map(t => t.trim());
            const placeholders = tenantList.map(() => '?').join(',');
            queryStr += ` AND tenant IN (${placeholders})`;
            params.push(...tenantList);
          } else {
            queryStr += " AND tenant = ?";
            params.push(tenant);
          }
        }

        if (severity) {
          queryStr += " AND severity = ?";
          params.push(severity);
        }

        queryStr += " ORDER BY date DESC, line_number LIMIT 50";

        const query = db.query(queryStr);
        const results = query.all(...params) as Array<{
          date: string;
          file: string;
          line_number: number;
          column_number: number;
          severity: string;
          preview: string;
        }>;

        return addCorsHeaders(
          Response.json({
            tenant,
            violations: results,
            summary: {
              total: results.length,
              critical: results.filter(v => v.severity === "critical").length,
              warning: results.filter(v => v.severity === "warning").length
            }
          })
        );
      }

      // Route: GET /api/tenant-metrics
      if (url.pathname === "/api/tenant-metrics" && method === "GET") {
        const query = db.query(`
          SELECT metric_date, total_files, total_lines, critical_violations, warning_violations, compliance_score
          FROM tenant_metrics
          WHERE tenant = ?
          ORDER BY metric_date DESC
          LIMIT 30
        `);

        const results = query.all(tenant) as Array<{
          metric_date: string;
          total_files: number;
          total_lines: number;
          critical_violations: number;
          warning_violations: number;
          compliance_score: number;
        }>;

        return addCorsHeaders(
          Response.json({
            tenant,
            metrics: results.reverse(),
            current: results[0] || null
          })
        );
      }

      // Route: GET /api/compliance-summary
      if (url.pathname === "/api/compliance-summary" && method === "GET") {
        const query = db.query(`
          SELECT
            AVG(compliance_score) as avg_compliance,
            SUM(total_lines) as total_lines,
            SUM(violation_count) as total_violations,
            COUNT(*) as months_tracked
          FROM monthly_compliance
          WHERE tenant = ?
        `);

        const result = query.get(tenant) as {
          avg_compliance: number;
          total_lines: number;
          total_violations: number;
          months_tracked: number;
        };

        // Get top violating files
        const topFilesQuery = db.query(`
          SELECT file, COUNT(*) as violation_count
          FROM daily_violations
          WHERE tenant = ? AND date >= date('now', '-30 days')
          GROUP BY file
          ORDER BY violation_count DESC
          LIMIT 5
        `);

        const topFiles = topFilesQuery.all(tenant) as Array<{
          file: string;
          violation_count: number;
        }>;

        return addCorsHeaders(
          Response.json({
            tenant,
            summary: {
              averageCompliance: Math.round(result.avg_compliance * 100) / 100,
              totalLines: result.total_lines,
              totalViolations: result.total_violations,
              monthsTracked: result.months_tracked,
              violationRate: result.total_lines > 0 ?
                Math.round((result.total_violations / result.total_lines) * 10000) / 100 : 0
            },
            topViolatingFiles: topFiles
          })
        );
      }

      // Route: POST /api/insert-compliance (for testing)
      if (url.pathname === "/api/insert-compliance" && method === "POST") {
        const body = await request.json();
        const { month, compliance_score, total_lines, violation_count } = body;

        if (!month || compliance_score === undefined || !total_lines || violation_count === undefined) {
          return addCorsHeaders(
            Response.json({ error: "Missing required fields: month, compliance_score, total_lines, violation_count" }, { status: 400 })
          );
        }

        try {
          db.run(`
            INSERT OR REPLACE INTO monthly_compliance (tenant, month, compliance_score, total_lines, violation_count)
            VALUES (?, ?, ?, ?, ?)
          `, [tenant, month, compliance_score, total_lines, violation_count]);

          return addCorsHeaders(
            Response.json({ success: true, message: "Compliance data inserted successfully" })
          );
        } catch (error) {
          return addCorsHeaders(
            Response.json({ error: "Failed to insert data", details: error }, { status: 500 })
          );
        }
      }

      // Default 404
      return addCorsHeaders(
        Response.json({ error: "Endpoint not found" }, { status: 404 })
      );

    } catch (error) {
      console.error("API Error:", error);
      return addCorsHeaders(
        Response.json({ error: "Internal server error", details: error }, { status: 500 })
      );
    }
  }
});

console.log(`🚀 Tier-1380 API Server running on port ${server.port}`);
console.log(`📊 Available endpoints:`);
console.log(`  GET  /api/tenants`);
console.log(`  GET  /api/historical-compliance?months=12`);
console.log(`  GET  /api/recent-violations?days=7&severity=critical`);
console.log(`  GET  /api/tenant-metrics`);
console.log(`  GET  /api/compliance-summary`);
console.log(`  POST /api/insert-compliance`);
console.log(`\n🔧 Test with:`);
console.log(`  curl http://localhost:${API_PORT}/api/tenants -H "x-tenant-id: *"`);
console.log(`  curl http://localhost:${API_PORT}/api/historical-compliance -H "x-tenant-id: tenant-a"`);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down API server...');
  DatabaseManager.close();
  server.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down API server...');
  DatabaseManager.close();
  server.stop();
  process.exit(0);
});
