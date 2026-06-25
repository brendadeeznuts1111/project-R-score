#!/usr/bin/env bun

/**
 * DNS Cache Monitor - Demonstrates Bun.dns.getCacheStats() API
 *
 * This script showcases Bun's DNS caching capabilities and provides
 * real-time monitoring of DNS cache performance statistics.
 *
 * Usage: bun run dns-monitor.ts
 */

interface DNSCacheStats {
  cacheHitsCompleted: number;
  cacheHitsInflight: number;
  cacheMisses: number;
  size: number;
  errors: number;
  totalCount: number;
}

class DNSMonitor {
  private monitoringInterval: Timer | null = null;
  private statsHistory: DNSCacheStats[] = [];

  async startMonitoring(intervalMs: number = 2000) {
    console.info('🌐 Starting DNS Cache Monitor');
    console.info('==============================\n');

    // Initial stats
    await this.displayStats();

    // Start monitoring loop
    this.monitoringInterval = setInterval(async () => {
      await this.displayStats();
    }, intervalMs);

    console.info(`📊 Monitoring DNS cache every ${intervalMs}ms...`);
    console.info('Press Ctrl+C to stop\n');
  }

  async stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    console.info('\n🛑 DNS monitoring stopped');
  }

  private async getDNSStats(): Promise<DNSCacheStats> {
    try {
      // Use Bun's native DNS cache stats API
      const stats = Bun.dns.getCacheStats();
      return stats;
    } catch (error) {
      console.warn('Warning: Could not access DNS cache stats:', error);
      // Fallback to mock stats for demonstration
      return this.getMockStats();
    }
  }

  private getMockStats(): DNSCacheStats {
    // Mock stats for environments where DNS stats aren't available
    return {
      cacheHitsCompleted: Math.floor(Math.random() * 100),
      cacheHitsInflight: Math.floor(Math.random() * 10),
      cacheMisses: Math.floor(Math.random() * 50),
      size: Math.floor(Math.random() * 255),
      errors: Math.floor(Math.random() * 5),
      totalCount: 0
    };
  }

  private async displayStats() {
    const stats = await this.getDNSStats();

    // Calculate derived metrics
    const totalRequests = stats.cacheHitsCompleted + stats.cacheHitsInflight + stats.cacheMisses + stats.errors;
    const hitRate = totalRequests > 0 ? ((stats.cacheHitsCompleted / totalRequests) * 100).toFixed(1) : '0.0';
    const efficiency = totalRequests > 0 ? (((stats.cacheHitsCompleted + stats.cacheHitsInflight) / totalRequests) * 100).toFixed(1) : '0.0';

    // Store in history for trend analysis
    this.statsHistory.push(stats);
    if (this.statsHistory.length > 100) {
      this.statsHistory.shift(); // Keep last 100 entries
    }

    // Clear screen and display header
    console.clear();
    console.info('🌐 DNS Cache Monitor - Live Statistics');
    console.info('========================================');
    console.info(`📅 ${new Date().toLocaleTimeString()}`);
    console.info('');

    // Display stats in a nice format
    console.info('📊 Cache Performance:');
    console.info(`   🎯 Cache Hits Completed: ${stats.cacheHitsCompleted}`);
    console.info(`   ⏳ Cache Hits In Flight:  ${stats.cacheHitsInflight}`);
    console.info(`   ❌ Cache Misses:         ${stats.cacheMisses}`);
    console.info(`   📦 Cache Size:           ${stats.size}/255 entries`);
    console.info(`   ⚠️  DNS Errors:           ${stats.errors}`);
    console.info('');

    console.info('📈 Derived Metrics:');
    console.info(`   🔄 Total DNS Requests:   ${totalRequests}`);
    console.info(`   📊 Cache Hit Rate:       ${hitRate}%`);
    console.info(`   ⚡ Cache Efficiency:      ${efficiency}%`);
    console.info('');

    // Performance indicators
    this.displayPerformanceIndicators(stats, hitRate, efficiency);

    // Trend analysis (if we have enough data)
    if (this.statsHistory.length >= 5) {
      this.displayTrendAnalysis();
    }

    console.info('');
    console.info('💡 Tips:');
    console.info('   • High cache hit rate (>80%) indicates good performance');
    console.info('   • Cache size approaching 255 may need attention');
    console.info('   • DNS errors > 0 should be investigated');
    console.info('   • Use Bun.dns.prefetch() for proactive DNS caching');
  }

  private displayPerformanceIndicators(stats: DNSCacheStats, hitRate: string, efficiency: string) {
    console.info('🏆 Performance Status:');

    // Cache hit rate indicator
    const hitRateNum = parseFloat(hitRate);
    const hitStatus = hitRateNum >= 80 ? '🟢 Excellent' :
                     hitRateNum >= 60 ? '🟡 Good' :
                     hitRateNum >= 40 ? '🟠 Fair' : '🔴 Poor';
    console.info(`   Cache Hit Rate: ${hitStatus} (${hitRate}%)`);

    // Cache size indicator
    const sizeStatus = stats.size < 200 ? '🟢 Healthy' :
                      stats.size < 240 ? '🟡 Moderate' : '🟠 High';
    console.info(`   Cache Size:     ${sizeStatus} (${stats.size}/255)`);

    // Error rate indicator
    const errorStatus = stats.errors === 0 ? '🟢 Clean' :
                       stats.errors <= 2 ? '🟡 Low' :
                       stats.errors <= 5 ? '🟠 Moderate' : '🔴 High';
    console.info(`   Error Rate:     ${errorStatus} (${stats.errors} errors)`);
  }

  private displayTrendAnalysis() {
    const recent = this.statsHistory.slice(-5); // Last 5 readings
    const older = this.statsHistory.slice(-10, -5); // Previous 5 readings

    if (older.length < 5) return;

    const recentAvgHits = recent.reduce((sum, s) => sum + s.cacheHitsCompleted, 0) / recent.length;
    const olderAvgHits = older.reduce((sum, s) => sum + s.cacheHitsCompleted, 0) / older.length;

    const trend = recentAvgHits - olderAvgHits;
    const trendDirection = trend > 5 ? '📈 Increasing' :
                          trend < -5 ? '📉 Decreasing' : '➡️ Stable';

    console.info('');
    console.info('📊 Trend Analysis (last 10 readings):');
    console.info(`   Cache Hits: ${trendDirection} (${trend > 0 ? '+' : ''}${trend.toFixed(1)} avg change)`);
  }

  async demonstratePrefetch() {
    console.info('\n🚀 Demonstrating DNS Prefetch...');

    const domains = [
      'api.github.com',
      'registry.npmjs.org',
      'bun.sh',
      'google.com',
      'cloudflare.com'
    ];

    console.info('📡 Prefetching DNS entries for:');
    domains.forEach(domain => console.info(`   • ${domain}`));

    // Prefetch DNS entries
    for (const domain of domains) {
      try {
        Bun.dns.prefetch(domain, 443);
        console.info(`   ✅ Prefetched ${domain}:443`);
      } catch (error) {
        console.info(`   ❌ Failed to prefetch ${domain}: ${error}`);
      }
    }

    console.info('\n⏳ Waiting 2 seconds for prefetch to complete...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.info('📊 Stats after prefetch:');
    await this.displayStats();
  }

  async runInteractiveDemo() {
    console.info('🎮 DNS Cache Monitor - Interactive Demo');
    console.info('======================================\n');

    console.info('Available commands:');
    console.info('  monitor  - Start live monitoring');
    console.info('  stats    - Show current stats');
    console.info('  prefetch - Demonstrate DNS prefetch');
    console.info('  clear    - Clear DNS cache (if supported)');
    console.info('  help     - Show this help');
    console.info('  exit     - Exit demo\n');

    const commands = {
      monitor: () => this.startMonitoring(),
      stats: () => this.displayStats(),
      prefetch: () => this.demonstratePrefetch(),
      clear: () => this.clearDNSCache(),
      help: () => {
        console.info('\nCommands:');
        console.info('  monitor  - Start live monitoring');
        console.info('  stats    - Show current stats');
        console.info('  prefetch - Demonstrate DNS prefetch');
        console.info('  clear    - Clear DNS cache');
        console.info('  help     - Show help');
        console.info('  exit     - Exit\n');
      }
    };

    // Simple REPL
    while (true) {
      const input = prompt('dns-monitor> ');
      if (!input) continue;

      const cmd = input.trim().toLowerCase();

      if (cmd === 'exit' || cmd === 'quit') {
        await this.stopMonitoring();
        break;
      }

      const commandFn = commands[cmd as keyof typeof commands];
      if (commandFn) {
        try {
          await commandFn();
        } catch (error) {
          console.error(`Error executing ${cmd}:`, error);
        }
      } else {
        console.info(`Unknown command: ${cmd}`);
        console.info('Type "help" for available commands');
      }
    }
  }

  private async clearDNSCache() {
    try {
      // Note: Bun.dns.clearCache() is not currently exposed in the public API
      // This is a placeholder for when it becomes available
      console.info('🧹 DNS cache clearing not yet supported in current Bun version');
      console.info('   This feature will be available in a future Bun release');
    } catch (error) {
      console.error('Failed to clear DNS cache:', error);
    }
  }
}

// Main execution
async function main() {
  const monitor = new DNSMonitor();
  const args = process.argv.slice(2);

  if (args.includes('--interactive') || args.includes('-i')) {
    await monitor.runInteractiveDemo();
  } else if (args.includes('--prefetch-demo')) {
    await monitor.demonstratePrefetch();
  } else {
    // Default: start monitoring
    await monitor.startMonitoring();

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      await monitor.stopMonitoring();
      process.exit(0);
    });

    // Keep the process running
    await new Promise(() => {}); // Never resolves
  }
}

// Run if main
if (import.meta.main) {
  main().catch(console.error);
}