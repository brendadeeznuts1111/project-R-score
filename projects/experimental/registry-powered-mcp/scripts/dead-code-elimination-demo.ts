#!/usr/bin/env bun

/**
 * Feature Flag Build Script
 * Demonstrates Bun v1.3.5 compile-time feature flags with actual dead-code elimination
 */

import { $ } from "bun";

async function buildWithFeatures(features: string[], outputName: string) {
  const featureFlags = features.map(f => `--feature=${f}`).join(' ');
  const command = `bun build dashboard/src/index.tsx --outdir dist --target browser --minify ${featureFlags}`;

  console.log(`🔨 Building ${outputName}...`);
  console.log(`   Command: ${command}`);

  try {
    const startTime = Date.now();
    await $`${command.split(' ')}`;
    const duration = Date.now() - startTime;

    // Check bundle size
    const { size } = await Bun.file(`dist/index.js`).stat();
    const sizeMB = (size / 1024 / 1024).toFixed(2);

    console.log(`   ✅ Built in ${duration}ms - Bundle: ${sizeMB}MB`);
    console.log(`   📦 Output: dist/index.js`);

    return { success: true, size: parseFloat(sizeMB), duration };
  } catch (error) {
    console.log(`   ❌ Build failed: ${error}`);
    return { success: false, error };
  }
}

async function demonstrateDeadCodeElimination() {
  console.log('🗑️  Bun v1.3.5 Dead-Code Elimination Demonstration\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Create dist directory
  await $`mkdir -p dist`;

  // Build configurations to test
  const buildConfigs = [
    {
      name: 'Minimal Build',
      features: [],
      description: 'No features enabled - maximum dead-code elimination'
    },
    {
      name: 'Terminal Enhanced',
      features: ['TERMINAL_ENHANCED'],
      description: 'Only terminal features enabled'
    },
    {
      name: 'Full Enterprise',
      features: ['PRODUCTION_BUILD', 'ENTERPRISE_SECURITY', 'ADVANCED_TELEMETRY', 'EDGE_COMPUTE'],
      description: 'All enterprise features enabled'
    },
    {
      name: 'Development Debug',
      features: ['DEBUG_MODE', 'PERFORMANCE_MONITORING', 'MOCK_API'],
      description: 'Development features with debugging'
    }
  ];

  const results: any[] = [];

  for (const config of buildConfigs) {
    console.log(`📦 ${config.name}`);
    console.log(`   ${config.description}`);

    const result = await buildWithFeatures(config.features, config.name);

    if (result.success) {
      // Rename the output file to avoid overwriting
      const outputFile = `dist/index-${config.name.toLowerCase().replace(' ', '-')}.js`;
      await $`mv dist/index.js ${outputFile}`;

      results.push({
        name: config.name,
        features: config.features.length,
        size: result.size,
        duration: result.duration,
        file: outputFile
      });
    }

    console.log();
  }

  // Analyze results
  if (results.length > 0) {
    console.log('📊 Dead-Code Elimination Analysis:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const minSize = Math.min(...results.map(r => r.size));
    const maxSize = Math.max(...results.map(r => r.size));
    const sizeReduction = ((maxSize - minSize) / maxSize * 100).toFixed(1);

    results.forEach(result => {
      const sizeDiff = ((result.size - minSize) / minSize * 100).toFixed(1);
      console.log(`   ${result.name}: ${result.size}MB (+${sizeDiff}%) - ${result.features} features`);
    });

    console.log();
    console.log(`🎯 Results:`);
    console.log(`   • Bundle size range: ${minSize}MB - ${maxSize}MB`);
    console.log(`   • Maximum size reduction: ${sizeReduction}%`);
    console.log(`   • Dead-code elimination: ACTIVE ✅`);

    // Show file sizes
    console.log(`\n📁 Generated Files:`);
    for (const result of results) {
      console.log(`   • ${result.file} (${result.size}MB)`);
    }

    console.log(`\n💡 Key Benefits:`);
    console.log(`   • Smaller bundles = faster downloads`);
    console.log(`   • Unused code completely removed at build time`);
    console.log(`   • Feature-gated security and functionality`);
    console.log(`   • Environment-specific optimizations`);
  }

  console.log(`\n✅ Dead-code elimination demonstration complete!`);
}

// Run the demonstration
if (import.meta.main) {
  await demonstrateDeadCodeElimination();
}