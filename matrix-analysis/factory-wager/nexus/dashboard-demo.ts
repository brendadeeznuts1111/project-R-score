/**
 * 🎨 FACTORYWAGER DASHBOARD DEMO v5.0 - Chromatic Infrastructure Visualization
 * HSL-powered enterprise dashboard with Tabular v4.3 integration
 */

import { renderInfrastructureDashboard } from "./render-dashboard";
import type { InfrastructureReport } from "./infrastructure-monitor";

// Mock data for dashboard demonstration
const mockReport: InfrastructureReport = {
  timestamp: new Date().toISOString(),
  system: {
    runtime: { bun: "1.3.8", v8: "13.6.233.10-node.18", pid: 74009 },
    platform: { os: "darwin", arch: "arm64", cpus: 10 },
    memory: { rss: 30 * 1024 * 1024, heapUsed: 205 * 1024, heapTotal: 50 * 1024 * 1024 },
    capabilities: {
      color: true,
      crypto: true,
      sha256: false,
      crc32: true,
      stringWidth: true,
    },
  },
  domain: {
    name: "FactoryWager",
    overall: true,
    checkedAt: new Date().toISOString(),
    endpoints: [
      {
        endpoint: "https://factory-wager.com/health",
        status: 200,
        latency: "42.15",
        healthy: true,
        crc32: "a1b2c3d4",
      },
      {
        endpoint: "https://api.factory-wager.com/health",
        status: 200,
        latency: "38.72",
        healthy: true,
        crc32: "e5f6g7h8",
      },
      {
        endpoint: "https://registry.factory-wager.com/health",
        status: 200,
        latency: "45.33",
        healthy: true,
        crc32: "i9j0k1l2",
      },
    ],
  },
  registry: {
    url: "https://registry.factory-wager.com",
    reachable: true,
    latency: "125.45ms",
    totalPackages: 1247,
    packages: [
      {
        name: "@factory/core",
        version: "4.3.1",
        author: "nolarose",
        authorHash: "bdae9bd8",
        crcValid: true,
        published: "2026-02-01T08:14:00Z",
      },
      {
        name: "@factory/tabular",
        version: "4.3.0",
        author: "system",
        authorHash: "c94d118b",
        crcValid: true,
        published: "2026-01-28T15:30:00Z",
      },
      {
        name: "@factory/color",
        version: "2.1.5",
        author: "designer",
        authorHash: "8d93d649",
        crcValid: false,
        published: "2026-01-25T10:15:00Z",
      },
      {
        name: "@factory/crypto",
        version: "1.8.2",
        author: "security",
        authorHash: "a7b8c9d0",
        crcValid: true,
        published: "2026-01-22T14:45:00Z",
      },
      {
        name: "@factory/cli",
        version: "5.0.0",
        author: "devops",
        authorHash: "e1f2g3h4",
        crcValid: true,
        published: "2026-01-20T09:30:00Z",
      },
    ],
  },
  r2: {
    bucket: "factory-wager-backup",
    region: "auto",
    objects: 1847,
    totalSizeMB: "2.45",
    avgSizeKB: "1.36",
    sampleObject: "backup-2026-02-01.tar.gz",
    integrity: { checked: true, valid: true },
    latency: "89.12ms",
  },
  overall: true,
};

/**
 * Demo scenarios for different dashboard states
 */
const demoScenarios = {
  operational: mockReport,
  
  degraded: {
    ...mockReport,
    overall: false,
    domain: {
      ...mockReport.domain,
      overall: false,
      endpoints: [
        ...mockReport.domain.endpoints.slice(0, 2),
        {
          endpoint: "https://registry.factory-wager.com/health",
          status: 0,
          latency: "-1",
          healthy: false,
          error: "Connection timeout",
        },
      ],
    },
    registry: {
      ...mockReport.registry,
      reachable: false,
      error: "Authentication failed",
      packages: [],
      totalPackages: 0,
    },
  },
  
  maintenance: {
    ...mockReport,
    system: {
      ...mockReport.system,
      capabilities: {
        ...mockReport.system.capabilities,
        crc32: false, // Simulate hardware acceleration disabled
      },
    },
    r2: {
      ...mockReport.r2,
      integrity: { checked: false, valid: false },
    },
  },
};

/**
 * Render dashboard demo with multiple scenarios
 */
async function runDashboardDemo() {
  console.log('🎨 FACTORYWAGER DASHBOARD DEMO v5.0');
  console.log('HSL Chromatic Infrastructure Visualization\n');
  
  // Scenario 1: Operational
  console.log('🟢 SCENARIO 1: FULLY OPERATIONAL');
  console.log('='.repeat(50));
  renderInfrastructureDashboard(demoScenarios.operational);
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Scenario 2: Degraded
  console.log('\n\n🔴 SCENARIO 2: DEGRADED STATE');
  console.log('='.repeat(50));
  renderInfrastructureDashboard(demoScenarios.degraded);
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Scenario 3: Maintenance
  console.log('\n\n🟡 SCENARIO 3: MAINTENANCE MODE');
  console.log('='.repeat(50));
  renderInfrastructureDashboard(demoScenarios.maintenance);
  
  console.log('\n\n🎯 DASHBOARD DEMO COMPLETE');
  console.log('Features demonstrated:');
  console.log('  • HSL chromatic theming');
  console.log('  • Real-time status indicators');
  console.log('  • CRC32 integrity validation');
  console.log('  • Tabular v4.3 package listing');
  console.log('  • Multi-scenario state rendering');
  console.log('  • ARM64 hardware acceleration status');
}

// CLI execution
if (import.meta.main) {
  runDashboardDemo().catch(console.error);
}

export { runDashboardDemo };
