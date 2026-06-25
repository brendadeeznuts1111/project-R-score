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

    console.info('🖥️  SYSTEM INFORMATION');
    console.info('='.repeat(50));
    console.info(`Platform: ${system.platform.os} ${system.platform.arch}`);
    console.info(`CPU Cores: ${system.platform.cpus}`);
    console.info(`Bun Version: ${system.runtime.bun}`);
    console.info(`Memory: ${(system.memory.rss / 1024 / 1024).toFixed(1)}MB RSS`);
    console.info(`PID: ${system.runtime.pid}`);

    console.info('\n🛡️  CAPABILITIES');
    console.info('-'.repeat(30));
    Object.entries(system.capabilities).forEach(([key, value]) => {
      console.info(`${value ? '✅' : '❌'} ${key}`);
    });

    console.info(`\nStatus: ${system.capabilities.color && system.capabilities.crc32 ? '🟢 OPTIMAL' : '🟡 DEGRADED'}`);
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
    console.info('🔍 INFRASTRUCTURE HEALTH CHECK');
    console.info('='.repeat(50));

    const system = await getSystemProfile();
    const nexus = new InfrastructureNexus(
      this.config.domain,
      this.config.registry,
      this.config.r2,
      system
    );

    try {
      const report = await nexus.fullDiagnostic();

      console.info(`\n📊 Report Generated: ${report.timestamp}`);
      console.info(`Overall Status: ${report.overall ? '🟢 HEALTHY' : '🔴 UNHEALTHY'}`);

      // Domain health
      console.info(`\n🌐 Domain: ${report.domain.name}`);
      console.info(`Status: ${report.domain.overall ? '✅' : '❌'}`);
      report.domain.endpoints.forEach(endpoint => {
        const status = endpoint.healthy ? '✅' : '❌';
        console.info(`  ${status} ${endpoint.endpoint} (${endpoint.latency}ms)`);
      });

      // Registry health
      console.info(`\n📦 Registry: ${report.registry.url}`);
      console.info(`Status: ${report.registry.reachable ? '✅' : '❌'}`);
      if (report.registry.reachable) {
        console.info(`Latency: ${report.registry.latency}`);
        console.info(`Packages: ${report.registry.totalPackages} total`);
        console.info(`Integrity: ${report.registry.packages.filter(p => p.crcValid).length}/${report.registry.packages.length} valid`);
      }

      // R2 health
      console.info(`\n☁️  R2 Storage: ${report.r2.bucket}`);
      console.info(`Status: ${report.r2.error ? '❌' : '✅'}`);
      if (!report.r2.error) {
        console.info(`Objects: ${report.r2.objects}`);
        console.info(`Size: ${report.r2.totalSizeMB}MB`);
        console.info(`Integrity: ${report.r2.integrity.checked ? (report.r2.integrity.valid ? '✅' : '❌') : '⏭️'}`);
        console.info(`Latency: ${report.r2.latency}`);
      }

      // Save report
      await Bun.write('./infrastructure-report.json', JSON.stringify(report, null, 2));
      console.info(`\n💾 Report saved to: infrastructure-report.json`);

    } catch (error) {
      console.error('❌ Infrastructure check failed:', error);
    }
  }

  /**
   * Run infrastructure health check with dashboard visualization
   */
  async checkInfrastructureWithDashboard(): Promise<void> {
    console.info('🔍 INFRASTRUCTURE HEALTH CHECK WITH DASHBOARD');
    console.info('='.repeat(60));

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
      console.info(`\n💾 Report saved to: infrastructure-report.json`);

    } catch (error) {
      console.error('❌ Infrastructure check failed:', error);
    }
  }

  /**
   * Run dashboard demo with multiple scenarios
   */
  async runDashboardDemo(): Promise<void> {
    console.info('🎨 DASHBOARD DEMO - MULTIPLE SCENARIOS');
    console.info('='.repeat(50));

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
    console.info('🚀 STRESS TEST SUITE');
    console.info('='.repeat(50));

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
    console.info('🎯 100K ROW TARGETED TEST');
    console.info('='.repeat(50));

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

    console.info('\n📊 100K ROW TEST RESULTS');
    console.info('-'.repeat(40));
    console.info(`Total Time: ${result.metrics.totalTime.toFixed(2)}ms`);
    console.info(`Target (≤120ms): ${result.metrics.totalTime <= 120 ? '✅ PASS' : '❌ FAIL'}`);
    console.info(`Throughput: ${Math.round(result.metrics.throughput.rowsPerSecond).toLocaleString()} rows/sec`);
    console.info(`Memory Peak: ${(result.metrics.memoryUsage.peak / 1024 / 1024).toFixed(1)}MB`);

    // Performance breakdown
    console.info('\n⚡ Performance Breakdown:');
    console.info(`  Color: ${(result.performance.colorConversion * 1000).toFixed(2)}μs/op`);
    console.info(`  Unicode: ${(result.performance.unicodeProcessing * 1000).toFixed(2)}μs/op`);
    console.info(`  CRC32: ${(result.performance.crc32Hashing * 1000).toFixed(2)}μs/op`);
    console.info(`  Rendering: ${(result.performance.tableRendering * 1000).toFixed(2)}μs/row`);
  }

  /**
   * Display help information
   */
  showHelp(): void {
    console.info('🎯 FACTORYWAGER NEXUS CLI v5.0');
    console.info('Enterprise Infrastructure Monitoring & Stress Testing\n');

    console.info('Usage: nexus <command> [options]\n');

    console.info('Commands:');
    console.info('  system          Show detailed system information');
    console.info('  probe           Quick system probe (table format)');
    console.info('  infra           Run infrastructure health check');
    console.info('  dashboard       Run infrastructure check with dashboard');
    console.info('  demo            Show dashboard demo with scenarios');
    console.info('  stress          Run complete stress test suite');
    console.info('  100k            Run targeted 100k row test');
    console.info('  help            Show this help message\n');

    console.info('Examples:');
    console.info('  nexus system    # Show system capabilities');
    console.info('  nexus probe     # Quick capability check');
    console.info('  nexus infra     # Check infrastructure health');
    console.info('  nexus dashboard # Beautiful dashboard visualization');
    console.info('  nexus demo      # Dashboard demo with scenarios');
    console.info('  nexus stress    # Full stress test suite');
    console.info('  nexus 100k      # 100k row validation test\n');

    console.info('Environment Variables:');
    console.info('  FACTORY_WAGER_REGISTRY    Registry URL');
    console.info('  FACTORY_WAGER_TOKEN       Registry auth token');
    console.info('  R2_BUCKET                 R2 bucket name');
    console.info('  R2_REGION                 R2 region');
    console.info('  R2_ACCESS_KEY_ID          R2 access key');
    console.info('  R2_SECRET_ACCESS_KEY      R2 secret key');
    console.info('  R2_ENDPOINT               R2 endpoint URL');
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
