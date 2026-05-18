#!/usr/bin/env bun
// scripts/bunwhy-speed.ts - Prove ripgrep supremacy on YOUR codebase
import { SuperRipgrep } from '../utils/super-ripgrep.ts';

async function benchmarkRipgrep() {
  console.info('🚀 #bunwhy = Speed → Proving ripgrep supremacy on YOUR codebase\n');

  // Common queries in Bun/TypeScript projects
  const queries = [
    'Bun\\.Terminal',    // Your Terminal API
    'HistoryCLI',        // Your CLI system
    'lsp',              // LSP functionality
    'notification',     // Notification system
    'deploy',           // Deployment code
    'interface.*\\{',    // TypeScript interfaces
    'async function',   // Async functions
    'import.*from'      // Import statements
  ];

  const rg = new SuperRipgrep();
  const results = await rg.benchmarkQueries(queries);

  console.info('\n📊 **Speed Results:**\n');

  // Show individual results
  results.forEach(result => {
    console.info(`⚡ ${result.query.padEnd(18)} → ${result.durationMs.toFixed(1).padStart(6)}ms | ${result.matches.toString().padStart(3)} matches | ${result.speedup.padStart(4)} faster`);
  });

  // Calculate summary statistics
  const avgSpeed = results.reduce((sum, r) => {
    const speedup = r.speedup === '∞x' ? 1000 : parseInt(r.speedup);
    return sum + speedup;
  }, 0) / results.length;

  const totalMatches = results.reduce((sum, r) => sum + r.matches, 0);
  const avgDuration = results.reduce((sum, r) => sum + r.durationMs, 0) / results.length;

  console.info('\n🏆 **SUMMARY:**');
  console.info(`   Average Speedup: ${avgSpeed.toFixed(0)}x faster than grep!`);
  console.info(`   Total Matches Found: ${totalMatches}`);
  console.info(`   Average Query Time: ${avgDuration.toFixed(1)}ms`);
  console.info(`   Peak Throughput: ${Math.max(...results.map(r => r.throughput)).toFixed(0)} matches/sec`);

  console.info('\n💡 **Why #bunwhy = Speed:**');
  console.info('   • 8-thread parallelism vs grep\'s single thread');
  console.info('   • Hyperscan regex engine vs basic regex');
  console.info('   • Smart file type filtering (no node_modules)');
  console.info('   • Memory-efficient streaming JSON output');
  console.info('   • Native Bun.spawn integration');

  console.info('\n🚀 **Your codebase is now AI-searchable at lightning speed!**');
}

// Run if called directly
if (import.meta.main) {
  benchmarkRipgrep().catch(console.error);
}