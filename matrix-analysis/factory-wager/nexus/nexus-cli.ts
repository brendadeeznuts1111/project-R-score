/**
 * 🎯 FACTORYWAGER NEXUS CLI v5.0 - Infrastructure Monitoring & Stress Testing
 * Enterprise-grade command interface for system validation
 */

import { InfrastructureNexus } from "./infrastructure-monitor";
import { StressTestHarness, runStressTest } from "./stress-test-harness";
import { renderInfrastructureDashboard } from "./render-dashboard";
import { getSystemProfile, quickProbe } from "/Users/nolarose/.factory-wager/system-probe-v431";

interface NexusConfig {
  domain: {
    name: string;
    endpoints: string[];
    healthPath: string;
    expectedStatus: number;
  };
  registry: {
    url: string;
    token: string;
    checkInterval: number;
  };
  r2: {
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    endpoint: string;
  };
}

class NexusCLI {
  private config: NexusConfig;

  constructor() {
    // Default configuration - can be overridden by environment or config file
    this.config = {
      domain: {
        name: "FactoryWager",
        endpoints: [
          "https://factory-wager.com",
          "https://api.factory-wager.com",
          "https://registry.factory-wager.com"
        ],
        healthPath: "/health",
        expectedStatus: 200
      },
      registry: {
        url: process.env.FACTORY_WAGER_REGISTRY || "https://registry.factory-wager.com",
        token: process.env.FACTORY_WAGER_TOKEN || "",
        checkInterval: 30000
      },
      r2: {
        bucket: process.env.R2_BUCKET || "factory-wager-backup",
        region: process.env.R2_REGION || "auto",
        accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
        endpoint: process.env.R2_ENDPOINT || "https://your-account.r2.cloudflarestorage.com"
      }
    };
  }

  /**
   * Display system information
   */
  async showSystemInfo(): Promise<void> {
    const system = await getSystemProfile();

    console.log('🖥️  SYSTEM INFORMATION');
    console.log('='.repeat(50));
    console.log(`Platform: ${system.platform.os} ${system.platform.arch}`);
    console.log(`CPU Cores: ${system.platform.cpus}`);
    console.log(`Bun Version: ${system.runtime.bun}`);
    console.log(`Memory: ${(system.memory.rss / 1024 / 1024).toFixed(1)}MB RSS`);
    console.log(`PID: ${system.runtime.pid}`);

    console.log('\n🛡️  CAPABILITIES');
    console.log('-'.repeat(30));
    Object.entries(system.capabilities).forEach(([key, value]) => {
      console.log(`${value ? '✅' : '❌'} ${key}`);
    });

    console.log(`\nStatus: ${system.capabilities.color && system.capabilities.crc32 ? '🟢 OPTIMAL' : '🟡 DEGRADED'}`);
  }

  /**
   * Quick system probe
   */
  async quickProbe(): Promise<void> {
    const probe = quickProbe();
    console.table(probe);
  }

  /**
   * Run infrastructure health check
   */
  async checkInfrastructure(): Promise<void> {
    console.log('🔍 INFRASTRUCTURE HEALTH CHECK');
    console.log('='.repeat(50));

    const system = await getSystemProfile();
    const nexus = new InfrastructureNexus(
      this.config.domain,
      this.config.registry,
      this.config.r2,
      system
    );

    try {
      const report = await nexus.fullDiagnostic();

      console.log(`\n📊 Report Generated: ${report.timestamp}`);
      console.log(`Overall Status: ${report.overall ? '🟢 HEALTHY' : '🔴 UNHEALTHY'}`);

      // Domain health
      console.log(`\n🌐 Domain: ${report.domain.name}`);
      console.log(`Status: ${report.domain.overall ? '✅' : '❌'}`);
      report.domain.endpoints.forEach(endpoint => {
        const status = endpoint.healthy ? '✅' : '❌';
        console.log(`  ${status} ${endpoint.endpoint} (${endpoint.latency}ms)`);
      });

      // Registry health
      console.log(`\n📦 Registry: ${report.registry.url}`);
      console.log(`Status: ${report.registry.reachable ? '✅' : '❌'}`);
      if (report.registry.reachable) {
        console.log(`Latency: ${report.registry.latency}`);
        console.log(`Packages: ${report.registry.totalPackages} total`);
        console.log(`Integrity: ${report.registry.packages.filter(p => p.crcValid).length}/${report.registry.packages.length} valid`);
      }

      // R2 health
      console.log(`\n☁️  R2 Storage: ${report.r2.bucket}`);
      console.log(`Status: ${report.r2.error ? '❌' : '✅'}`);
      if (!report.r2.error) {
        console.log(`Objects: ${report.r2.objects}`);
        console.log(`Size: ${report.r2.totalSizeMB}MB`);
        console.log(`Integrity: ${report.r2.integrity.checked ? (report.r2.integrity.valid ? '✅' : '❌') : '⏭️'}`);
        console.log(`Latency: ${report.r2.latency}`);
      }

      // Save report
      await Bun.write('./infrastructure-report.json', JSON.stringify(report, null, 2));
      console.log(`\n💾 Report saved to: infrastructure-report.json`);

    } catch (error) {
      console.error('❌ Infrastructure check failed:', error);
    }
  }

