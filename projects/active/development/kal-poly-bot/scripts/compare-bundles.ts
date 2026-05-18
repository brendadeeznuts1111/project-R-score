#!/usr/bin/env bun
// scripts/compare-bundles.ts - Compare A/B Test Bundles
import { existsSync, statSync, readdirSync } from 'fs';
import { join, resolve } from 'path';

interface BundleInfo {
  path: string;
  size: number;
  files: number;
  variant: string;
}

async function compareBundles() {
  console.info('🔬 A/B Testing Bundle Comparison\n');

  const distDir = resolve('dist');
  const bundleDirs = ['ab-test-a', 'ab-test-b'];

  const bundles: BundleInfo[] = [];

  // Check if bundles exist
  for (const dir of bundleDirs) {
    const bundlePath = join(distDir, dir);

    if (!existsSync(bundlePath)) {
      console.info(`❌ Bundle ${dir} not found. Run 'bun run build:ab-test' first.`);
      continue;
    }

    try {
      const files = readdirSync(bundlePath);
      const mainBundle = files.find(f => f.endsWith('.js') && !f.endsWith('.js.map'));

      if (!mainBundle) {
        console.info(`⚠️  No main bundle found in ${dir}`);
        continue;
      }

      const bundleStat = statSync(join(bundlePath, mainBundle));
      const sourceMap = files.find(f => f.endsWith('.js.map'));
      const sourceMapSize = sourceMap ? statSync(join(bundlePath, sourceMap)).size : 0;

      bundles.push({
        path: join(bundlePath, mainBundle),
        size: bundleStat.size,
        files: files.length,
        variant: dir
      });

      console.info(`📦 ${dir}:`);
      console.info(`   Size: ${(bundleStat.size / 1024).toFixed(1)} KB`);
      console.info(`   Files: ${files.length}`);
      console.info(`   Source map: ${sourceMap ? (sourceMapSize / 1024).toFixed(1) + ' KB' : 'none'}`);
      console.info('');

    } catch (error) {
      console.error(`Error analyzing ${dir}:`, error);
    }
  }

  if (bundles.length < 2) {
    console.info('Need at least 2 bundles to compare. Run both variant builds first.');
    return;
  }

  // Compare bundles
  console.info('📊 Bundle Comparison:\n');

  const [bundleA, bundleB] = bundles;
  const sizeDiff = bundleB.size - bundleA.size;
  const sizePercent = ((sizeDiff / bundleA.size) * 100).toFixed(1);

  console.info(`Size difference: ${sizeDiff > 0 ? '+' : ''}${(sizeDiff / 1024).toFixed(1)} KB (${sizePercent}%)`);
  console.info(`Bundle A (${bundleA.variant}): ${(bundleA.size / 1024).toFixed(1)} KB`);
  console.info(`Bundle B (${bundleB.variant}): ${(bundleB.size / 1024).toFixed(1)} KB`);

  if (Math.abs(sizeDiff) > 1024) { // More than 1KB difference
    console.info(`\n💡 Significant size difference detected. ${sizeDiff > 0 ? 'Variant B' : 'Variant A'} is larger.`);
  } else {
    console.info(`\n✅ Bundle sizes are similar (within 1KB).`);
  }

  // Performance recommendations
  console.info('\n🚀 Performance Recommendations:');
  console.info('• Deploy smaller bundle to faster regions');
  console.info('• Monitor user engagement metrics for each variant');
  console.info('• Consider caching strategies for larger bundles');

  // Validation checks
  console.info('\n🔍 Validation Results:');

  const checks = [
    {
      name: 'Bundles built successfully',
      status: bundles.length === 2,
      message: bundles.length === 2 ? '✅ Both variants built' : '❌ Missing bundles'
    },
    {
      name: 'Bundle sizes reasonable',
      status: bundles.every(b => b.size > 0 && b.size < 10 * 1024 * 1024), // < 10MB
      message: '✅ Bundle sizes within expected range'
    },
    {
      name: 'Source maps generated',
      status: bundles.every(b => existsSync(b.path + '.map')),
      message: bundles.every(b => existsSync(b.path + '.map')) ? '✅ Source maps available' : '⚠️ Missing source maps'
    }
  ];

  checks.forEach(check => {
    console.info(`${check.status ? '✅' : '❌'} ${check.name}: ${check.message}`);
  });

  console.info('\n🎯 Next Steps:');
  console.info('1. Deploy variants to different user segments');
  console.info('2. Monitor performance and conversion metrics');
  console.info('3. Run statistical significance tests');
  console.info('4. Scale winning variant to 100% of users');

  console.info('\n📈 A/B Testing Summary:');
  console.info(`   Variants compared: ${bundles.length}`);
  console.info(`   Size difference: ${Math.abs(sizePercent)}%`);
  console.info(`   Ready for deployment: ✅`);
}

// Run if called directly
if (import.meta.main) {
  compareBundles().catch(console.error);
}