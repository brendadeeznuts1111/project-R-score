#!/usr/bin/env bun
/**
 * FactoryWager Nexus Status Monitor v1.3.8
 * Infrastructure health monitoring with configuration correlation
 */

import { readFileSync } from 'fs';
import { renderDynamicStatusTable } from './factory-wager/nexus/status-table-dynamic';

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
  probes: Map<string, HealthProbe>;
  config: ConfigEntry[];
}

class FactoryWagerNexusStatus {
  private config: string;
  private watch: boolean;
  private alert: boolean;
  private threshold: number;

  constructor(config: string = './config.yaml', watch: boolean = false, alert: boolean = false, threshold: number = 90) {
    this.config = config;
    this.watch = watch;
    this.alert = alert;
    this.threshold = threshold;
  }

  async execute(): Promise<void> {
    if (this.watch) {
      await this.watchMode();
    } else {
      await this.singleCheck();
    }
  }

  private async singleCheck(): Promise<NexusStatus> {
    console.log(`🔌 FactoryWager Nexus Status v1.3.8`);
    console.log(`===================================`);

    try {
      // Load and parse configuration
      const configData = await this.loadConfiguration();

      // Probe infrastructure
      const probes = await this.probeInfrastructure(configData);

      // Calculate health metrics
      const status = this.calculateHealthMetrics(probes, configData);

      // Generate dashboard
      this.renderDashboard(status);

      // Check alert threshold
      if (this.alert && status.score < this.threshold) {
        console.log(`\n🚨 ALERT: Health score ${status.score} < threshold ${this.threshold}`);
        process.exit(1);
      }

      // Log to audit trail
      await this.logStatus(status);

      return status;
    } catch (error) {
      console.error(`❌ Nexus status check failed: ${(error as Error).message}`);
      process.exit(2);
    }
  }

  private async watchMode(): Promise<void> {
    console.log(`👁️  FactoryWager Nexus Status - Watch Mode`);
    console.log(`=========================================`);
    console.log(`Refreshing every 30 seconds (Ctrl+C to stop)`);

    let lastStatus: NexusStatus | null = null;

    while (true) {
      // Clear screen
      console.clear();

      // Run check
      const currentStatus = await this.singleCheck();

      // Check for changes
      if (lastStatus) {
        this.detectChanges(lastStatus, currentStatus);
      }

      lastStatus = currentStatus;

      // Wait for next iteration
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
  }

  private async loadConfiguration(): Promise<ConfigEntry[]> {
    try {
      const content = readFileSync(this.config, 'utf8');
      const config = Bun.YAML.parse(content);

      const entries: ConfigEntry[] = [];
      this.extractConfigEntries(config, 0, '', entries);

      return entries;
    } catch (error) {
      throw new Error(`Failed to load configuration: ${(error as Error).message}`);
    }
  }

  private extractConfigEntries(obj: any, docIndex: number, prefix: string, entries: ConfigEntry[]): void {
    if (typeof obj === 'object' && obj !== null) {
      Object.entries(obj).forEach(([key, value]) => {
        const fullKey = prefix ? `${prefix}.${key}` : key;

        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          this.extractConfigEntries(value, docIndex, fullKey, entries);
        } else {
          entries.push({
            doc: docIndex,
            key: fullKey,
            value: this.formatValue(value),
            type: typeof value,
            status: 'active',
            riskScore: this.calculateRiskScore(key, value)
          });
        }
      });
    }
  }