  /**
   * Run infrastructure health check with dashboard visualization
   */
  async checkInfrastructureWithDashboard(): Promise<void> {
    console.log('🔍 INFRASTRUCTURE HEALTH CHECK WITH DASHBOARD');
    console.log('='.repeat(60));

    const system = await getSystemProfile();
    const nexus = new InfrastructureNexus(
      this.config.domain,
      this.config.registry,
      this.config.r2,
      system
    );

    try {
      const report = await nexus.fullDiagnostic();

      // Render the beautiful dashboard
      renderInfrastructureDashboard(report);

      // Save report
      await Bun.write('./infrastructure-report.json', JSON.stringify(report, null, 2));
      console.log(`\n💾 Report saved to: infrastructure-report.json`);

    } catch (error) {
      console.error('❌ Infrastructure check failed:', error);
    }
  }

  /**
   * Run dashboard demo with multiple scenarios
   */
  async runDashboardDemo(): Promise<void> {
    console.log('🎨 DASHBOARD DEMO - MULTIPLE SCENARIOS');
    console.log('='.repeat(50));

    try {
      const { runDashboardDemo } = await import("./dashboard-demo");
      await runDashboardDemo();
    } catch (error) {
      console.error('❌ Dashboard demo failed:', error);
    }
  }

  /**
   * Run stress test suite
   */
  async runStressTest(): Promise<void> {
    console.log('🚀 STRESS TEST SUITE');
    console.log('='.repeat(50));

    try {
      await runStressTest();
    } catch (error) {
      console.error('❌ Stress test failed:', error);
    }
  }

  /**
   * Run targeted 100k row test
   */
  async run100kTest(): Promise<void> {
    console.log('🎯 100K ROW TARGETED TEST');
    console.log('='.repeat(50));

    const system = await getSystemProfile();
    const harness = new StressTestHarness(system);

    const config = {
      rowCount: 100000,
      columnCount: 10,
      includeUnicode: true,
      includeEmojis: true,
      includeCJK: true,
      parallelWorkers: 1,
    };

    const result = await harness.executeStressTest(config);

    console.log('\n📊 100K ROW TEST RESULTS');
    console.log('-'.repeat(40));
    console.log(`Total Time: ${result.metrics.totalTime.toFixed(2)}ms`);
    console.log(`Target (≤120ms): ${result.metrics.totalTime <= 120 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Throughput: ${Math.round(result.metrics.throughput.rowsPerSecond).toLocaleString()} rows/sec`);
    console.log(`Memory Peak: ${(result.metrics.memoryUsage.peak / 1024 / 1024).toFixed(1)}MB`);

    // Performance breakdown
    console.log('\n⚡ Performance Breakdown:');
    console.log(`  Color: ${(result.performance.colorConversion * 1000).toFixed(2)}μs/op`);
    console.log(`  Unicode: ${(result.performance.unicodeProcessing * 1000).toFixed(2)}μs/op`);
    console.log(`  CRC32: ${(result.performance.crc32Hashing * 1000).toFixed(2)}μs/op`);
    console.log(`  Rendering: ${(result.performance.tableRendering * 1000).toFixed(2)}μs/row`);
  }

  /**
   * Display help information
   */
  showHelp(): void {
    console.log('🎯 FACTORYWAGER NEXUS CLI v5.0');
    console.log('Enterprise Infrastructure Monitoring & Stress Testing\n');

    console.log('Usage: nexus <command> [options]\n');

    console.log('Commands:');
    console.log('  system          Show detailed system information');
    console.log('  probe           Quick system probe (table format)');
    console.log('  infra           Run infrastructure health check');
    console.log('  dashboard       Run infrastructure check with dashboard');
    console.log('  demo            Show dashboard demo with scenarios');
    console.log('  stress          Run complete stress test suite');
    console.log('  100k            Run targeted 100k row test');
    console.log('  help            Show this help message\n');

    console.log('Examples:');
    console.log('  nexus system    # Show system capabilities');
    console.log('  nexus probe     # Quick capability check');
    console.log('  nexus infra     # Check infrastructure health');
    console.log('  nexus dashboard # Beautiful dashboard visualization');
    console.log('  nexus demo      # Dashboard demo with scenarios');
    console.log('  nexus stress    # Full stress test suite');
    console.log('  nexus 100k      # 100k row validation test\n');

    console.log('Environment Variables:');
    console.log('  FACTORY_WAGER_REGISTRY    Registry URL');
    console.log('  FACTORY_WAGER_TOKEN       Registry auth token');
    console.log('  R2_BUCKET                 R2 bucket name');
    console.log('  R2_REGION                 R2 region');
    console.log('  R2_ACCESS_KEY_ID          R2 access key');
    console.log('  R2_SECRET_ACCESS_KEY      R2 secret key');
    console.log('  R2_ENDPOINT               R2 endpoint URL');
  }
}

// CLI execution
async function main() {
  const cli = new NexusCLI();
  const command = process.argv[2];

  switch (command) {
    case 'system':
      await cli.showSystemInfo();
      break;
    case 'probe':
      await cli.quickProbe();
      break;
    case 'infra':
      await cli.checkInfrastructure();
      break;
    case 'dashboard':
      await cli.checkInfrastructureWithDashboard();
      break;
    case 'demo':
      await cli.runDashboardDemo();
      break;
    case 'stress':
      await cli.runStressTest();
      break;
    case '100k':
      await cli.run100kTest();
      break;
    case 'help':
    default:
      cli.showHelp();
      break;
  }
}

if (import.meta.main) {
  main().catch(console.error);
}

export { main as runNexusCLI };
