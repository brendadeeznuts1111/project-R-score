#!/usr/bin/env bun
/**
 * FactoryWager Nexus Status Monitor with Reality Integration
 * Infrastructure health monitoring enhanced with reality awareness
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
import { RealityCheck } from './config/reality-config';
import { VisualDashboard } from './shared/visual-dashboard';

interface HealthProbe {
  endpoint: string;
  health: '✓' | '⚠' | '✗';
  latency: number;
  status: number;
  error?: string;
}

interface ConfigEntry {
  doc: number;
  key: string;
  value: string;
  type: string;
  anchor?: string;
  alias?: string;
  version?: string;
  bun?: string;
  author?: string;
  status: string;
  registry?: string;
  r2?: string;
  domain?: string;
  riskScore: number;
}

interface NexusStatus {
  score: number;
  endpoints: {
    total: number;
    up: number;
    down: number;
    degraded: number;
  };
  latency: {
    average: number;
    min: number;
    max: number;
  };
  drift: {
    count: number;
    mismatches: string[];
  };
}

interface RealityAwareNexusStatus {
  nexus: NexusStatus;
  reality: {
    mode: "LIVE" | "MIXED" | "SIMULATED";
    r2: string;
    mcp: { installed: number; total: number };
    secrets: { real: number; total: number };
  };
  monitoring: {
    effective_health: number;
    reality_adjusted_score: number;
    recommendations: string[];
    warnings: string[];
  };
}

class RealityAwareNexusStatus {
  private configFile: string;
  private watchMode: boolean;
  private alertThreshold: number;
  private reportsDir = "./.factory-wager/reports";

  constructor(configFile: string, watchMode: boolean = false, alertThreshold: number = 90) {
    this.configFile = configFile;
    this.watchMode = watchMode;
    this.alertThreshold = alertThreshold;

    // Ensure reports directory exists
    if (!existsSync(this.reportsDir)) {
      execSync(`mkdir -p ${this.reportsDir}`, { stdio: 'inherit' });
    }
  }

  async runStatusCheck(): Promise<RealityAwareNexusStatus> {
    console.log("🔌 FactoryWager Reality-Aware Nexus Status Monitor");
    console.log("=" .repeat(60));
    console.log(`Config: ${this.configFile}`);
    console.log(`Time: ${new Date().toISOString()}`);
    console.log("");

    // Phase 1: Reality Check
    console.log("🌐 Phase 1: Infrastructure Reality Assessment");
    console.log("============================================");

    const realityStatus = await RealityCheck.overall.getRealityStatus();

    console.log(`📊 Reality Mode: ${realityStatus.overall}`);
    console.log(`   R2 Storage: ${realityStatus.r2.mode}`);
    console.log(`   MCP Servers: ${realityStatus.mcp.installed}/${realityStatus.mcp.total}`);
    console.log(`   Secrets: ${realityStatus.secrets.real}/${realityStatus.secrets.total}`);
    console.log("");

    // Phase 2: Load Configuration
    console.log("📂 Phase 2: Configuration Loading");
    console.log("===============================");

    const configEntries = this.loadConfiguration();
    console.log(`✅ Loaded ${configEntries.length} configuration entries`);
    console.log("");

    // Phase 3: Probe Infrastructure
    console.log("🔍 Phase 3: Infrastructure Probing");
    console.log("=================================");

    const healthProbes = await this.probeInfrastructure(configEntries);
    const nexusStatus = this.calculateNexusStatus(healthProbes, configEntries);

    this.displayNexusStatus(nexusStatus);
    console.log("");

    // Phase 4: Reality-Integrated Assessment
    console.log("🌐 Phase 4: Reality-Integrated Assessment");
    console.log("=======================================");

    const monitoringAssessment = this.assessMonitoringEffectiveness(nexusStatus, realityStatus);

    console.log(`📊 Effective Health: ${monitoringAssessment.effective_health}/100`);
    console.log(`🔄 Reality-Adjusted Score: ${monitoringAssessment.reality_adjusted_score}/100`);

    if (monitoringAssessment.warnings.length > 0) {
      console.log("⚠️  Warnings:");
      monitoringAssessment.warnings.forEach(warning => console.log(`      • ${warning}`));
    }

    if (monitoringAssessment.recommendations.length > 0) {
      console.log("💡 Recommendations:");
      monitoringAssessment.recommendations.forEach(rec => console.log(`      • ${rec}`));
    }
    console.log("");

    // Phase 5: Alert Check
    if (this.alertThreshold > 0 && monitoringAssessment.effective_health < this.alertThreshold) {
      console.log(`🚨 ALERT: Health score ${monitoringAssessment.effective_health} below threshold ${this.alertThreshold}`);
      if (this.watchMode) {
        console.log("   (Watch mode: continuing monitoring)");
      } else {
        process.exit(1);
      }
    }

    // Phase 6: Generate Report
    const realityAwareNexusStatus: RealityAwareNexusStatus = {
      nexus: nexusStatus,
      reality: {
        mode: realityStatus.overall,
        r2: realityStatus.r2.mode,
        mcp: {
          installed: realityStatus.mcp.installed,
          total: realityStatus.mcp.total
        },
        secrets: {
          real: realityStatus.secrets.real,
          total: realityStatus.secrets.total
        }
      },
      monitoring: monitoringAssessment
    };

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFile = join(this.reportsDir, `fw-nexus-status-reality-${timestamp}.json`);

    writeFileSync(reportFile, JSON.stringify(realityAwareNexusStatus, null, 2));
    console.log(`📄 Reality-aware status report saved: ${reportFile}`);

    // Phase 7: Watch Mode
    if (this.watchMode) {
      console.log("🔄 Watch mode active - checking every 30 seconds");
      console.log("   Press Ctrl+C to stop monitoring");

      const interval = setInterval(async () => {
        console.clear();
        console.log("🔄 FactoryWager Nexus Status Monitor (Watch Mode)");
        console.log(`Last Check: ${new Date().toISOString()}`);
        console.log("");

        const newStatus = await this.runStatusCheck();
        // Log state changes if needed

      }, 30000);

      // Handle graceful shutdown
      process.on('SIGINT', () => {
        clearInterval(interval);
        console.log("\n✅ Monitoring stopped");
        process.exit(0);
      });
    }

    return realityAwareNexusStatus;
  }

  private loadConfiguration(): ConfigEntry[] {
    try {
      const configContent = readFileSync(this.configFile, 'utf8');

      // Mock configuration parsing - in real implementation would use parser-v45
      return [
        {
          doc: 0,
          key: 'development.api.url',
          value: 'http://localhost:4000',
          type: 'scalar',
          status: 'active',
          riskScore: 0
        },
        {
          doc: 0,
          key: 'staging.api.url',
          value: 'https://staging-api.example.com',
          type: 'scalar',
          status: 'active',
          riskScore: 0
        },
        {
          doc: 0,
          key: 'production.api.url',
          value: 'https://api.example.com',
          type: 'scalar',
          status: 'active',
          riskScore: 0
        },
        {
          doc: 0,
          key: 'r2.bucket',
          value: 'factory-wager-artifacts',
          type: 'scalar',
          status: 'active',
          riskScore: 0
        },
        {
          doc: 0,
          key: 'registry.url',
          value: 'https://registry.factory-wager.com',
          type: 'scalar',
          status: 'active',
          riskScore: 0
        }
      ];
    } catch (error) {
      console.error(`❌ Failed to load configuration: ${(error as Error).message}`);
      process.exit(2);
    }
  }

  private async probeInfrastructure(configEntries: ConfigEntry[]): Promise<HealthProbe[]> {
    const probes: HealthProbe[] = [];

    for (const entry of configEntries) {
      if (entry.key.includes('.url') || entry.key.includes('endpoint')) {
        const probe = await this.probeEndpoint(entry.value, entry.key);
        probes.push(probe);
      }
    }

    // Add R2 probe if configured
    const r2Config = configEntries.find(e => e.key.includes('r2'));
    if (r2Config) {
      const r2Probe = await this.probeR2();
      probes.push(r2Probe);
    }

    // Add registry probe if configured
    const registryConfig = configEntries.find(e => e.key.includes('registry'));
    if (registryConfig) {
      const registryProbe = await this.probeRegistry(registryConfig.value);
      probes.push(registryProbe);
    }

    return probes;
  }

  private async probeEndpoint(url: string, key: string): Promise<HealthProbe> {
    const startTime = Date.now();

    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });

      const latency = Date.now() - startTime;

      let health: '✓' | '⚠' | '✗';
      if (response.ok && latency < 500) {
        health = '✓';
      } else if (response.ok && latency >= 500) {
        health = '⚠';
      } else {
        health = '✗';
      }

      return {
        endpoint: key,
        health,
        latency,
        status: response.status
      };
    } catch (error) {
      return {
        endpoint: key,
        health: '✗',
        latency: Date.now() - startTime,
        status: 0,
        error: (error as Error).message
      };
    }
  }

  private async probeR2(): Promise<HealthProbe> {
    const startTime = Date.now();

    try {
      // Mock R2 probe - in real implementation would use AWS SDK
      // For simulation, we'll simulate a successful R2 check
      const latency = Math.random() * 100 + 20; // 20-120ms

      return {
        endpoint: 'r2.storage',
        health: '✓',
        latency: Math.round(latency),
        status: 200
      };
    } catch (error) {
      return {
        endpoint: 'r2.storage',
        health: '✗',
        latency: Date.now() - startTime,
        status: 0,
        error: (error as Error).message
      };
    }
  }

  private async probeRegistry(registryUrl: string): Promise<HealthProbe> {
    const startTime = Date.now();

    try {
      // Mock registry probe - in real implementation would check package registry
      const response = await fetch(`${registryUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });

      const latency = Date.now() - startTime;

      let health: '✓' | '⚠' | '✗';
      if (response.ok && latency < 500) {
        health = '✓';
      } else if (response.ok && latency >= 500) {
        health = '⚠';
      } else {
        health = '✗';
      }

      return {
        endpoint: 'registry.service',
        health,
        latency,
        status: response.status
      };
    } catch (error) {
      return {
        endpoint: 'registry.service',
        health: '✗',
        latency: Date.now() - startTime,
        status: 0,
        error: (error as Error).message
      };
    }
  }

  private calculateNexusStatus(probes: HealthProbe[], configEntries: ConfigEntry[]): NexusStatus {
    const up = probes.filter(p => p.health === '✓').length;
    const down = probes.filter(p => p.health === '✗').length;
    const degraded = probes.filter(p => p.health === '⚠').length;
    const total = probes.length;

    const latencies = probes.map(p => p.latency).filter(l => l > 0);
    const avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
    const minLatency = latencies.length > 0 ? Math.min(...latencies) : 0;
    const maxLatency = latencies.length > 0 ? Math.max(...latencies) : 0;

    // Calculate health score
    let score = 100;
    score -= (10 * down);
    score -= (5 * degraded);

    // Mock drift detection
    const driftCount = 0; // In real implementation would compare config vs live

    return {
      score: Math.max(0, score),
      endpoints: {
        total,
        up,
        down,
        degraded
      },
      latency: {
        average: avgLatency,
        min: minLatency,
        max: maxLatency
      },
      drift: {
        count: driftCount,
        mismatches: []
      }
    };
  }

  private displayNexusStatus(status: NexusStatus): void {
    const mode = "SIMULATED"; // This would come from reality check in real implementation
    console.log(VisualDashboard.generateNexusHeader(mode, status.score, status.endpoints));
    console.log(`Endpoints: ${status.endpoints.up}/${status.endpoints.total} up`);
    console.log(`Latency: ${status.latency.average}ms avg (${status.latency.min}-${status.latency.max}ms)`);
    console.log(`Drift: ${status.drift.count} mismatches`);
  }

  private getHealthLabel(score: number): string {
    if (score >= 90) return 'GREEN';
    if (score >= 70) return 'YELLOW';
    return 'RED';
  }

  private assessMonitoringEffectiveness(nexus: NexusStatus, reality: any) {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Reality-based assessment
    let realityAdjustment = 0;
    if (reality.overall === "SIMULATED") {
      warnings.push("Monitoring simulated endpoints - may not reflect real infrastructure");
      realityAdjustment = -20;
      recommendations.push("Configure real infrastructure for accurate monitoring");
    } else if (reality.overall === "MIXED") {
      warnings.push("Mixed reality infrastructure - partial monitoring coverage");
      realityAdjustment = -10;
      recommendations.push("Complete infrastructure configuration for full monitoring");
    }

    // Component-specific assessment
    if (reality.mcp.installed < reality.mcp.total) {
      warnings.push(`${reality.mcp.total - reality.mcp.installed} MCP servers not monitored`);
      recommendations.push("Install missing MCP servers for complete monitoring");
    }

    if (reality.secrets.real < reality.secrets.total) {
      warnings.push("Some endpoints may be using simulated credentials");
      recommendations.push("Configure real secrets for accurate endpoint monitoring");
    }

    // Performance-based recommendations
    if (nexus.latency.average > 500) {
      warnings.push(`High average latency: ${nexus.latency.average}ms`);
      recommendations.push("Investigate network performance and endpoint optimization");
    }

    if (nexus.endpoints.down > 0) {
      warnings.push(`${nexus.endpoints.down} endpoints down`);
      recommendations.push("Investigate failed endpoints and check service health");
    }

    const effectiveHealth = Math.max(0, Math.min(100, nexus.score + realityAdjustment));
    const realityAdjustedScore = Math.max(0, nexus.score + realityAdjustment);

    return {
      effective_health: effectiveHealth,
      reality_adjusted_score: realityAdjustedScore,
      recommendations,
      warnings
    };
  }
}

// CLI execution
if (import.meta.main) {
  const args = process.argv.slice(2);

  let configFile = 'config.yaml';
  let watchMode = false;
  let alertThreshold = 90;

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--config') {
      configFile = args[++i];
    } else if (arg === '--watch') {
      watchMode = true;
    } else if (arg === '--alert') {
      alertThreshold = parseInt(args[++i]) || 90;
    } else if (!arg.startsWith('--')) {
      configFile = arg;
    }
  }

  const monitor = new RealityAwareNexusStatus(configFile, watchMode, alertThreshold);
  monitor.runStatusCheck().catch(error => {
    console.error("❌ Reality-aware nexus status failed:", error.message);
    process.exit(1);
  });
}

export { RealityAwareNexusStatus };
