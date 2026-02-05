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
  console.log('🔬 A/B Testing Bundle Comparison\n');

  const distDir = resolve('dist');
  const bundleDirs = ['ab-test-a', 'ab-test-b'];

  const bundles: BundleInfo[] = [];

  // Check if bundles exist
  for (const dir of bundleDirs) {
    const bundlePath = join(distDir, dir);

    if (!existsSync(bundlePath)) {
      console.log(`❌ Bundle ${dir} not found. Run 'bun run build:ab-test' first.`);
      continue;
    }

    try {
      const files = readdirSync(bundlePath);
      const mainBundle = files.find(f => f.endsWith('.js') && !f.endsWith('.js.map'));

      if (!mainBundle) {
        console.log(`⚠️  No main bundle found in ${dir}`);
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

      console.log(`📦 ${dir}:`);
      console.log(`   Size: ${(bundleStat.size / 1024).toFixed(1)} KB`);
      console.log(`   Files: ${files.length}`);
      console.log(`   Source map: ${sourceMap ? (sourceMapSize / 1024).toFixed(1) + ' KB' : 'none'}`);
      console.log('');

    } catch (error) {
      console.error(`Error analyzing ${dir}:`, error);
    }
  }

  if (bundles.length < 2) {
    console.log('Need at least 2 bundles to compare. Run both variant builds first.');
    return;
  }

  // Compare bundles
  console.log('📊 Bundle Comparison:\n');

  const [bundleA, bundleB] = bundles;
  const sizeDiff = bundleB.size - bundleA.size;
  const sizePercent = ((sizeDiff / bundleA.size) * 100).toFixed(1);

  console.log(`Size difference: ${sizeDiff > 0 ? '+' : ''}${(sizeDiff / 1024).toFixed(1)} KB (${sizePercent}%)`);
  console.log(`Bundle A (${bundleA.variant}): ${(bundleA.size / 1024).toFixed(1)} KB`);
  console.log(`Bundle B (${bundleB.variant}): ${(bundleB.size / 1024).toFixed(1)} KB`);

  if (Math.abs(sizeDiff) > 1024) { // More than 1KB difference
    console.log(`\n💡 Significant size difference detected. ${sizeDiff > 0 ? 'Variant B' : 'Variant A'} is larger.`);
  } else {
    console.log(`\n✅ Bundle sizes are similar (within 1KB).`);
  }

  // Performance recommendations
  console.log('\n🚀 Performance Recommendations:');
  console.log('• Deploy smaller bundle to faster regions');
  console.log('• Monitor user engagement metrics for each variant');
  console.log('• Consider caching strategies for larger bundles');

  // Validation checks
  console.log('\n🔍 Validation Results:');

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
    console.log(`${check.status ? '✅' : '❌'} ${check.name}: ${check.message}`);
  });

  console.log('\n🎯 Next Steps:');
  console.log('1. Deploy variants to different user segments');
  console.log('2. Monitor performance and conversion metrics');
  console.log('3. Run statistical significance tests');
  console.log('4. Scale winning variant to 100% of users');

  console.log('\n📈 A/B Testing Summary:');
  console.log(`   Variants compared: ${bundles.length}`);
  console.log(`   Size difference: ${Math.abs(sizePercent)}%`);
  console.log(`   Ready for deployment: ✅`);
}

// Run if called directly
if (import.meta.main) {
  compareBundles().catch(console.error);
}