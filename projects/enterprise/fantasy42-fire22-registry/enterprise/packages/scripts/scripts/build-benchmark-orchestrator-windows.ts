#!/usr/bin/env bun

/**
 * 🪟 Fantasy42 Package Benchmark Orchestrator - Windows Build
 *
 * Windows-specific build with comprehensive metadata for the benchmark orchestrator
 */

import { join } from 'path';

console.log('🪟 Building Fantasy42 Package Benchmark Orchestrator for Windows');
console.log('===============================================================');

const buildConfig = {
  entrypoints: ['./package-benchmark-orchestrator.ts'],
  outfile: './dist/fantasy42-benchmark-orchestrator-windows-x64.exe',
  target: 'bun-windows-x64' as const,
  minify: true,
  sourcemap: false,
  compile: {
    execArgv: [
      '--smol',
      '--no-macros',
      '--user-agent=Fantasy42BenchmarkOrchestrator/1.0.0',
      '--environment=production',
      '--security-level=enterprise',
      '--strict-validation',
      '--audit-trails',
      '--compliance-mode',
    ],
    windows: {
      title: 'Fantasy42 Package Benchmark Orchestrator',
      publisher: 'Fire22 Enterprise LLC',
      version: '1.0.0.0',
      description:
        'Enterprise-grade benchmarking system ensuring EVERY package meets security and performance standards BEFORE deployment',
      copyright: '© 2024-2025 Fire22 Enterprise LLC. All rights reserved.',
      company: 'Fire22 Enterprise LLC',
      productName: 'Fantasy42 Package Benchmark Orchestrator',
      productVersion: '1.0.0',
      fileVersion: '1.0.0.0',
      trademarks: 'Fantasy42™ and Fire22™ are trademarks of Fire22 Enterprise LLC',
      internalName: 'Fantasy42BenchmarkOrchestrator',
      originalFilename: 'fantasy42-benchmark-orchestrator-windows-x64.exe',
      comments:
        'NEVER COMPROMISE: Security + Performance = Enterprise Excellence. Every package benchmarked and validated for production readiness.',
    },
  },
};

try {
  await Bun.build(buildConfig);
  console.log('✅ Fantasy42 Package Benchmark Orchestrator built successfully for Windows');
  console.log('🏆 NEVER COMPROMISE: Security + Performance = Enterprise Excellence!');
  console.log('📊 Ready to benchmark and validate packages for production deployment');
} catch (error) {
  console.error('❌ Build failed:', error);
  process.exit(1);
}
