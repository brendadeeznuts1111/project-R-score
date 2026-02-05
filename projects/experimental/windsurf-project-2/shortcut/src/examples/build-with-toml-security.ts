#!/usr/bin/env bun

/**
 * Build Script with TOML Security Plugin
 * 
 * Demonstrates integrating the URLPattern TOML security plugin
 * into a real Bun build pipeline
 */

import { urlPatternTomlPlugin } from './urlpattern-toml-plugin';
import { build } from 'bun';

console.log('🚀 Building with TOML Security Plugin');
console.log('=====================================');

async function buildWithSecurity() {
  try {
    const result = await build({
      entrypoints: ['./src/examples/urlpattern-toml-plugin.ts'],
      outdir: './dist',
      plugins: [
        urlPatternTomlPlugin({
          scanConfigFiles: [
            'config/**/*.toml',
            'config/tenants/**/*.toml'
          ],
          failOnRisk: 'critical',
          autoInjectGuards: false, // Don't modify files in demo
          outputReport: './security-report.json'
        })
      ],
      target: 'bun'
    });
    
    console.log('✅ Build completed successfully!');
    console.log(`📦 Outputs: ${result.outputs.length} files`);
    
    result.outputs.forEach(output => {
      console.log(`   ${output.path}`);
    });
    
  } catch (error) {
    console.error('❌ Build failed:', error instanceof Error ? error.message : String(error));
    
    if (error instanceof Error && error.message.includes('URLPattern security risks')) {
      console.log('\n🔍 Security risks detected. Check security-report.json for details.');
      console.log('💡 Fix the critical issues or adjust --fail-on-risk level.');
    }
    
    process.exit(1);
  }
}

// Demo different risk levels
async function demoRiskLevels() {
  console.log('\n🎯 Demo: Different Risk Levels');
  console.log('===============================');
  
  const riskLevels = ['critical', 'high', 'medium', 'low'] as const;
  
  for (const riskLevel of riskLevels) {
    console.log(`\n📊 Testing with --fail-on-risk ${riskLevel}:`);
    
    try {
      const result = await build({
        entrypoints: ['./src/examples/urlpattern-toml-plugin.ts'],
        outdir: `./dist-${riskLevel}`,
        plugins: [
          urlPatternTomlPlugin({
            scanConfigFiles: ['config/**/*.toml'],
            failOnRisk: riskLevel,
            autoInjectGuards: false,
            outputReport: `./security-report-${riskLevel}.json`
          })
        ],
        target: 'bun'
      });
      
      console.log(`   ✅ Build passed at ${riskLevel} risk`);
      
    } catch (error) {
      console.log(`   ❌ Build failed at ${riskLevel} risk`);
    }
  }
}

// Performance benchmark
async function benchmarkScanning() {
  console.log('\n⚡ Performance Benchmark');
  console.log('=========================');
  
  const iterations = 10;
  const times: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    
    const scanner = new (await import('./urlpattern-toml-plugin')).URLPatternTomlScanner({
      scanConfigFiles: ['config/**/*.toml'],
      failOnRisk: 'none',
      autoInjectGuards: false,
      outputReport: undefined
    });
    
    const report = await scanner.scanAllConfigs();
    scanner.close();
    
    const end = performance.now();
    times.push(end - start);
  }
  
  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  
  console.log(`   📊 Scanned ${iterations} times`);
  console.log(`   ⚡ Average: ${avgTime.toFixed(2)}ms`);
  console.log(`   🚀 Fastest: ${minTime.toFixed(2)}ms`);
  console.log(`   🐌 Slowest: ${maxTime.toFixed(2)}ms`);
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--demo')) {
    await demoRiskLevels();
    return;
  }
  
  if (args.includes('--benchmark')) {
    await benchmarkScanning();
    return;
  }
  
  if (args.includes('--help')) {
    console.log(`
Build Script with TOML Security

Usage:
  bun run build-with-toml-security.ts [options]

Options:
  --demo        Demo different risk levels
  --benchmark   Performance benchmark
  --help        Show this help

Examples:
  bun run build-with-toml-security.ts
  bun run build-with-toml-security.ts --demo
  bun run build-with-toml-security.ts --benchmark
    `);
    return;
  }
  
  await buildWithSecurity();
}

// Run if called directly
if (import.meta.main) {
  main();
}
