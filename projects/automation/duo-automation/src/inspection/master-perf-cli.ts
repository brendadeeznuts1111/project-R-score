#!/usr/bin/env bun
// src/inspection/master-perf-cli.ts
import { MasterPerfInspector } from './master-perf-inspector';
import { runMasterPerfDemo, runStressTest } from './master-perf-demo';
import { PerfMetric } from '../storage/r2-apple-manager';

/**
 * 🎮 MASTER_PERF CLI Interface
 * 
 * Usage:
 *   bun src/inspection/master-perf-cli.ts demo
 *   bun src/inspection/master-perf-cli.ts benchmark
 *   bun src/inspection/master-perf-cli.ts colors
 *   bun src/inspection/master-perf-cli.ts stress
 */

const commands = {
  demo: 'Run complete demo suite',
  benchmark: 'Performance benchmark only',
  colors: 'Validate color palette',
  stress: 'Run stress tests',
  help: 'Show this help'
};

function showHelp(): void {
  console.info('\n🎮 MASTER_PERF CLI');
  console.info('='.repeat(30));
  console.info('\nAvailable commands:');
  
  Object.entries(commands).forEach(([cmd, desc]) => {
    console.info(`  ${cmd.padEnd(12)} ${desc}`);
  });
  
  console.info('\nExamples:');
  console.info('  bun src/inspection/master-perf-cli.ts demo');
  console.info('  bun src/inspection/master-perf-cli.ts benchmark');
  console.info('  bun src/inspection/master-perf-cli.ts colors');
  console.info('  bun src/inspection/master-perf-cli.ts stress');
}

function showBanner(): void {
  console.info('\n🚀 MASTER_PERF Inspector CLI');
  console.info('⚡ Dual-Mode Table System with Bun.color()');
  console.info('📊 ANSI + Plain Text + JSON Exports');
  console.info('─'.repeat(50));
}

/**
 * 📊 Generate sample metrics for testing
 */
function generateSampleMetrics(count: number = 50): PerfMetric[] {
  const categories = ['Security', 'R2', 'Isolation', 'Zstd', 'Demo'] as const;
  const types = ['Authentication', 'Storage', 'Sandbox', 'Compression', 'Analytics'] as const;
  const scopes = ['ENTERPRISE', 'DEVELOPMENT', 'LOCAL-SANDBOX', 'global'] as const;
  
  return Array(count).fill(null).map((_, i) => ({
    id: `metric-${String(i + 1).padStart(3, '0')}`,
    category: categories[i % categories.length],
    type: types[i % types.length],
    topic: `Test Topic ${i + 1}`,
    value: `${Math.floor(Math.random() * 200)}ms`,
    locations: `src/test/file-${i % 10}.ts:${(i % 100) + 1}`,
    impact: ['Low', 'Medium', 'High'][i % 3] as 'Low' | 'Medium' | 'High',
    properties: {
      scope: scopes[i % scopes.length],
      testId: `test-${i}`,
      timestamp: new Date().toISOString()
    }
  }));
}

/**
 * 🎯 Command Handlers
 */
async function handleDemo(): Promise<void> {
  showBanner();
  runMasterPerfDemo();
}

async function handleBenchmark(): Promise<void> {
  showBanner();
  console.info('⚡ Performance Benchmark');
  console.info('─'.repeat(40));
  
  MasterPerfInspector.benchmark();
  
  console.info('\n📈 Large Dataset Performance');
  console.info('─'.repeat(40));
  
  const sizes = [100, 1000, 5000, 10000];
  
  for (const size of sizes) {
    const metrics = generateSampleMetrics(size);
    
    const start = performance.now();
    const plainText = MasterPerfInspector.generatePlainText(metrics);
    const end = performance.now();
    
    console.info(`${size.toLocaleString().padStart(6)} metrics: ${(end - start).toFixed(2).padStart(8)}ms (${plainText.length.toLocaleString()} chars)`);
  }
}

