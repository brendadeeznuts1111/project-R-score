#!/usr/bin/env bun

/**
 * Registry Failover Configuration for Fire22 Dashboard
 * Ensures continuous package availability with automatic failover
 */

import { $ } from 'bun';
import { existsSync } from 'fs';

interface Registry {
  name: string;
  url: string;
  priority: number;
  type: 'primary' | 'fallback' | 'mirror';
  healthCheckUrl: string;
  timeout: number;
}

interface HealthStatus {
  registry: Registry;
  online: boolean;
  responseTime: number;
  lastCheck: Date;
}

class RegistryFailoverManager {
  private registries: Registry[] = [
    {
      name: 'NPM Official',
      url: 'https://registry.npmjs.org/',
      priority: 1,
      type: 'primary',
      healthCheckUrl: 'https://registry.npmjs.org/-/ping',
      timeout: 5000,
    },
    {
      name: 'Yarn Registry',
      url: 'https://registry.yarnpkg.com/',
      priority: 2,
      type: 'fallback',
      healthCheckUrl: 'https://registry.yarnpkg.com/-/ping',
      timeout: 5000,
    },
    {
      name: 'NPM Mirror (China)',
      url: 'https://registry.npmmirror.com/',
      priority: 3,
      type: 'fallback',
      healthCheckUrl: 'https://registry.npmmirror.com/-/ping',
      timeout: 8000,
    },
    {
      name: 'JSDelivr CDN',
      url: 'https://cdn.jsdelivr.net/npm/',
      priority: 4,
      type: 'mirror',
      healthCheckUrl: 'https://cdn.jsdelivr.net/',
      timeout: 5000,
    },
    {
      name: 'Fire22 Private',
      url: 'https://fire22-security-registry.nolarose1968-806.workers.dev/',
      priority: 1,
      type: 'primary',
      healthCheckUrl: 'https://fire22-security-registry.nolarose1968-806.workers.dev/health',
      timeout: 5000,
    },
  ];

  private healthStatus: Map<string, HealthStatus> = new Map();

  async checkRegistryHealth(registry: Registry): Promise<HealthStatus> {
    const start = Bun.nanoseconds();
    let online = false;

    try {
      const response = await fetch(registry.healthCheckUrl, {
        signal: AbortSignal.timeout(registry.timeout),
        headers: {
          'User-Agent': 'Fire22-Dashboard/1.0.0',
        },
      });

      online = response.ok || response.status === 404; // Some registries return 404 for ping
    } catch (error) {
      online = false;
    }

    const end = Bun.nanoseconds();
    const responseTime = (end - start) / 1_000_000;

    const status: HealthStatus = {
      registry,
      online,
      responseTime,
      lastCheck: new Date(),
    };

    this.healthStatus.set(registry.name, status);
    return status;
  }

  async checkAllRegistries(): Promise<HealthStatus[]> {
    console.log('🔍 Checking registry health...\n');

    const checks = await Promise.all(
      this.registries.map(registry => this.checkRegistryHealth(registry))
    );

    // Sort by priority and response time
    checks.sort((a, b) => {
      if (a.online !== b.online) return b.online ? 1 : -1;
      if (a.registry.priority !== b.registry.priority) {
        return a.registry.priority - b.registry.priority;
      }
      return a.responseTime - b.responseTime;
    });

    return checks;
  }

  async selectBestRegistry(): Promise<Registry | null> {
    const statuses = await this.checkAllRegistries();

    // Find best primary registry
    const primaryRegistries = statuses.filter(s => s.online && s.registry.type === 'primary');
    if (primaryRegistries.length > 0) {
      return primaryRegistries[0].registry;
    }

    // Fallback to secondary registries
    const fallbackRegistries = statuses.filter(s => s.online && s.registry.type === 'fallback');
    if (fallbackRegistries.length > 0) {
      return fallbackRegistries[0].registry;
    }

    // Use mirror as last resort
    const mirrorRegistries = statuses.filter(s => s.online && s.registry.type === 'mirror');
    if (mirrorRegistries.length > 0) {
      return mirrorRegistries[0].registry;
    }

    return null;
  }

