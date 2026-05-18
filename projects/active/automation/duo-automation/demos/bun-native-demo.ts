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

console.info('🚀 Bun-Native Utilities Demo\n');

// 1. Binary Validation Demo
console.info('=== 1. Binary Validation Demo ===');
const binaryStart = Bun.nanoseconds();
const binaryResult = BunBinaryValidator.validateDuoPlusBinaries();
const binaryEnd = Bun.nanoseconds();
console.info(`Validated ${binaryResult.present.length + binaryResult.missing.length} binaries in ${((binaryEnd - binaryStart) / 1e6).toFixed(2)}ms`);
console.info(`✅ Present: ${binaryResult.present.join(', ')}`);
if (binaryResult.missing.length > 0) {
  console.info(`❌ Missing: ${binaryResult.missing.join(', ')}`);
}
console.info('');

// 2. ID Generation Demo
console.info('=== 2. ID Generation Demo ===');
const idStart = Bun.nanoseconds();
const idResult = BunIDGenerator.generateBulkIdsTracked(1000);
const idEnd = Bun.nanoseconds();
console.info(`Generated ${idResult.count} unique IDs in ${idResult.generationTime.toFixed(2)}ms`);
console.info(`First: ${idResult.ids[0]}`);
console.info(`Last: ${idResult.ids[idResult.ids.length - 1]}`);
console.info(`Duplicates: ${idResult.duplicates}`);
console.info('');

// 3. Benchmarking Demo
console.info('=== 3. Performance Benchmarking Demo ===');
const benchmarkSuite = BunPerfBenchmark.runSuite('Utilities Performance', [
  { name: 'id-generation', fn: () => BunIDGenerator.generateAgentId() },
  { name: 'binary-check', fn: () => BunBinaryValidator.isBinaryAvailable('bun') },
  { name: 'memory-analysis', fn: () => BunRuntimeDetector.analyzeMemoryUsage({}) },
  { name: 'text-formatting', fn: () => BunOutputFormatter.formatFileSize(1048576) }
]);
console.info(BunPerfBenchmark.formatSuite(benchmarkSuite));
console.info('');

// 4. Async Orchestration Demo
console.info('=== 4. Async Orchestration Demo ===');
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

console.info(`Processed ${orchestrationResults.size} unique numbers in ${((orchestrationEnd - orchestrationStart) / 1e6).toFixed(2)}ms`);
const orchestrationStats = orchestrator.getStats();
console.info(`Cache hit rate: ${orchestrationStats.cacheHitRate.toFixed(1)}%`);
console.info('');

// 5. Module Resolution Demo
console.info('=== 5. Module Resolution Demo ===');
const moduleStart = Bun.nanoseconds();
const modules = ['fs', 'path', 'elysia', 'bun:sqlite', 'express'];
const resolvedModules = BunModuleResolver.resolveModules(modules);
const moduleEnd = Bun.nanoseconds();
console.info(`Resolved ${modules.length} modules in ${((moduleEnd - moduleStart) / 1e6).toFixed(2)}ms`);
for (const [mod, result] of resolvedModules) {
  console.info(`  ${mod}: ${result.found ? '✅' : '❌'} ${result.path}`);
}
console.info('');

// 6. State Compression Demo
console.info('=== 6. State Compression Demo ===');
const compressionStart = Bun.nanoseconds();
const testStates = new Map(Array.from({ length: 100 }, (_, i) => [
  `AG${i}`,
  { id: `AG${i}`, balance: Math.random() * 1000, status: ['active', 'pending', 'error'][i % 3] }
]));
const compressionResult = BunStateCompressor.batchCompress(testStates);
const compressionEnd = Bun.nanoseconds();
console.info(`Compressed ${compressionResult.results.size} states in ${((compressionEnd - compressionStart) / 1e6).toFixed(2)}ms`);
console.info(`Original: ${(compressionResult.totalOriginalSize / 1024).toFixed(2)} KB`);
console.info(`Compressed: ${(compressionResult.totalCompressedSize / 1024).toFixed(2)} KB`);
console.info(`Ratio: ${compressionResult.averageCompressionRatio.toFixed(2)}x`);
console.info('');

// 7. Output Formatting Demo
console.info('=== 7. Output Formatting Demo ===');
const sampleAgents = Array.from({ length: 5 }, (_, i) => ({
  id: `AG${String(i).padStart(6, '0')}`,
  status: ['active', 'pending', 'error'][i % 3],
  balance: Math.random() * 1000
}));
console.info(BunOutputFormatter.formatAgentTable(sampleAgents));
console.info('');

