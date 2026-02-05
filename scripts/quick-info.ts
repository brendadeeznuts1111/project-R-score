#!/usr/bin/env bun

/**
 * ⚡ Quick Info - Fast Status Check
 * 
 * Enhanced daily development status check with AI insights
 * and Bun-native performance monitoring.
 */

import { aiOperations } from '../lib/ai/ai-operations-manager.ts';
import { nanoseconds, color } from 'bun';
import { globalCaches } from '../lib/performance/cache-manager.ts';

interface SystemStatus {
  timestamp: number;
  bun: {
    version: string;
    platform: string;
    arch: string;
  };
  memory: NodeJS.MemoryUsage;
  ai: {
    commands: number;
    insights: number;
    predictions: number;
  };
  cache: {
    secrets: any;
    config: any;
    api: any;
  };
  performance: {
    startupTime: number;
    lastCheck: number;
  };
}

async function getQuickInfo(): Promise<SystemStatus> {
  const start = nanoseconds();
  
  // Get AI Operations status
  const insights = aiOperations.getInsights();
  const suggestions = await aiOperations.getOptimizationSuggestions();
  
  // Get cache statistics
  const cacheStats = {
    secrets: globalCaches.secrets.getStats(),
    config: globalCaches.config.getStats(),
    api: globalCaches.apiResponses.getStats()
  };
  
  const status: SystemStatus = {
    timestamp: Date.now(),
    bun: {
      version: Bun.version,
      platform: process.platform,
      arch: process.arch
    },
    memory: process.memoryUsage(),
    ai: {
      commands: insights.length,
      insights: suggestions.length,
      predictions: insights.filter(i => i.type === 'performance').length
    },
    cache: cacheStats,
    performance: {
      startupTime: (nanoseconds() - start) / 1e6,
      lastCheck: Date.now()
    }
  };
  
  return status;
}

function formatMemory(bytes: number): string {
  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(1)}MB`;
}

function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

async function displayQuickInfo(status: SystemStatus) {
  console.log(color('\n⚡ FactoryWager Quick Info', 'cyan', 'bold'));
  console.log(color('─'.repeat(50), 'gray'));
  
  // Bun Info
  console.log(color('\n🦌 Bun Runtime:', 'yellow', 'bold'));
  console.log(`  Version: ${color(status.bun.version, 'green')}`);
  console.log(`  Platform: ${color(status.bun.platform, 'green')}`);
  console.log(`  Architecture: ${color(status.bun.arch, 'green')}`);
  
  // Memory Info
  console.log(color('\n🧠 Memory Usage:', 'yellow', 'bold'));
  console.log(`  Heap Used: ${color(formatMemory(status.memory.heapUsed), 'cyan')}`);
  console.log(`  Heap Total: ${color(formatMemory(status.memory.heapTotal), 'cyan')}`);
  console.log(`  RSS: ${color(formatMemory(status.memory.rss), 'cyan')}`);
  console.log(`  External: ${color(formatMemory(status.memory.external), 'cyan')}`);
  
  // AI Operations
  console.log(color('\n🤖 AI Operations:', 'yellow', 'bold'));
  console.log(`  Active Commands: ${color(status.ai.commands.toString(), 'cyan')}`);
  console.log(`  Insights Available: ${color(status.ai.insights.toString(), 'cyan')}`);
  console.log(`  Performance Predictions: ${color(status.ai.predictions.toString(), 'cyan')}`);
  
  // Cache Performance
  console.log(color('\n🗄️  Cache Performance:', 'yellow', 'bold'));
  console.log(`  Secrets Hit Rate: ${color(formatPercentage(status.cache.secrets.hitRate), 'cyan')}`);
  console.log(`  Config Hit Rate: ${color(formatPercentage(status.cache.config.hitRate), 'cyan')}`);
  console.log(`  API Hit Rate: ${color(formatPercentage(status.cache.api.hitRate), 'cyan')}`);
  
  // Performance Metrics
  console.log(color('\n⚡ Performance:', 'yellow', 'bold'));
  console.log(`  Query Time: ${color(`${status.performance.startupTime.toFixed(2)}ms`, 'cyan')}`);
  console.log(`  Last Check: ${color(new Date(status.performance.lastCheck).toLocaleTimeString(), 'cyan')}`);
  
  // Health Status
  console.log(color('\n🏥 System Health:', 'yellow', 'bold'));
  const memoryUsage = status.memory.heapUsed / status.memory.heapTotal;
  const healthStatus = memoryUsage > 0.8 ? 'red' : memoryUsage > 0.6 ? 'yellow' : 'green';
  console.log(`  Overall Status: ${color(memoryUsage > 0.8 ? '⚠️  Warning' : '✅ Healthy', healthStatus)}`);
  
  // AI Recommendations
  if (status.ai.insights > 0) {
    console.log(color('\n💡 AI Recommendations:', 'yellow', 'bold'));
    const topInsights = aiOperations.getInsights({ impact: 'high', minConfidence: 0.7 }).slice(0, 3);
    topInsights.forEach((insight, i) => {
      console.log(`  ${i + 1}. ${color(insight.title, 'cyan')} (${formatPercentage(insight.confidence)} confidence)`);
    });
  }
  
  console.log(color('\n✨ Quick info completed in', 'gray'), color(`${status.performance.startupTime.toFixed(2)}ms`, 'green'));
}

async function main() {
  const args = process.argv.slice(2);
  const shortMode = args.includes('--short');
  const summaryMode = args.includes('--summary');
  
  if (shortMode || summaryMode) {
    // Ultra-fast mode for one-liners
    try {
      const status = await getQuickInfo();
      console.log('\x1b[36m⚡ FactoryWager Status\x1b[0m');
      console.log(`  Memory: \x1b[36m${formatMemory(status.memory.heapUsed)}\x1b[0m | AI: \x1b[32m${status.ai.insights.toString()}\x1b[0m | Cache: \x1b[33m${formatPercentage(status.cache.secrets.hitRate)}\x1b[0m`);
      console.log(`  Health: ${status.memory.heapUsed / status.memory.heapTotal > 0.8 ? '\x1b[33m⚠️\x1b[0m' : '\x1b[32m✅\x1b[0m'}`);
    } catch (error) {
      console.log('\x1b[31m❌ Quick check failed\x1b[0m');
    }
    return;
  }
  
  try {
    const status = await getQuickInfo();
    await displayQuickInfo(status);
  } catch (error) {
    console.error(color('❌ Quick info failed:', 'red'), error.message);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
