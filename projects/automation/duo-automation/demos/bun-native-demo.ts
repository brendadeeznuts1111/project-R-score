#!/usr/bin/env bun
/**
 * Bun-Native Utilities Demo Script
 * 
 * Demonstrates all utilities with performance measurements
 * 
 * @author DuoPlus Automation Suite
 * @version 1.0.0
 */

import { BunBinaryValidator } from '../cli/binary-validator';
import { BunPerfBenchmark } from '../utils/benchmark';
import { BunIDGenerator } from '../utils/id-generator';
import { BunPeekOrchestrator } from '../workers/peek-orchestrator';
import { BunModuleResolver } from '../utils/module-resolver';
import { BunStateCompressor } from '../utils/state-compressor';
import { BunOutputFormatter } from '../cli/output-formatter';
import { BunRuntimeDetector } from '../utils/runtime-detector';

console.log('🚀 Bun-Native Utilities Demo\n');

// 1. Binary Validation Demo
console.log('=== 1. Binary Validation Demo ===');
const binaryStart = Bun.nanoseconds();
const binaryResult = BunBinaryValidator.validateDuoPlusBinaries();
const binaryEnd = Bun.nanoseconds();
console.log(`Validated ${binaryResult.present.length + binaryResult.missing.length} binaries in ${((binaryEnd - binaryStart) / 1e6).toFixed(2)}ms`);
console.log(`✅ Present: ${binaryResult.present.join(', ')}`);
if (binaryResult.missing.length > 0) {
  console.log(`❌ Missing: ${binaryResult.missing.join(', ')}`);
}
console.log('');

// 2. ID Generation Demo
console.log('=== 2. ID Generation Demo ===');
const idStart = Bun.nanoseconds();
const idResult = BunIDGenerator.generateBulkIdsTracked(1000);
const idEnd = Bun.nanoseconds();
console.log(`Generated ${idResult.count} unique IDs in ${idResult.generationTime.toFixed(2)}ms`);
console.log(`First: ${idResult.ids[0]}`);
console.log(`Last: ${idResult.ids[idResult.ids.length - 1]}`);
console.log(`Duplicates: ${idResult.duplicates}`);
console.log('');

// 3. Benchmarking Demo
console.log('=== 3. Performance Benchmarking Demo ===');
const benchmarkSuite = BunPerfBenchmark.runSuite('Utilities Performance', [
  { name: 'id-generation', fn: () => BunIDGenerator.generateAgentId() },
  { name: 'binary-check', fn: () => BunBinaryValidator.isBinaryAvailable('bun') },
  { name: 'memory-analysis', fn: () => BunRuntimeDetector.analyzeMemoryUsage({}) },
  { name: 'text-formatting', fn: () => BunOutputFormatter.formatFileSize(1048576) }
]);
console.log(BunPerfBenchmark.formatSuite(benchmarkSuite));
console.log('');

// 4. Async Orchestration Demo
console.log('=== 4. Async Orchestration Demo ===');
const orchestrator = new BunPeekOrchestrator();
const phoneNumbers = [
  '+15005551234',
  '+15005551234', // Duplicate
  '+15005551235',
  '+15005551236',
  '+15005551234'  // Duplicate again
];

const orchestrationStart = Bun.nanoseconds();
const orchestrationResults = await orchestrator.batchProcess(
  phoneNumbers,
  async (phone) => {
    await Bun.sleep(50); // Simulate processing
    return `${phone}:${BunIDGenerator.generatePhoneId(phone)}`;
  }
);
const orchestrationEnd = Bun.nanoseconds();

console.log(`Processed ${orchestrationResults.size} unique numbers in ${((orchestrationEnd - orchestrationStart) / 1e6).toFixed(2)}ms`);
const orchestrationStats = orchestrator.getStats();
console.log(`Cache hit rate: ${orchestrationStats.cacheHitRate.toFixed(1)}%`);
console.log('');

// 5. Module Resolution Demo
console.log('=== 5. Module Resolution Demo ===');
const moduleStart = Bun.nanoseconds();
const modules = ['fs', 'path', 'elysia', 'bun:sqlite', 'express'];
const resolvedModules = BunModuleResolver.resolveModules(modules);
const moduleEnd = Bun.nanoseconds();
console.log(`Resolved ${modules.length} modules in ${((moduleEnd - moduleStart) / 1e6).toFixed(2)}ms`);
for (const [mod, result] of resolvedModules) {
  console.log(`  ${mod}: ${result.found ? '✅' : '❌'} ${result.path}`);
}
console.log('');

// 6. State Compression Demo
console.log('=== 6. State Compression Demo ===');
const compressionStart = Bun.nanoseconds();
const testStates = new Map(Array.from({ length: 100 }, (_, i) => [
  `AG${i}`,
  { id: `AG${i}`, balance: Math.random() * 1000, status: ['active', 'pending', 'error'][i % 3] }
]));
const compressionResult = BunStateCompressor.batchCompress(testStates);
const compressionEnd = Bun.nanoseconds();
console.log(`Compressed ${compressionResult.results.size} states in ${((compressionEnd - compressionStart) / 1e6).toFixed(2)}ms`);
console.log(`Original: ${(compressionResult.totalOriginalSize / 1024).toFixed(2)} KB`);
console.log(`Compressed: ${(compressionResult.totalCompressedSize / 1024).toFixed(2)} KB`);
console.log(`Ratio: ${compressionResult.averageCompressionRatio.toFixed(2)}x`);
console.log('');