  async configureBunWithBestRegistry(): Promise<void> {
    const bestRegistry = await this.selectBestRegistry();

    if (!bestRegistry) {
      console.error('❌ All registries are offline!');
      process.exit(1);
    }

    console.log(`\n✅ Selected registry: ${bestRegistry.name}`);
    console.log(`   URL: ${bestRegistry.url}`);

    // Update bunfig.toml dynamically
    const bunfigPath = 'bunfig.toml';
    if (existsSync(bunfigPath)) {
      const bunfig = await Bun.file(bunfigPath).text();
      const updatedBunfig = bunfig.replace(/registry = ".*"/, `registry = "${bestRegistry.url}"`);
      await Bun.write(bunfigPath, updatedBunfig);
      console.log('   Updated bunfig.toml');
    }

    // Set environment variable for current session
    process.env.BUN_CONFIG_REGISTRY = bestRegistry.url;
    console.log('   Set BUN_CONFIG_REGISTRY environment variable');
  }

  async createFailoverScript(): Promise<void> {
    const script = `#!/bin/bash
# Registry Failover Script for CI/CD

echo "🔄 Checking registry availability..."

# List of registries to try
REGISTRIES=(
  "https://registry.npmjs.org/"
  "https://registry.yarnpkg.com/"
  "https://registry.npmmirror.com/"
)

# Test each registry
for REGISTRY in "\${REGISTRIES[@]}"; do
  if curl -s --max-time 5 "\${REGISTRY}-/ping" > /dev/null 2>&1; then
    echo "✅ Using registry: \$REGISTRY"
    export BUN_CONFIG_REGISTRY="\$REGISTRY"
    break
  else
    echo "⚠️ Registry unavailable: \$REGISTRY"
  fi
done

# Run installation with selected registry
bun install --frozen-lockfile
`;

    await Bun.write('scripts/install-with-failover.sh', script);
    await $`chmod +x scripts/install-with-failover.sh`;
    console.log('✅ Created failover installation script');
  }

  async generateReport(): Promise<void> {
    const statuses = await this.checkAllRegistries();

    console.log('\n📊 Registry Health Report');
    console.log('═'.repeat(60));
    console.log('Registry'.padEnd(25) + 'Type'.padEnd(10) + 'Status'.padEnd(10) + 'Response Time');
    console.log('─'.repeat(60));

    for (const status of statuses) {
      const statusEmoji = status.online ? '✅' : '❌';
      const responseTime = status.online ? `${status.responseTime.toFixed(2)}ms` : 'N/A';

      console.log(
        status.registry.name.padEnd(25) +
          status.registry.type.padEnd(10) +
          statusEmoji.padEnd(10) +
          responseTime
      );
    }

    console.log('\n💡 Failover Configuration:');
    console.log('  • Primary registries are preferred when available');
    console.log('  • Automatic fallback to secondary registries');
    console.log('  • CDN mirrors used as last resort');
    console.log('  • Health checks performed every installation');

    const bestRegistry = await this.selectBestRegistry();
    if (bestRegistry) {
      console.log(`\n🎯 Recommended: ${bestRegistry.name} (${bestRegistry.url})`);
    }
  }

  async monitorContinuously(intervalMs: number = 60000): Promise<void> {
    console.log(`🔄 Starting continuous monitoring (every ${intervalMs / 1000}s)...`);

    const checkAndReport = async () => {
      const statuses = await this.checkAllRegistries();
      const timestamp = new Date().toISOString();

      // Log to file for historical analysis
      const logEntry = {
        timestamp,
        statuses: statuses.map(s => ({
          name: s.registry.name,
          online: s.online,
          responseTime: s.responseTime,
        })),
      };

      const logFile = 'logs/registry-health.jsonl';
      await Bun.write(logFile, JSON.stringify(logEntry) + '\n', { append: true });

      // Alert on failures
      const failures = statuses.filter(s => !s.online && s.registry.type === 'primary');
      if (failures.length > 0) {
        console.warn(`⚠️ [${timestamp}] Primary registry offline: ${failures[0].registry.name}`);
      }
    };

    // Initial check
    await checkAndReport();

    // Set up interval
    setInterval(checkAndReport, intervalMs);
  }
}

// Main execution
async function main() {
  const manager = new RegistryFailoverManager();
  const command = process.argv[2] || 'report';

  switch (command) {
    case 'check':
      await manager.checkAllRegistries();
      break;
    case 'configure':
      await manager.configureBunWithBestRegistry();
      break;
    case 'script':
      await manager.createFailoverScript();
      break;
    case 'monitor':
      await manager.monitorContinuously();
      break;
    case 'report':
    default:
      await manager.generateReport();
      break;
  }
}

// Run the failover manager
if (import.meta.main) {
  await main();
}
