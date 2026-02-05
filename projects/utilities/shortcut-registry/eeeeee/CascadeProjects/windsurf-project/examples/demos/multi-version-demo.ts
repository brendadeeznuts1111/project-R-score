#!/usr/bin/env bun

// Demo of multiple versions using aliases
async function runMultiVersionDemo() {
  console.log('🔄 Multiple Versions Demo');
  console.log('==========================');

  // Import different versions of lodash using aliases with type assertions
  const lodashLatest = await import('lodash');
  const lodashUtils = await import('utils-lib') as any;
  const lodashV3 = await import('lodash-v3') as any;

  console.log('✅ Multiple lodash versions loaded!');

  console.log('\n📊 Version Comparison:');
  console.log('======================');

  // Test different versions
  const data = [1, 2, 3, 4, 5];

  console.log('Latest lodash (4.17.23):');
  console.log('  Version:', (lodashLatest as any).default.VERSION);
  console.log('  Map result:', (lodashLatest as any).default.map(data, (x: number) => x * 2));

  console.log('\nUtils-lib (lodash alias):');
  console.log('  Version:', lodashUtils.default.VERSION);
  console.log('  Map result:', lodashUtils.default.map(data, (x: number) => x * 3));

  console.log('\nLodash v3 (3.10.1):');
  console.log('  Version:', lodashV3.default.VERSION);
  console.log('  Map result:', lodashV3.default.map(data, (x: number) => x * 4));

  console.log('\n🎯 Use Cases:');
  console.log('============');
  console.log('✅ Legacy migration - Keep old version while migrating');
  console.log('✅ Plugin compatibility - Different plugins need different versions');
  console.log('✅ Testing - Compare behavior across versions');
  console.log('✅ Gradual upgrades - Update parts of codebase independently');

  console.log('\n🏷️ Aliases in package.json:');
  console.log('============================');
  console.log('"lodash": "4.17.23"                    # Original');
  console.log('"utils-lib": "npm:lodash"               # Alias to latest');
  console.log('"lodash-v3": "npm:lodash@3.10.1"        # Specific version');
}

runMultiVersionDemo().catch(console.error);