async function handleColors(): Promise<void> {
  showBanner();
  MasterPerfInspector.validateColors();
  
  console.info('\n🎨 Color Format Conversion Examples');
  console.info('─'.repeat(40));
  
  const categories = ['Security', 'R2', 'Isolation', 'Zstd', 'Demo'];
  
  categories.forEach(category => {
    const hex = MasterPerfInspector.getColorHex(category);
    const number = MasterPerfInspector.getColorNumber(category);
    const ansi = MasterPerfInspector.generateTable([generateSampleMetrics(1).find(m => m.category === category)!]);
    
    console.info(`${category.padEnd(12)} Hex: ${hex.padEnd(8)} Number: ${String(number).padStart(10)}`);
  });
  
  console.info('\n🌈 Terminal Color Preview');
  console.info('─'.repeat(40));
  
  const testMetrics = generateSampleMetrics(5);
  console.info(MasterPerfInspector.generateTable(testMetrics));
}

async function handleStress(): Promise<void> {
  showBanner();
  runStressTest();
  
  console.info('\n🔥 Additional Stress Tests');
  console.info('─'.repeat(40));
  
  // Test memory usage
  if (global.gc) {
    global.gc();
    const memBefore = process.memoryUsage();
    
    const largeMetrics = generateSampleMetrics(50000);
    const result = MasterPerfInspector.generatePlainText(largeMetrics);
    
    const memAfter = process.memoryUsage();
    
    console.info(`Memory usage for 50,000 metrics:`);
    console.info(`  Before: ${(memBefore.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.info(`  After:  ${(memAfter.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.info(`  Growth: ${((memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024).toFixed(2)} MB`);
    console.info(`  Output: ${(result.length / 1024 / 1024).toFixed(2)} MB`);
  } else {
    console.info('Run with --expose-gc for memory usage test');
  }
}

async function handleCustom(args: string[]): Promise<void> {
  showBanner();
  
  if (args.length === 0) {
    console.info('❌ No custom command provided');
    return;
  }
  
  const subCommand = args[0];
  
  switch (subCommand) {
    case 'generate':
      const count = parseInt(args[1]) || 100;
      console.info(`📊 Generating ${count} sample metrics...`);
      
      const metrics = generateSampleMetrics(count);
      
      console.info('\n🎨 Colored Output:');
      console.info(MasterPerfInspector.generateTable(metrics));
      
      console.info('\n📄 Plain Text:');
      console.info(MasterPerfInspector.generatePlainText(metrics));
      
      console.info('\n📦 JSON (first 500 chars):');
      const json = MasterPerfInspector.generateJson(metrics);
      console.info(json.substring(0, 500) + '...');
      break;
      
    case 'export':
      const exportCount = parseInt(args[1]) || 1000;
      const exportMetrics = generateSampleMetrics(exportCount);
      
      console.info(`📤 Exporting ${exportCount} metrics...`);
      
      // Write different formats
      MasterPerfInspector.writeLogfile(exportMetrics, `export-${Date.now()}.log`);
      
      const jsonExport = MasterPerfInspector.generateJson(exportMetrics);
      await Bun.write(`export-${Date.now()}.json`, jsonExport);
      
      console.info('✅ Exported to log and JSON files');
      break;
      
    default:
      console.info(`❌ Unknown custom command: ${subCommand}`);
      console.info('Available custom commands:');
      console.info('  generate [count] - Generate sample metrics');
      console.info('  export [count]   - Export metrics to files');
  }
}

/**
 * 🚀 Main CLI Entry Point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command || command === 'help') {
    showHelp();
    return;
  }
  
  if (!(command in commands)) {
    if (command === 'custom') {
      await handleCustom(args.slice(1));
    } else {
      console.info(`❌ Unknown command: ${command}`);
      console.info('Run "help" for available commands');
    }
    return;
  }
  
  try {
    switch (command) {
      case 'demo':
        await handleDemo();
        break;
      case 'benchmark':
        await handleBenchmark();
        break;
      case 'colors':
        await handleColors();
        break;
      case 'stress':
        await handleStress();
        break;
      case 'help':
        showHelp();
        break;
    }
  } catch (error) {
    console.error(`❌ Error running command "${command}":`, error);
    process.exit(1);
  }
}

// Run CLI if this file is executed directly
if (import.meta.main) {
  main().catch(console.error);
}

export { main, handleDemo, handleBenchmark, handleColors, handleStress, handleCustom };