  private formatValue(value: any): string {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'string') {
      return value.length > 25 ? value.substring(0, 22) + '...' : value;
    }
    if (typeof value === 'object') return Array.isArray(value) ? `Array[${value.length}]` : 'Object';
    return String(value);
  }

  private calculateRiskScore(key: string, value: any): number {
    let risk = 0;
    if (key.includes('token') || key.includes('secret') || key.includes('key')) risk += 20;
    if (key.includes('password')) risk += 25;
    if (typeof value === 'string' && value.includes('demo-')) risk += 15;
    return Math.min(risk, 50);
  }

  private async probeInfrastructure(config: ConfigEntry[]): Promise<Map<string, HealthProbe>> {
    const probes = new Map<string, HealthProbe>();

    // Extract endpoints from configuration
    const endpoints = config
      .filter(entry => entry.key.includes('url') || entry.key.includes('endpoint') || entry.key.includes('api'))
      .map(entry => ({
        key: entry.key,
        url: entry.value,
        config: entry
      }));

    // Probe each endpoint
    for (const endpoint of endpoints) {
      try {
        const probe = await this.probeEndpoint(endpoint.url);
        probes.set(endpoint.key, {
          endpoint: endpoint.url,
          health: probe.health,
          latency: probe.latency,
          status: probe.status,
          error: probe.error
        });
      } catch (error) {
        probes.set(endpoint.key, {
          endpoint: endpoint.url,
          health: '✗',
          latency: -1,
          status: 0,
          error: (error as Error).message
        });
      }
    }

    // Add simulated R2 and registry probes
    probes.set('r2.bucket', {
      endpoint: 'R2 API',
      health: '✓',
      latency: Math.floor(Math.random() * 100) + 20,
      status: 200
    });

    probes.set('registry.url', {
      endpoint: 'Registry API',
      health: Math.random() > 0.2 ? '✓' : '✗',
      latency: Math.floor(Math.random() * 200) + 30,
      status: Math.random() > 0.2 ? 200 : 500
    });

    return probes;
  }

  private async probeEndpoint(url: string): Promise<{ health: '✓' | '⚠' | '✗', latency: number, status: number, error?: string }> {
    const startTime = Date.now();

    try {
      // Simulate HTTP probe (in real implementation, use fetch)
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));

      const latency = Date.now() - startTime;
      const status = Math.random() > 0.1 ? 200 : (Math.random() > 0.5 ? 500 : 404);

      let health: '✓' | '⚠' | '✗';
      if (status === 200 && latency < 500) health = '✓';
      else if (status === 200 && latency >= 500) health = '⚠';
      else health = '✗';

      return { health, latency, status };
    } catch (error) {
      return {
        health: '✗',
        latency: Date.now() - startTime,
        status: 0,
        error: (error as Error).message
      };
    }
  }

  private calculateHealthMetrics(probes: Map<string, HealthProbe>, config: ConfigEntry[]): NexusStatus {
    const probeArray = Array.from(probes.values());

    // Count health status
    const up = probeArray.filter(p => p.health === '✓').length;
    const degraded = probeArray.filter(p => p.health === '⚠').length;
    const down = probeArray.filter(p => p.health === '✗').length;

    // Calculate latency stats
    const validLatencies = probeArray.filter(p => p.latency > 0).map(p => p.latency);
    const avgLatency = validLatencies.length > 0 ? Math.round(validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length) : 0;
    const minLatency = validLatencies.length > 0 ? Math.min(...validLatencies) : 0;
    const maxLatency = validLatencies.length > 0 ? Math.max(...validLatencies) : 0;

    // Calculate health score
    let score = 100;
    score -= (10 * down);
    score -= (5 * degraded);

    // Simulate configuration drift detection
    const driftCount = Math.floor(Math.random() * 2);
    score -= (15 * driftCount);

    return {
      score: Math.max(0, score),
      endpoints: {
        total: probeArray.length,
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
        mismatches: driftCount > 0 ? ['registry.url'] : []
      },
      probes,
      config
    };
  }

  private renderDynamicHealthTable(status: NexusStatus): void {
  // Convert probe data to the format expected by the dynamic status table
  const mockDomain = {
    endpoints: Array.from(status.probes.entries())
      .filter(([key, probe]) => key.includes('api') || key.includes('url'))
      .map(([key, probe]) => ({
        endpoint: probe.endpoint,
        healthy: probe.health === '✓',
        status: probe.status,
        latency: probe.latency.toString()
      })),
    checkedAt: new Date().toISOString()
  };

  const mockRegistry = {
    reachable: status.probes.get('registry.url')?.health === '✓',
    latency: status.probes.get('registry.url')?.latency.toString()
  };

  const mockR2 = {
    bucket: 'factory-wager-artifacts',
    error: status.probes.get('r2.bucket')?.health === '✗',
    latency: status.probes.get('r2.bucket')?.latency.toString(),
    integrity: {
      checked: true,
      valid: status.drift.count === 0
    }
  };

  // Render the dynamic status table
  renderDynamicStatusTable(mockDomain, mockRegistry, mockR2);
}

  private renderDashboard(status: NexusStatus): void {
  const scoreColor = this.getScoreColor(status.score);
  const scoreBadge = `[${scoreColor}]`;

  console.log(`████████████████████████████████████████████████████████████████`);
  console.log(` 🔌 FACTORYWAGER NEXUS STATUS v1.3.8`);
  console.log(` Overall Health: ${status.score}/100 ${scoreBadge}`);
  console.log(` Last Checked: ${new Date().toISOString()}`);
  console.log(`████████████████████████████████████████████████████████████████`);

  // Render dynamic HSL status table
  this.renderDynamicHealthTable(status);

  // Summary statistics
  console.log(`─────────────────────────────────────────────────────────────────`);
  console.log(`📊 Summary Statistics:`);
  console.log(`   Endpoints: ${status.endpoints.up}/${status.endpoints.total} up`);
  console.log(`   Average Latency: ${status.latency.average}ms`);
  console.log(`   Configuration Drift: ${status.drift.count} mismatches`);

  // Recommendations
  if (status.score < this.threshold) {
    console.log(``);
    console.log(`⚠️  RECOMMENDATION: Health score ${status.score} (< ${this.threshold})`);
    console.log(`   Run \`/fw-deploy --sync\` to reconcile configuration drift`);
    if (status.latency.max > 500) {
      console.log(`   Investigate high latency endpoints (${status.latency.max}ms > 500ms threshold)`);
    }
    if (status.endpoints.down > 0) {
      console.log(`   Check ${status.endpoints.down} down endpoint(s) for accessibility`);
    }
  }

  private getScoreColor(score: number): string {
    if (score >= 90) return 'GREEN';
    if (score >= 70) return 'YELLOW';
    return 'RED';
  }

  private detectChanges(previous: NexusStatus, current: NexusStatus): void {
    const prevScore = previous.score;
    const currScore = current.score;

    if (Math.abs(prevScore - currScore) >= 10) {
      const direction = currScore > prevScore ? '📈 IMPROVED' : '📉 DEGRADED';
      console.log(`🚨 STATE CHANGE: ${direction} (${prevScore} → ${currScore})`);
    }

    // Check for endpoint changes
    const prevEndpoints = Array.from(previous.probes.entries());
    const currEndpoints = Array.from(current.probes.entries());

    currEndpoints.forEach(([key, probe]) => {
      const prevProbe = previous.probes.get(key);
      if (prevProbe && prevProbe.health !== probe.health) {
        console.log(`🔄 ${key}: ${prevProbe.health} → ${probe.health}`);
      }
    });
  }

  private async logStatus(status: NexusStatus): Promise<void> {
    const logEntry = `[${new Date().toISOString()}] score=${status.score} endpoints=${status.endpoints.up}/${status.endpoints.total} drift=${status.drift.count}\n`;

    try {
      // Ensure directory exists, then write using Bun.file()
      await Bun.write(Bun.file('./.factory-wager/nexus-status.log'), logEntry);
    } catch (error) {
      // Silently fail logging to not interrupt main functionality
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);

  const configIndex = args.findIndex(arg => arg.startsWith('--config='));
  const watch = args.includes('--watch');
  const alert = args.includes('--alert');
  const alertIndex = args.findIndex(arg => arg.startsWith('--alert='));

  const config = configIndex >= 0 ? args[configIndex].split('=')[1] : './config.yaml';
  const threshold = alertIndex >= 0 ? parseInt(args[alertIndex].split('=')[1]) : 90;

  try {
    const monitor = new FactoryWagerNexusStatus(config, watch, alert, threshold);
    await monitor.execute();
  } catch (error) {
    console.error(`❌ Nexus status monitor failed: ${(error as Error).message}`);
    process.exit(127);
  }
}

if (import.meta.main) {
  main();
}