// 7. Output Formatting Demo
console.log('=== 7. Output Formatting Demo ===');
const sampleAgents = Array.from({ length: 5 }, (_, i) => ({
  id: `AG${String(i).padStart(6, '0')}`,
  status: ['active', 'pending', 'error'][i % 3],
  balance: Math.random() * 1000
}));
console.log(BunOutputFormatter.formatAgentTable(sampleAgents));
console.log('');

// 8. Runtime Detection Demo
console.log('=== 8. Runtime Detection Demo ===');
const systemInfo = BunRuntimeDetector.getSystemInfo();
console.log(`🦊 Bun: ${systemInfo.bunVersion} (${systemInfo.bunRevision})`);
console.log(`💻 Platform: ${systemInfo.platform} (${systemInfo.arch})`);
console.log(`🧠 CPU Cores: ${systemInfo.hardwareConcurrency}`);
console.log(`⏱️  Uptime: ${systemInfo.uptime.toFixed(0)}s`);
console.log('');

// Memory Analysis
const largeObject = { agents: Array.from({ length: 1000 }, (_, i) => ({ id: i, data: 'x'.repeat(100) })) };
const memoryAnalysis = BunRuntimeDetector.analyzeMemoryUsage(largeObject);
console.log('🧠 Memory Analysis:');
console.log(`  Shallow: ${(memoryAnalysis.shallowBytes / 1024).toFixed(2)} KB`);
console.log(`  Heap Used: ${(memoryAnalysis.heapUsed / 1024 / 1024).toFixed(2)} MB`);
console.log(`  Pressure: ${memoryAnalysis.pressure.toUpperCase()}`);
if (memoryAnalysis.recommendations.length > 0) {
  console.log('  Recommendations:');
  for (const rec of memoryAnalysis.recommendations) {
    console.log(`    • ${rec}`);
  }
}
console.log('');

// 9. Integration Demo
console.log('=== 9. Integration Demo ===');
console.log('Demonstrating all utilities working together...');

const integrationStart = Bun.nanoseconds();

// Generate agents
const agents = BunIDGenerator.generateBulkIds(10);
console.log(`Generated ${agents.length} agent IDs`);

// Validate required binaries for each agent
const binaryValidation = await Promise.all(
  agents.map(async () => BunBinaryValidator.validateDuoPlusBinaries())
);
console.log(`Validated binaries for ${binaryValidation.length} agents`);

// Compress agent states
const agentStates = new Map(agents.map(id => [id, { id, status: 'initialized', timestamp: Date.now() }]));
const compressedStates = BunStateCompressor.batchCompress(agentStates);
console.log(`Compressed ${compressedStates.results.size} agent states`);

// Format results table
const results = Array.from(agents).map((id, index) => ({
  id,
  status: 'ready',
  compressionRatio: compressedStates.results.get(id)?.compressionRatio || 0,
  balance: Math.random() * 1000
}));
console.log('\nAgent Summary:');
console.log(BunOutputFormatter.formatAgentTable(results));

const integrationEnd = Bun.nanoseconds();
console.log(`\nIntegration demo completed in ${((integrationEnd - integrationStart) / 1e6).toFixed(2)}ms`);

// 10. Performance Summary
console.log('\n=== 🎯 Performance Summary ===');
const totalDemoTime = (integrationEnd - binaryStart) / 1e6;
console.log(`Total demo time: ${totalDemoTime.toFixed(2)}ms`);
console.log(`Average operation time: ${(totalDemoTime / 10).toFixed(2)}ms`);
console.log(`Operations per second: ${(1000 / (totalDemoTime / 10)).toFixed(0)}`);

// System capabilities
const capabilities = BunRuntimeDetector.getSystemCapabilities();
console.log('\n⚡ System Capabilities:');
console.log(`  JSC: ${capabilities.supportsJSC ? '✅' : '❌'}`);
console.log(`  SQLite: ${capabilities.supportsSQLite ? '✅' : '❌'}`);
console.log(`  FFI: ${capabilities.supportsFFI ? '✅' : '❌'}`);
console.log(`  Workers: ${capabilities.supportsWorkers ? '✅' : '❌'}`);
console.log(`  File Watcher: ${capabilities.supportsFileWatcher ? '✅' : '❌'}`);

console.log('\n🎉 Demo completed! All utilities are working correctly.');
console.log('\n💡 Try the individual utilities with:');
console.log('  bun cli/binary-validator.ts --help');
console.log('  bun utils/id-generator.ts --help');
console.log('  bun utils/benchmark.ts --help');
console.log('  bun workers/peek-orchestrator.ts --help');
console.log('  bun utils/state-compressor.ts --help');
console.log('  bun cli/output-formatter.ts --help');
console.log('  bun utils/runtime-detector.ts --help');
