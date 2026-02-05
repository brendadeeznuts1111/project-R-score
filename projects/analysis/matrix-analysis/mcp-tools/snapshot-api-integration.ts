#!/usr/bin/env bun
// snapshot-api-integration.ts - API endpoints for dashboard integration

// This would be added to your existing api-server.ts

// Import the snapshot functions
// import { snapshotAllTenants, snapshotTenantAudit } from './snapshot-functions';

// Mock implementation for demo
async function snapshotAllTenants() {
  return { results: [], failures: [], summary: "Demo complete" };
}

async function snapshotTenantAudit(tenant: string) {
  return { path: `./snapshots/demo-${tenant}.tar.gz`, sha256: "demo", size: 10240 };
}

// API Routes to add to your server
const snapshotRoutes = {
  // POST /api/snapshots/bulk - Create snapshots for all tenants
  'POST /api/snapshots/bulk': async (req: Request) => {
    try {
      console.log('🚀 Starting bulk snapshot creation...');
      const result = await snapshotAllTenants();
      
      return new Response(JSON.stringify({
        success: true,
        data: result,
        message: result.summary
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },

  // POST /api/snapshots/{tenant} - Create snapshot for specific tenant
  'POST /api/snapshots/:tenant': async (req: Request, params: { tenant: string }) => {
    try {
      const { tenant } = params;
      console.log(`📸 Creating snapshot for tenant: ${tenant}`);
      
      const result = await snapshotTenantAudit(tenant);
      
      return new Response(JSON.stringify({
        success: true,
        data: result,
        message: `Snapshot created for ${tenant}`
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },

  // GET /api/snapshots/status - Get snapshot status and statistics
  'GET /api/snapshots/status': async () => {
    try {
      const fs = require('fs');
      const files = fs.readdirSync("./snapshots").filter((f: string) => f.endsWith('.tar.gz'));
      
      // Analyze snapshots by tenant
      const tenantStats: Record<string, { count: number, totalSize: number, latest: string }> = {};
      
      files.forEach((file: string) => {
        const match = file.match(/audit-snapshot-(.+)-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/);
        if (match) {
          const [, tenant, timestamp] = match;
          if (!tenantStats[tenant]) {
            tenantStats[tenant] = { count: 0, totalSize: 0, latest: '' };
          }
          
          const stats = fs.statSync(`./snapshots/${file}`);
          tenantStats[tenant].count++;
          tenantStats[tenant].totalSize += stats.size;
          
          if (timestamp > tenantStats[tenant].latest) {
            tenantStats[tenant].latest = timestamp;
          }
        }
      });

      const totalSize = Object.values(tenantStats).reduce((sum, stat) => sum + stat.totalSize, 0);
      
      return new Response(JSON.stringify({
        success: true,
        data: {
          totalSnapshots: files.length,
          totalSize: Math.round(totalSize / 1024), // KiB
          tenantBreakdown: tenantStats,
          lastUpdated: new Date().toISOString()
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        data: { totalSnapshots: 0, tenantBreakdown: {} }
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },

  // GET /api/snapshots/{tenant}/download/{filename} - Download specific snapshot
  'GET /api/snapshots/:tenant/download/:filename': async (req: Request, params: { tenant: string, filename: string }) => {
    try {
      const { tenant, filename } = params;
      
      // Security: ensure filename matches expected pattern and tenant
      if (!filename.startsWith(`audit-snapshot-${tenant}-`) || !filename.endsWith('.tar.gz')) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid filename'
        }), { status: 400 });
      }

      const filePath = `./snapshots/${filename}`;
      const file = Bun.file(filePath);
      
      if (!await file.exists()) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Snapshot not found'
        }), { status: 404 });
      }

      return new Response(file, {
        headers: {
          'Content-Type': 'application/gzip',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }), { status: 500 });
    }
  }
};

// Demo usage
console.log("🔗 Snapshot API Integration for Dashboard");
console.log("=" .repeat(45));

console.log("\n📋 Available API Endpoints:");
Object.entries(snapshotRoutes).forEach(([route, handler]) => {
  const [method, path] = route.split(' ');
  console.log(`  ${method.padEnd(4)} ${path}`);
});

console.log("\n🎯 Dashboard Integration Examples:");
console.log("");

console.log("// 1. Trigger bulk snapshots from dashboard");
console.log("fetch('/api/snapshots/bulk', { method: 'POST' })");
console.log("  .then(res => res.json())");
console.log("  .then(data => console.log(data.message));");
console.log("");

console.log("// 2. Get snapshot status for UI");
console.log("fetch('/api/snapshots/status')");
console.log("  .then(res => res.json())");
console.log("  .then(data => {");
console.log("    updateSnapshotUI(data.data);");
console.log("  });");
console.log("");

console.log("// 3. Download specific snapshot");
console.log("const downloadSnapshot = (tenant, filename) => {");
console.log("  window.open(`/api/snapshots/${tenant}/download/${filename}`);");
console.log("};");
console.log("");

console.log("// 4. Real-time progress with WebSocket");
console.log("const ws = new WebSocket('ws://localhost:3333/snapshots');");
console.log("ws.onmessage = (event) => {");
console.log("  const progress = JSON.parse(event.data);");
console.log("  updateProgressBar(progress);");
console.log("};");

console.log("\n🚀 Frontend Integration Benefits:");
console.log("  • Real-time snapshot progress");
console.log("  • Download links for each snapshot");
console.log("  • Tenant-specific snapshot history");
console.log("  • Bulk operations with progress tracking");
console.log("  • Error handling and retry mechanisms");

export { snapshotRoutes };