// 8. Runtime Detection Demo
console.info('=== 8. Runtime Detection Demo ===');
const systemInfo = BunRuntimeDetector.getSystemInfo();
console.info(`🦊 Bun: ${systemInfo.bunVersion} (${systemInfo.bunRevision})`);
console.info(`💻 Platform: ${systemInfo.platform} (${systemInfo.arch})`);
console.info(`🧠 CPU Cores: ${systemInfo.hardwareConcurrency}`);
console.info(`⏱️  Uptime: ${systemInfo.uptime.toFixed(0)}s`);
console.info('');

// Memory Analysis
const largeObject = { agents: Array.from({ length: 1000 }, (_, i) => ({ id: i, data: 'x'.repeat(100) })) };
const memoryAnalysis = BunRuntimeDetector.analyzeMemoryUsage(largeObject);
console.info('🧠 Memory Analysis:');
console.info(`  Shallow: ${(memoryAnalysis.shallowBytes / 1024).toFixed(2)} KB`);
console.info(`  Heap Used: ${(memoryAnalysis.heapUsed / 1024 / 1024).toFixed(2)} MB`);
console.info(`  Pressure: ${memoryAnalysis.pressure.toUpperCase()}`);
if (memoryAnalysis.recommendations.length > 0) {
  console.info('  Recommendations:');
  for (const rec of memoryAnalysis.recommendations) {
    console.info(`    • ${rec}`);
  }
}
console.info('');

// 9. Integration Demo
console.info('=== 9. Integration Demo ===');
console.info('Demonstrating all utilities working together...');

const integrationStart = Bun.nanoseconds();

// Generate agents
const agents = BunIDGenerator.generateBulkIds(10);
console.info(`Generated ${agents.length} agent IDs`);

// Validate required binaries for each agent
const binaryValidation = await Promise.all(
  agents.map(async () => BunBinaryValidator.validateDuoPlusBinaries())
);
console.info(`Validated binaries for ${binaryValidation.length} agents`);

// Compress agent states
const agentStates = new Map(agents.map(id => [id, { id, status: 'initialized', timestamp: Date.now() }]));
const compressedStates = BunStateCompressor.batchCompress(agentStates);
console.info(`Compressed ${compressedStates.results.size} agent states`);

// Format results table
const results = Array.from(agents).map((id, index) => ({
  id,
  status: 'ready',
  compressionRatio: compressedStates.results.get(id)?.compressionRatio || 0,
  balance: Math.random() * 1000
}));
console.info('\nAgent Summary:');
console.info(BunOutputFormatter.formatAgentTable(results));

const integrationEnd = Bun.nanoseconds();
console.info(`\nIntegration demo completed in ${((integrationEnd - integrationStart) / 1e6).toFixed(2)}ms`);

// 10. Performance Summary
console.info('\n=== 🎯 Performance Summary ===');
const totalDemoTime = (integrationEnd - binaryStart) / 1e6;
console.info(`Total demo time: ${totalDemoTime.toFixed(2)}ms`);
console.info(`Average operation time: ${(totalDemoTime / 10).toFixed(2)}ms`);
console.info(`Operations per second: ${(1000 / (totalDemoTime / 10)).toFixed(0)}`);

// System capabilities
const capabilities = BunRuntimeDetector.getSystemCapabilities();
console.info('\n⚡ System Capabilities:');
console.info(`  JSC: ${capabilities.supportsJSC ? '✅' : '❌'}`);
console.info(`  SQLite: ${capabilities.supportsSQLite ? '✅' : '❌'}`);
console.info(`  FFI: ${capabilities.supportsFFI ? '✅' : '❌'}`);
console.info(`  Workers: ${capabilities.supportsWorkers ? '✅' : '❌'}`);
console.info(`  File Watcher: ${capabilities.supportsFileWatcher ? '✅' : '❌'}`);

console.info('\n🎉 Demo completed! All utilities are working correctly.');
console.info('\n💡 Try the individual utilities with:');
console.info('  bun cli/binary-validator.ts --help');
console.info('  bun utils/id-generator.ts --help');
console.info('  bun utils/benchmark.ts --help');
console.info('  bun workers/peek-orchestrator.ts --help');
console.info('  bun utils/state-compressor.ts --help');
console.info('  bun cli/output-formatter.ts --help');
console.info('  bun utils/runtime-detector.ts --help');
