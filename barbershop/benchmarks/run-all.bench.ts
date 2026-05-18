#!/usr/bin/env bun
/**
 * ELITE Modules - Complete Benchmark Suite
 * 
 * Runs all benchmarks and generates a comprehensive report
 */

console.info('\n╔══════════════════════════════════════════════════════════════════════════════╗');
console.info('║                                                                              ║');
console.info('║           🚀 ELITE v4.5 "INFINITY" - PERFORMANCE BENCHMARKS                  ║');
console.info('║                                                                              ║');
console.info('╠══════════════════════════════════════════════════════════════════════════════╣');
console.info('║  Security • Resilience • Infrastructure                                      ║');
console.info('╚══════════════════════════════════════════════════════════════════════════════╝\n');

// Run all benchmark suites
await import('./elite-security.bench');
await Bun.sleep(100);
await import('./elite-resilience.bench');
await Bun.sleep(100);
await import('./elite-infrastructure.bench');

console.info('\n╔══════════════════════════════════════════════════════════════════════════════╗');
console.info('║                           ✅ ALL BENCHMARKS COMPLETE                         ║');
console.info('╚══════════════════════════════════════════════════════════════════════════════╝\n');
