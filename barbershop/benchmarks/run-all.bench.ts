#!/usr/bin/env bun
/**
 * ELITE Modules - Complete Benchmark Suite
 * 
 * Runs all benchmarks and generates a comprehensive report
 */

console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
console.log('║                                                                              ║');
console.log('║           🚀 ELITE v4.5 "INFINITY" - PERFORMANCE BENCHMARKS                  ║');
console.log('║                                                                              ║');
console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
console.log('║  Security • Resilience • Infrastructure                                      ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

// Run all benchmark suites
await import('./elite-security.bench');
await Bun.sleep(100);
await import('./elite-resilience.bench');
await Bun.sleep(100);
await import('./elite-infrastructure.bench');

console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
console.log('║                           ✅ ALL BENCHMARKS COMPLETE                         ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');
