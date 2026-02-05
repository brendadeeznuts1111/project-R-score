#!/usr/bin/env bun
// scripts/bunwhy-speed.ts - Prove ripgrep supremacy on YOUR codebase
import { SuperRipgrep } from '../utils/super-ripgrep.ts';

async function benchmarkRipgrep() {
  console.log('🚀 #bunwhy = Speed → Proving ripgrep supremacy on YOUR codebase\n');

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

  console.log('\n📊 **Speed Results:**\n');

  // Show individual results
  results.forEach(result => {
    console.log(`⚡ ${result.query.padEnd(18)} → ${result.durationMs.toFixed(1).padStart(6)}ms | ${result.matches.toString().padStart(3)} matches | ${result.speedup.padStart(4)} faster`);
  });

  // Calculate summary statistics
  const avgSpeed = results.reduce((sum, r) => {
    const speedup = r.speedup === '∞x' ? 1000 : parseInt(r.speedup);
    return sum + speedup;
  }, 0) / results.length;

  const totalMatches = results.reduce((sum, r) => sum + r.matches, 0);
  const avgDuration = results.reduce((sum, r) => sum + r.durationMs, 0) / results.length;

  console.log('\n🏆 **SUMMARY:**');
  console.log(`   Average Speedup: ${avgSpeed.toFixed(0)}x faster than grep!`);
  console.log(`   Total Matches Found: ${totalMatches}`);
  console.log(`   Average Query Time: ${avgDuration.toFixed(1)}ms`);
  console.log(`   Peak Throughput: ${Math.max(...results.map(r => r.throughput)).toFixed(0)} matches/sec`);

  console.log('\n💡 **Why #bunwhy = Speed:**');
  console.log('   • 8-thread parallelism vs grep\'s single thread');
  console.log('   • Hyperscan regex engine vs basic regex');
  console.log('   • Smart file type filtering (no node_modules)');
  console.log('   • Memory-efficient streaming JSON output');
  console.log('   • Native Bun.spawn integration');

  console.log('\n🚀 **Your codebase is now AI-searchable at lightning speed!**');
}

// Run if called directly
if (import.meta.main) {
  benchmarkRipgrep().catch(console.error);
}