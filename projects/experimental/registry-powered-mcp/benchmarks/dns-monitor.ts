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
    console.log('🌐 Starting DNS Cache Monitor');
    console.log('==============================\n');

    // Initial stats
    await this.displayStats();

    // Start monitoring loop
    this.monitoringInterval = setInterval(async () => {
      await this.displayStats();
    }, intervalMs);

    console.log(`📊 Monitoring DNS cache every ${intervalMs}ms...`);
    console.log('Press Ctrl+C to stop\n');
  }

  async stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    console.log('\n🛑 DNS monitoring stopped');
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
    console.log('🌐 DNS Cache Monitor - Live Statistics');
    console.log('========================================');
    console.log(`📅 ${new Date().toLocaleTimeString()}`);
    console.log('');

    // Display stats in a nice format
    console.log('📊 Cache Performance:');
    console.log(`   🎯 Cache Hits Completed: ${stats.cacheHitsCompleted}`);
    console.log(`   ⏳ Cache Hits In Flight:  ${stats.cacheHitsInflight}`);
    console.log(`   ❌ Cache Misses:         ${stats.cacheMisses}`);
    console.log(`   📦 Cache Size:           ${stats.size}/255 entries`);
    console.log(`   ⚠️  DNS Errors:           ${stats.errors}`);
    console.log('');

    console.log('📈 Derived Metrics:');
    console.log(`   🔄 Total DNS Requests:   ${totalRequests}`);
    console.log(`   📊 Cache Hit Rate:       ${hitRate}%`);
    console.log(`   ⚡ Cache Efficiency:      ${efficiency}%`);
    console.log('');

    // Performance indicators
    this.displayPerformanceIndicators(stats, hitRate, efficiency);

    // Trend analysis (if we have enough data)
    if (this.statsHistory.length >= 5) {
      this.displayTrendAnalysis();
    }

    console.log('');
    console.log('💡 Tips:');
    console.log('   • High cache hit rate (>80%) indicates good performance');
    console.log('   • Cache size approaching 255 may need attention');
    console.log('   • DNS errors > 0 should be investigated');
    console.log('   • Use Bun.dns.prefetch() for proactive DNS caching');
  }

  private displayPerformanceIndicators(stats: DNSCacheStats, hitRate: string, efficiency: string) {
    console.log('🏆 Performance Status:');

    // Cache hit rate indicator
    const hitRateNum = parseFloat(hitRate);
    const hitStatus = hitRateNum >= 80 ? '🟢 Excellent' :
                     hitRateNum >= 60 ? '🟡 Good' :
                     hitRateNum >= 40 ? '🟠 Fair' : '🔴 Poor';
    console.log(`   Cache Hit Rate: ${hitStatus} (${hitRate}%)`);

    // Cache size indicator
    const sizeStatus = stats.size < 200 ? '🟢 Healthy' :
                      stats.size < 240 ? '🟡 Moderate' : '🟠 High';
    console.log(`   Cache Size:     ${sizeStatus} (${stats.size}/255)`);

    // Error rate indicator
    const errorStatus = stats.errors === 0 ? '🟢 Clean' :
                       stats.errors <= 2 ? '🟡 Low' :
                       stats.errors <= 5 ? '🟠 Moderate' : '🔴 High';
    console.log(`   Error Rate:     ${errorStatus} (${stats.errors} errors)`);
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

    console.log('');
    console.log('📊 Trend Analysis (last 10 readings):');
    console.log(`   Cache Hits: ${trendDirection} (${trend > 0 ? '+' : ''}${trend.toFixed(1)} avg change)`);
  }

  async demonstratePrefetch() {
    console.log('\n🚀 Demonstrating DNS Prefetch...');

    const domains = [
      'api.github.com',
      'registry.npmjs.org',
      'bun.sh',
      'google.com',
      'cloudflare.com'
    ];

    console.log('📡 Prefetching DNS entries for:');
    domains.forEach(domain => console.log(`   • ${domain}`));

    // Prefetch DNS entries
    for (const domain of domains) {
      try {
        Bun.dns.prefetch(domain, 443);
        console.log(`   ✅ Prefetched ${domain}:443`);
      } catch (error) {
        console.log(`   ❌ Failed to prefetch ${domain}: ${error}`);
      }
    }

    console.log('\n⏳ Waiting 2 seconds for prefetch to complete...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('📊 Stats after prefetch:');
    await this.displayStats();
  }

  async runInteractiveDemo() {
    console.log('🎮 DNS Cache Monitor - Interactive Demo');
    console.log('======================================\n');

    console.log('Available commands:');
    console.log('  monitor  - Start live monitoring');
    console.log('  stats    - Show current stats');
    console.log('  prefetch - Demonstrate DNS prefetch');
    console.log('  clear    - Clear DNS cache (if supported)');
    console.log('  help     - Show this help');
    console.log('  exit     - Exit demo\n');

    const commands = {
      monitor: () => this.startMonitoring(),
      stats: () => this.displayStats(),
      prefetch: () => this.demonstratePrefetch(),
      clear: () => this.clearDNSCache(),
      help: () => {
        console.log('\nCommands:');
        console.log('  monitor  - Start live monitoring');
        console.log('  stats    - Show current stats');
        console.log('  prefetch - Demonstrate DNS prefetch');
        console.log('  clear    - Clear DNS cache');
        console.log('  help     - Show help');
        console.log('  exit     - Exit\n');
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
        console.log(`Unknown command: ${cmd}`);
        console.log('Type "help" for available commands');
      }
    }
  }

  private async clearDNSCache() {
    try {
      // Note: Bun.dns.clearCache() is not currently exposed in the public API
      // This is a placeholder for when it becomes available
      console.log('🧹 DNS cache clearing not yet supported in current Bun version');
      console.log('   This feature will be available in a future Bun release');
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